const jwt = require("jsonwebtoken");
const User = require("../models/user")

const ACCESS_TOKEN_SIGN_KEY = process.env.ACCESS_TOKEN_SIGN_KEY;

const authenticate = async (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Authentication failed" });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SIGN_KEY, {clockTolerance: "10s"});
    req.user = await User.findOne({_id: decoded?.userId});
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
