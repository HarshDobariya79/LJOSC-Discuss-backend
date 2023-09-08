const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { formatDate } = require("../utils");

router.get("/", async (req, res) => {
  res.send({ message: "Home page" });
});

module.exports = router;

router.get("/ping", async (req, res) => {
  console.log(req.user);
  const currentDate = formatDate(new Date());
  try {
    const result = await User.findOne({ _id: req.user.userId });

    if (!result) {
      res.status(404).send({ message: "User not found" });
    } else {
      console.log(result.username);
      if (currentDate != result.lastVisitDate) {
        result.lastVisitDate = currentDate;
        result.visitedDays += 1;
      }
      result.save();
      res.status(200).send({ message: "Success", data: currentDate });
    }
  } catch (err) {
    res.status(500).send({ message: "Something went wrong" });
  }
});
