const express = require("express");
const router = express.Router();
const Thread = require("../models/thread");
const User = require("../models/user");
const { formatDate } = require("../utils");

router.post("/v1/thread", async (req, res) => {
  const currentDate = new Date();
  try {
    const { title, data } = req.body;
    const user = req.user;

    const thread = new Thread({
      authorId: user._id,
      title: title,
      content: data,
      createDate: currentDate,
    });
    const result = await thread.save();
    result.createDate = await formatDate(result.createDate);

    res.status(201).send(result);
  } catch (err) {
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.get("/v1/thread/:id", async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();

    const thread = await Thread.findOne(
      { _id: req.params.id },
      { _id: 1, title: 1, authorId: 1, createDate: 1, views: 1 }
    );

    const todayISO = today.toISOString().split("T")[0];
    const _ = await Thread.findOneAndUpdate(
      { _id: req.params.id },
      {
        $push: {
          [`views.${todayISO}`]: user._id.toString(),
        },
      },
      {
        upsert: true,
      }
    );

    let reach = new Set();
    let viewCount = 0;
    for (const [key, value] of Object.entries(thread.views)) {
      viewCount += value.length;
      const idSet = new Set(value);
      reach = new Set([...reach, ...idSet]);
    }
    thread.reach = reach.size;
    thread.viewCount = viewCount;
    thread.save();

    const result = { ...thread.toObject(), views: reach.size };
    result.createDate = await formatDate(thread.createDate);
    const author = await User.findOne({ _id: result.authorId });
    result.author = author.username;
    delete result?.authorId;

    if (!user.visitedThreads.includes(req.params.id)) {
      user.visitedThreads.push(req.params.id);
      user.save();
    }

    res.status(201).send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.get("/v1/thread", async (req, res) => {
  try {
    const user = req.user;

    const threads = await Thread.find(
      {},
      {
        _id: 1,
        title: 1,
        authorId: 1,
        createDate: 1,
        views: 1,
        reach: 1,
        viewCount: 1,
      }
    );
    const result = await Promise.all(
      threads.map(async (thread) => {
        const obj = {
          ...thread.toObject(),
          createDate: formatDate(thread.createDate),
          views: thread.views.length,
        };
        const author = await User.findOne({ _id: obj.authorId });
        obj.author = author.username;
        delete obj.authorId;
        return obj;
      })
    );
    res.status(200).send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

module.exports = router;
