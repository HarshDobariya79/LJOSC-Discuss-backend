const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema({
  title: {type: String, required: true},
  content: {type: String, required: true},
  createDate: { type: Date, default: Date.now, index: true}, // this index will help us optimize sort by createDate results
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  views: {
    type: Map,
    of: Number,
    default: {},
  },
  reach: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [
    {
      content: String,
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
    },
  ],
}, { autoIndex: false });

module.exports = mongoose.model("Thread", threadSchema);
