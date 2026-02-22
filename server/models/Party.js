const mongoose = require("mongoose");

const PartySchema = new mongoose.Schema(
  {
    partyCode: {
      type: String,
      required: true,
      unique: true,
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    currentCategory: {
      type: String,
      enum: ["food", "games", "music"],
      default: "food",
    },

    status: {
      type: String,
      enum: ["waiting", "active", "finished"],
      default: "waiting",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Party", PartySchema);