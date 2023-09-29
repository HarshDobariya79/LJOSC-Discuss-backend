const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Thread = require("../models/thread");
const User = require("../models/user");
const redis = require("../services/redis");
const { formatDate, formatDateTime } = require("../utils/helpers");

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

    // delete all cached threads lists
    let cursor = "0";
    let keysToDelete = [];

    do {
      const [newCursor, scannedKeys] = await redis.scan(cursor, "MATCH", "threads?*");
      cursor = newCursor;
      keysToDelete.push(...scannedKeys);
    } while (cursor !== "0");

    if (keysToDelete.length > 0) {
      // Use a pipeline to efficiently delete the keys
      const pipeline = redis.pipeline();
      keysToDelete.forEach((key) => pipeline.del(key));
      await pipeline.exec();
      // console.log(`Deleted ${keysToDelete.length} keys.`);
    } else {
      // console.log(`No keys matched the prefix "${prefix}".`);
    }

    res.status(201).send(response);
  } catch (err) {
    res.status(500).send({ message: "Something went wrong" });
  }
});

// get a thread
router.get("/v1/thread/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // aggregate pipeline
    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
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
      // {
      //   $unwind: {
      //     path: "$authorDetails",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $addFields: {
          views: { $objectToArray: "$views" },
          liked: {
            $in: [new mongoose.Types.ObjectId(user._id), "$likes"],
          },
          replies: {
            $map: {
              input: {
                $cond: [
                  { $isArray: "$replies" },
                  "$replies",
                  [], // Handle empty replies array
                ],
              },
              as: "reply",
              in: {
                author: {
                  $let: {
                    vars: { authorId: "$$reply.author" },
                    in: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$authorDetails",
                            as: "authorDetail",
                            cond: { $eq: ["$$authorDetail._id", "$$authorId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                },
                content: "$$reply.content",
                date: "$$reply.date",
              },
            },
          },
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
          liked: 1,
          author: {
            _id: "$authorData._id",
            username: "$authorData.username",
          },
          replies: {
            $map: {
              input: "$replies", // Assuming 'replies' is the field containing the list of replies
              as: "reply",
              in: {
                author: {
                  _id: "$$reply.author._id", // Access _id field within author
                  username: "$$reply.author.username", // Access username field within author
                },
                content: "$$reply.content",
                date: "$$reply.date",
              },
            },
          },
        },
      },
    ];

    const cachedData = await redis.get(`thread?id=${id}`);

    if (cachedData) {
      const data = JSON.parse(cachedData);
      res.status(200).send(data);
    } else {
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
        res.status(200).send(response);
        await redis.set(`thread?id=${id}`, JSON.stringify(response));
      } else {
        console.log("Thread not found.");
        res.status(404).send({ message: "Thread not found!" });
        return;
      }
    }

    // Update thead's reach and views
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

    // Add thread to user's visited threads list
    const userRecordUpdate = await User.findByIdAndUpdate(user._id, {
      $addToSet: {
        visitedThreads: req.params.id,
      },
    });
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

    // aggregate pipeline
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

    // fetch cached data from redis if available
    const cachedData = await redis.get(
      `threads?page=${page}&limit=${limit}&filter=${filter}`
    );

    // check for cached data
    if (cachedData) {
      // Add other fields from the reply object as needed
      const data = JSON.parse(cachedData);
      res.status(200).send(data);
    } else {
      const threads = await Thread.aggregate(pipeline);
      const data = threads.map((thread) => {
        return {
          ...thread,
          createDate: formatDateTime(thread.createDate),
        };
      });
      res.status(200).send(data);

      // set result in redis cache
      await redis.setex(
        `threads?page=${page}&limit=${limit}&filter=${filter}`,
        10,
        JSON.stringify(data)
      );
    }
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

    await redis.del(`thread?id=${threadId}`);

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

    await redis.del(`thread?id=${threadId}`);

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

    // update author's likes received count
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

// Top contributors api
router.get("/v1/users/top", async (req, res) => {
  try {
    // fetch cached data from redis if available
    const cachedData = await redis.get("topContributors");

    // check for cached data
    if (cachedData) {
      const data = JSON.parse(cachedData);
      res.status(200).send(data);
    } else {
      const data = await User.find({}, "_id username likesReceived").sort({
        likesReceived: -1,
      });

      // cache the result in redis
      await redis.setex("topContributors", 600, JSON.stringify(data));
      res.status(200).send(data);
    }
  } catch (err) {
    res.status(500).send({ message: "Something went wrong" });
    console.log("top contributors", err);
  }
});

module.exports = router;
