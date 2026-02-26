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

    // 🔥 ADD THESE BELOW

    foodOptions: [
      {
        name: { type: String, required: true },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        votes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],

    gameOptions: [
      {
        name: { type: String, required: true },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        votes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
  },
  { timestamps: true }
);



module.exports = mongoose.model("Party", PartySchema);