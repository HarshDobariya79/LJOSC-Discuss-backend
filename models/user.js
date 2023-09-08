const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdTimestamp: { type: Number, default: Math.floor(Date.now() / 1000) },
  lastVisitDate: { type: String, default: null },
  visitedDays: { type: Number, default: 0},
  threadsViewed: { type: [], default: []},
});

module.exports = mongoose.model("User", userSchema);
