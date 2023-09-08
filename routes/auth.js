const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SIGN_KEY = process.env.ACCESS_TOKEN_SIGN_KEY;
const REFRESH_TOKEN_SIGN_KEY = process.env.REFRESH_TOKEN_SIGN_KEY;

router.post("/v1/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error('Signup: ', error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/v1/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      ACCESS_TOKEN_SIGN_KEY,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      REFRESH_TOKEN_SIGN_KEY,
      { expiresIn: "7d" }
    );

    res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.post("/v1/refresh-token", (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SIGN_KEY);

    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      ACCESS_TOKEN_SIGN_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: "Token renewal failed" });
  }
});

module.exports = router;
