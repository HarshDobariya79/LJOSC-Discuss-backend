const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index:true },
  email: { type: String, required: true, unique: true, index:true },
  password: { type: String, required: true },
  createdTimestamp: { type: Number, default: Math.floor(Date.now() / 1000) },
  lastVisitDate: { type: String, default: null },
  visitedDays: { type: Number, default: 0},
  visitedThreads: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thread' }], default: []},
  likesReceived: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", userSchema);
