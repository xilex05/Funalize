const mongoose = require("mongoose");

// This schema stores the account data required for login
// and identification of a registered user.
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

// This exports the User model for use inside route handlers.
module.exports = mongoose.model("User", UserSchema);
