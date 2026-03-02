const express = require("express");
const Party = require("../models/Party");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const PARTY_POPULATE = [
  { path: "host", select: "username email" },
  { path: "members", select: "username email" }
];

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getPartyByCode(partyCode) {
  return Party.findOne({ partyCode }).populate(PARTY_POPULATE);
}

function getUserId(value) {
  return String(value?._id || value);
}

function getMemberName(member) {
  if (!member) {
    return "Member";
  }

  if (typeof member === "object") {
    return member.username || member.email || "Member";
  }

  return "Member";
}

function buildPartyPayload(party, partyCode) {
  return {
    partyCode,
    currentCategory: party.currentCategory,
    selectionMode: party.selectionMode,
    finalizedResult: party.finalizedResult,
    foodOptions: party.foodOptions,
    gameOptions: party.gameOptions,
    chatMessages: party.chatMessages,
    members: party.members,
    host: party.host
  };
}

async function emitPartySnapshot(io, partyCode) {
  const populatedParty = await getPartyByCode(partyCode);

  if (!populatedParty) {
    return;
  }

  io.to(partyCode).emit("partySnapshot", populatedParty);
  io.to(partyCode).emit("membersUpdated", {
    partyCode,
    members: populatedParty.members,
    host: populatedParty.host
  });
}

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const partyCode = generateCode();

    const newParty = new Party({
      partyCode,
      host: req.user,
      members: [req.user]
    });

    await newParty.save();

    const populatedParty = await getPartyByCode(partyCode);
    res.status(201).json(populatedParty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/join", authMiddleware, async (req, res) => {
  try {
    const { partyCode } = req.body;

    const party = await Party.findOne({ partyCode });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (!party.members.some(member => getUserId(member) === req.user)) {
      party.members.push(req.user);
      await party.save();
    }

    const populatedParty = await getPartyByCode(partyCode);

    const io = req.app.get("io");
    await emitPartySnapshot(io, partyCode);

    res.json(populatedParty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:partyCode", async (req, res) => {
  try {
    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:partyCode/category", authMiddleware, async (req, res) => {
  try {
    const { category } = req.body;

    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (getUserId(party.host) !== req.user) {
      return res.status(403).json({ msg: "Only host can change category" });
    }

    party.currentCategory = category;
    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit(
      "categoryUpdated",
      buildPartyPayload(party, req.params.partyCode)
    );

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:partyCode/selection-mode", authMiddleware, async (req, res) => {
  try {
    const { selectionMode } = req.body;

    const isValidMode =
      selectionMode === null ||
      selectionMode === "voting" ||
      selectionMode === "random";

    if (!isValidMode) {
      return res.status(400).json({ msg: "Invalid selection mode" });
    }

    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (getUserId(party.host) !== req.user) {
      return res.status(403).json({ msg: "Only host can select mode" });
    }

    party.selectionMode = selectionMode;

    if (selectionMode !== "random") {
      party.finalizedResult = {
        category: null,
        optionNames: [],
        optionName: null,
        votes: 0
      };
    }

    let randomPayload = null;

    if (selectionMode === "random") {
      const randomPool = [
        ...party.foodOptions.map(option => ({
          name: option.name,
          category: "food",
          votes: option.votes.length
        })),
        ...party.gameOptions.map(option => ({
          name: option.name,
          category: "games",
          votes: option.votes.length
        }))
      ];

      if (!randomPool.length) {
        return res.status(400).json({ msg: "No options available for random mode" });
      }

      const winner = randomPool[Math.floor(Math.random() * randomPool.length)];

      party.finalizedResult = {
        category: "all",
        optionNames: [winner.name],
        optionName: winner.name,
        votes: winner.votes
      };

      randomPayload = {
        partyCode: req.params.partyCode,
        randomPool,
        winner,
        finalizedResult: party.finalizedResult
      };
    }

    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit("modeUpdated", {
      partyCode: req.params.partyCode,
      selectionMode: party.selectionMode
    });

    if (randomPayload) {
      io.to(req.params.partyCode).emit("randomFinalized", randomPayload);
    }

    io.to(req.params.partyCode).emit(
      "optionsUpdated",
      buildPartyPayload(party, req.params.partyCode)
    );

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:partyCode/add-option", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ msg: "Option name required" });
    }

    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    const isHost = getUserId(party.host) === req.user;

    if (party.selectionMode && !isHost) {
      return res.status(400).json({
        msg: "Options are locked after mode selection"
      });
    }

    const userId = req.user;

    const optionArray =
      party.currentCategory === "food"
        ? party.foodOptions
        : party.gameOptions;

    const userOptions = optionArray.filter(
      option => getUserId(option.addedBy) === userId
    );

    if (userOptions.length >= 3) {
      return res.status(400).json({
        msg: "You can only add 3 options"
      });
    }

    optionArray.push({
      name: name.trim(),
      addedBy: userId,
      votes: []
    });

    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit(
      "optionsUpdated",
      buildPartyPayload(party, req.params.partyCode)
    );

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:partyCode/delete-option", authMiddleware, async (req, res) => {
  try {
    const { optionName } = req.body;

    if (!optionName || !optionName.trim()) {
      return res.status(400).json({ msg: "Option name required" });
    }

    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    const userId = req.user;
    const isHost = getUserId(party.host) === userId;

    if (party.selectionMode && !isHost) {
      return res.status(400).json({
        msg: "Options are locked after mode selection"
      });
    }

    const optionArray =
      party.currentCategory === "food"
        ? party.foodOptions
        : party.gameOptions;

    const optionIndex = optionArray.findIndex(option => {
      if (option.name !== optionName.trim()) {
        return false;
      }

      if (isHost) {
        return true;
      }

      return getUserId(option.addedBy) === userId;
    });

    if (optionIndex === -1) {
      return res.status(404).json({ msg: "Option not found or not yours" });
    }

    optionArray.splice(optionIndex, 1);
    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit(
      "optionsUpdated",
      buildPartyPayload(party, req.params.partyCode)
    );

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:partyCode/vote", authMiddleware, async (req, res) => {
  try {
    const { optionName } = req.body;

    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (party.selectionMode !== "voting") {
      return res.status(400).json({
        msg: "Voting is not enabled for this party"
      });
    }

    if (party.currentCategory === "music") {
      return res.status(400).json({ msg: "No votable options in music category" });
    }

    const userId = req.user;

    const optionArray =
      party.currentCategory === "food"
        ? party.foodOptions
        : party.gameOptions;

    const selectedOption = optionArray.find(
      option => option.name === optionName
    );

    if (!selectedOption) {
      return res.status(404).json({ msg: "Option not found" });
    }

    const existingVoteIndex = selectedOption.votes.findIndex(
      v => getUserId(v) === userId
    );

    if (existingVoteIndex !== -1) {
      selectedOption.votes.splice(existingVoteIndex, 1);
    } else {
      let totalVotesByUser = 0;

      optionArray.forEach(option => {
        if (option.votes.some(v => getUserId(v) === userId)) {
          totalVotesByUser++;
        }
      });

      if (totalVotesByUser >= 2) {
        return res.status(400).json({
          msg: "You can only vote for 2 options"
        });
      }

      selectedOption.votes.push(userId);
    }

    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit(
      "optionsUpdated",
      buildPartyPayload(party, req.params.partyCode)
    );

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:partyCode/finalize-voting", authMiddleware, async (req, res) => {
  try {
    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (getUserId(party.host) !== req.user) {
      return res.status(403).json({ msg: "Only host can finalize voting" });
    }

    if (party.selectionMode !== "voting") {
      return res.status(400).json({ msg: "Party is not in voting mode" });
    }

    if (party.currentCategory === "music") {
      return res.status(400).json({ msg: "No votable options in music category" });
    }

    const optionArray =
      party.currentCategory === "food"
        ? party.foodOptions
        : party.gameOptions;

    if (!optionArray.length) {
      return res.status(400).json({ msg: "No options to finalize" });
    }

    const maxVotes = optionArray.reduce((max, option) => {
      return Math.max(max, option.votes.length);
    }, 0);

    const winnerNames = optionArray
      .filter(option => option.votes.length === maxVotes)
      .map(option => option.name);

    party.finalizedResult = {
      category: party.currentCategory,
      optionNames: winnerNames,
      optionName: winnerNames[0] || null,
      votes: maxVotes
    };

    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit("votingFinalized", {
      partyCode: req.params.partyCode,
      finalizedResult: party.finalizedResult
    });

    io.to(req.params.partyCode).emit(
      "optionsUpdated",
      buildPartyPayload(party, req.params.partyCode)
    );

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:partyCode/chat", authMiddleware, async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ msg: "Message cannot be empty" });
    }

    const party = await getPartyByCode(req.params.partyCode);

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    const sender = party.members.find((member) => getUserId(member) === req.user);

    if (!sender) {
      return res.status(403).json({ msg: "Join the party before chatting" });
    }

    party.chatMessages.push({
      userId: req.user,
      user: getMemberName(sender),
      text: message.slice(0, 300),
      createdAt: new Date()
    });

    if (party.chatMessages.length > 200) {
      party.chatMessages = party.chatMessages.slice(-200);
    }

    await party.save();

    const io = req.app.get("io");
    io.to(req.params.partyCode).emit("chatUpdated", {
      partyCode: req.params.partyCode,
      chatMessages: party.chatMessages
    });

    res.json({ chatMessages: party.chatMessages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
