const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SIGN_KEY = process.env.ACCESS_TOKEN_SIGN_KEY;

const authenticate = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Authentication failed" });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SIGN_KEY, {clockTolerance: "10s"});
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = authenticate;
