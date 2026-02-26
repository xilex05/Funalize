const express = require("express");
const Party = require("../models/Party");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* Generate random 6-character code */
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* CREATE PARTY */
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

/* JOIN PARTY */
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

// GET PARTY DETAILS
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

// UPDATE CATEGORY (HOST ONLY)
router.put("/:partyCode/category", authMiddleware, async (req, res) => {
  try {
    const { category } = req.body;

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    // Only host can update
    if (party.host.toString() !== req.user) {
      return res.status(403).json({ msg: "Only host can change category" });
    }

    party.currentCategory = category;
    await party.save();

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD OPTION (MAX 3 PER USER)
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

    const userId = req.user;

    // Decide which array to use
    const optionArray =
      party.currentCategory === "food"
        ? party.foodOptions
        : party.gameOptions;

    // Count how many options this user already added
    const userOptions = optionArray.filter(
      option => option.addedBy.toString() === userId
    );

    if (userOptions.length >= 3) {
      return res.status(400).json({
        msg: "You can only add 3 options"
      });
    }

    // Push new option
    optionArray.push({
      name: name.trim(),
      addedBy: userId,
      votes: []
    });

    await party.save();

    res.json(party);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VOTE OPTION (MAX 2 PER USER)
router.put("/:partyCode/vote", authMiddleware, async (req, res) => {
  try {
    const { optionName } = req.body;

    const party = await Party.findOne({
      partyCode: req.params.partyCode
    });

    if (!party) {
      return res.status(404).json({ msg: "Party not found" });
    }

    const userId = req.user;

    // Determine correct options array
    const optionArray =
      party.currentCategory === "food"
        ? party.foodOptions
        : party.gameOptions;

    // Count total votes user has already made
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

    // Find selected option
    const selectedOption = optionArray.find(
      option => option.name === optionName
    );

    if (!selectedOption) {
      return res.status(404).json({ msg: "Option not found" });
    }

    // Prevent duplicate vote
    if (selectedOption.votes.includes(userId)) {
      return res.status(400).json({
        msg: "You already voted for this option"
      });
    }

    // Add vote
    selectedOption.votes.push(userId);

    await party.save();

    res.json(party);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;