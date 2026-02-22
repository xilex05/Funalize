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

    if (!party) {s
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

module.exports = router;