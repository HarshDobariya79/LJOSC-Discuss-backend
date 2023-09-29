const jwt = require("jsonwebtoken");
const User = require("../models/user");

const ACCESS_TOKEN_SIGN_KEY = process.env.ACCESS_TOKEN_SIGN_KEY;
const ACCESS_TOKEN_CLOCK_TOLERANCE = 5000; // 5 seconds

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const type = authHeader.split(" ")[0];
    const token = authHeader.split(" ")[1];

    if (!token || type !== "Bearer") {
      return res.status(401).json({ error: "Authentication failed" });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SIGN_KEY);

    if (decoded.exp <= Math.floor(Date.now() / 1000) - ACCESS_TOKEN_CLOCK_TOLERANCE) {
      return res.status(401).json({ error: "Access token has expired" });
    }

    req.user = await User.findOne({ _id: decoded?.userId });
    if (!req.user) {
      res.status(404).send({ message: "User not found" });
    } else {
      next();
    }
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = authenticate;
