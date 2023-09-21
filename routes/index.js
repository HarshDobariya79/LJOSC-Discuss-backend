const express = require("express");
const router = express.Router();
const { formatDate } = require("../utils");
const User = require("../models/user");

router.get("/", async (req, res) => {
  res.send({ message: "Home page" });
});

router.get("/ping", async (req, res) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  try {
    const user = req.user;
    if (currentDate != user.lastVisitDate) {
      const response = await User.findByIdAndUpdate(user._id, {
        $set: { lastVisitDate: currentDate },
        $inc: { visitedDays: 1 },
      });
    }
    res.status(200).send({ message: "Success", data: formatDate(currentDate) });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

module.exports = router;
