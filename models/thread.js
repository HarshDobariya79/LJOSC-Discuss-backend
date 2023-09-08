const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  createDate: { type: Date},
  title: { type: String, required: true},
  content: { type: String, required: true },
  views: { type: Object, default: {} },
  viewCount: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
});

module.exports = mongoose.model("Thread", threadSchema);
