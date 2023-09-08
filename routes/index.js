const express = require("express");
const router = express.Router();
const { formatDate } = require("../utils");

router.get("/", async (req, res) => {
  res.send({ message: "Home page" });
});

router.get("/ping", async (req, res) => {
  const currentDate = new Date();
  try {
    const user = req.user;
    if (currentDate != user.lastVisitDate) {
      user.lastVisitDate = currentDate;
      user.visitedDays += 1;
    }
    user.save();
    res.status(200).send({ message: "Success", data: formatDate(currentDate) });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});

module.exports = router;
