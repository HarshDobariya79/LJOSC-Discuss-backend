const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Thread = require("../models/thread");
const User = require("../models/user");
const { formatDate, formatDateTime } = require("../utils");

// create a new thread
router.post("/v1/thread", async (req, res) => {
  try {
    const { title, content } = req.body;
    const user = req.user;

    const thread = new Thread({
      title: title,
      content: content,
      author: user._id,
    });
    const result = await thread.save();
    const response = {
      ...result.toObject(),
      createDate: formatDateTime(result.createDate),
    };

    res.status(201).send(response);
  } catch (err) {
    res.status(500).send({ message: "Something went wrong" });
  }
});

// get a thread
router.get("/v1/thread/:id", async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorData",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "replies.author",
          foreignField: "_id",
          as: "authorDetails",
        },
      },
      {
        $unwind: "$authorData",
      },
      {
        $unwind: "$authorDetails",
      },
      {
        $addFields: {
          views: { $objectToArray: "$views" },
        },
      },
      {
        $project: {
          title: 1,
          content: 1,
          createDate: 1,
          views: {
            $sum: "$views.v",
          },
          reach: {
            $size: "$reach",
          },
          likes: {
            $size: "$likes",
          },
          author: {
            _id: "$authorData._id",
            username: "$authorData.username",
          },
          replies: {
            $map: {
              input: "$replies",
              as: "reply",
              in: {
                author: {
                  _id: "$$reply.author",
                  username: "$authorDetails.username",
                },
                content: "$$reply.content",
                date: "$$reply.date",
              },
            },
          },
        },
      },
    ];

    const result = await Thread.aggregate(pipeline);
    const transformedThread = result[0];

    if (transformedThread) {
      response = {
        ...transformedThread,
        createDate: formatDateTime(transformedThread.createDate),
        replies: transformedThread.replies.map((reply) => {
          return {
            ...reply,
            date: formatDateTime(reply.date),
          };
        }),
      };

      const trackRecord = await Thread.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: {
            reach: user._id,
          },
          $inc: {
            [`views.${today}`]: 1,
          },
        },
        { new: true }
      );

      const userRecordUpdate = await User.findByIdAndUpdate(user._id, {
        $addToSet: {
          visitedThreads: req.params.id,
        },
      });

      res.status(200).send(response);
    } else {
      console.log("Thread not found.");
      res.status(404).send({ message: "Thread not found!" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

// get a list of threads
router.get("/v1/thread", async (req, res) => {
  try {
    const { page = 1, limit = 15, filter = "all" } = req.query;
    if (!["all", "top", "unseen"].includes(filter)) {
      res.status(400).send({ message: "Invalid filter" });
      return;
    }
    const skip = (page - 1) * limit;
    let sortObject = { createDate: -1 };
    let additionalFilter = [];

    if (filter === "top") {
      sortObject = { likes: -1, createDate: -1 };
    } else if (filter === "unseen") {
      additionalFilter = [
        {
          $match: {
            _id: { $nin: req.user.visitedThreads },
          },
        },
      ];
    }

    // if (filter) {
    //   var filterDate = new Date();
    //   filterDate.setHours(0, 0, 0, 0);
    // } else {
    //   filterDate = undefined;
    // }
    const pipeline = additionalFilter.concat([
      // {
      //   $match: {
      //     createDate: { $gte: new Date(filterDate) },
      //   },
      // },
      {
        $addFields: {
          reach: { $size: "$reach" },
          likes: { $size: "$likes" },
          replies: { $size: "$replies" },
        },
      },
      {
        $sort: sortObject,
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorData",
        },
      },
      {
        $addFields: {
          authorData: {
            $arrayElemAt: ["$authorData", 0],
          },
          views: { $objectToArray: "$views" },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          author: {
            _id: "$authorData._id",
            username: "$authorData.username",
          },
          views: {
            $sum: "$views.v",
          },
          reach: 1,
          likes: 1,
          replies: 1,
          createDate: {
            $ifNull: ["$createDate", new Date()],
          },
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    const threads = await Thread.aggregate(pipeline);
    const response = threads.map((thread) => {
      return {
        ...thread,
        createDate: formatDateTime(thread.createDate),
      };
    });
    res.status(200).send(response);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

// reply on a thread
router.post("/v1/thread/reply", async (req, res) => {
  try {
    const user = req.user;
    const { threadId, content } = req.body;

    const result = await Thread.findByIdAndUpdate(
      threadId,
      {
        $push: {
          replies: {
            author: user._id,
            content: content,
          },
        },
      },
      { new: true }
    );

    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

// like a thread
router.post("/v1/thread/like", async (req, res) => {
  try {
    const user = req.user;
    const { threadId, like = true } = req.body;

    if (threadId === undefined) {
      res.status(400).send({ message: "Invalid threadId" });
    }

    const response = await Thread.findByIdAndUpdate(
      threadId,
      like
        ? {
            $addToSet: {
              likes: user._id,
            },
          }
        : {
            $pull: {
              likes: user._id,
            },
          }
    );

    const oldRecordStatus = response.likes.indexOf(user._id) !== -1;

    if (like === true && !oldRecordStatus) {
      await User.findByIdAndUpdate(response.author, {
        $inc: { likesReceived: 1 },
      });
    } else if (like === false && oldRecordStatus) {
      await User.findByIdAndUpdate(response.author, {
        $inc: { likesReceived: -1 },
      });
    }

    res
      .status(201)
      .send(like ? "Liked successfully" : "Removed like successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

module.exports = router;
