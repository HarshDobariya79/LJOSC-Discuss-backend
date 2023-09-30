const express = require("express");
const router = express.Router();
const { formatDate } = require("../utils/helpers");
const User = require("../models/user");

// Home page route
router.get("/", async (req, res) => {
  res.send({ message: "Home page" });
});

// Route to update user visitedDays
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
