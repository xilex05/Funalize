const express = require("express");
const Party = require("../models/Party");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const partyCode = generateCode();

    const newParty = new Party({
      partyCode,
      host: req.user,
      members: [req.user],
    });

    await newParty.save();

    res.status(201).json(newParty);
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

    if (!party.members.includes(req.user)) {
      party.members.push(req.user);
      await party.save();
    }

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:partyCode", async (req, res) => {
  try {
    const party = await Party.findOne({ partyCode: req.params.partyCode });

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

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (party.host.toString() !== req.user) {
      return res.status(403).json({ msg: "Only host can change category" });
    }

    party.currentCategory = category;
    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit("categoryUpdated", {
      partyCode: req.params.partyCode,
      currentCategory: party.currentCategory,
      selectionMode: party.selectionMode,
      finalizedResult: party.finalizedResult,
      foodOptions: party.foodOptions,
      gameOptions: party.gameOptions
    });

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

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (party.host.toString() !== req.user) {
      return res.status(403).json({ msg: "Only host can select mode" });
    }

    party.selectionMode = selectionMode;
    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit("modeUpdated", {
      partyCode: req.params.partyCode,
      selectionMode: party.selectionMode
    });

    io.to(req.params.partyCode).emit("optionsUpdated", {
      partyCode: req.params.partyCode,
      currentCategory: party.currentCategory,
      selectionMode: party.selectionMode,
      finalizedResult: party.finalizedResult,
      foodOptions: party.foodOptions,
      gameOptions: party.gameOptions
    });

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

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    const isHost = party.host.toString() === req.user;

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
      option => option.addedBy.toString() === userId
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

    io.to(req.params.partyCode).emit("optionsUpdated", {
      partyCode: req.params.partyCode,
      currentCategory: party.currentCategory,
      selectionMode: party.selectionMode,
      finalizedResult: party.finalizedResult,
      foodOptions: party.foodOptions,
      gameOptions: party.gameOptions
    });

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

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    const userId = req.user;
    const isHost = party.host.toString() === userId;

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

      return option.addedBy.toString() === userId;
    });

    if (optionIndex === -1) {
      return res.status(404).json({ msg: "Option not found or not yours" });
    }

    optionArray.splice(optionIndex, 1);
    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit("optionsUpdated", {
      partyCode: req.params.partyCode,
      currentCategory: party.currentCategory,
      selectionMode: party.selectionMode,
      finalizedResult: party.finalizedResult,
      foodOptions: party.foodOptions,
      gameOptions: party.gameOptions
    });

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:partyCode/vote", authMiddleware, async (req, res) => {
  try {
    const { optionName } = req.body;

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (party.selectionMode !== "voting") {
      return res.status(400).json({
        msg: "Voting is not enabled for this party"
      });
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
      v => v.toString() === userId
    );

    if (existingVoteIndex !== -1) {
      selectedOption.votes.splice(existingVoteIndex, 1);
    } else {
      let totalVotesByUser = 0;

      optionArray.forEach(option => {
        if (option.votes.some(v => v.toString() === userId)) {
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

    io.to(req.params.partyCode).emit("optionsUpdated", {
      partyCode: req.params.partyCode,
      currentCategory: party.currentCategory,
      selectionMode: party.selectionMode,
      finalizedResult: party.finalizedResult,
      foodOptions: party.foodOptions,
      gameOptions: party.gameOptions
    });

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:partyCode/finalize-voting", authMiddleware, async (req, res) => {
  try {
    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    if (party.host.toString() !== req.user) {
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

    let winner = optionArray[0];

    optionArray.forEach(option => {
      if (option.votes.length > winner.votes.length) {
        winner = option;
      }
    });

    party.finalizedResult = {
      category: party.currentCategory,
      optionName: winner.name,
      votes: winner.votes.length
    };

    await party.save();

    const io = req.app.get("io");

    io.to(req.params.partyCode).emit("votingFinalized", {
      partyCode: req.params.partyCode,
      finalizedResult: party.finalizedResult
    });

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
