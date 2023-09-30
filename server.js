require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const authMiddleware = require("./middleware/authentication")
const authRouter = require("./routes/auth");
const indexRoute = require("./routes/index");
const apiRoute = require("./routes/api");
const cors = require("cors")
const rateLimit = require('express-rate-limit');

const SERVER_PORT = process.env.SERVER_PORT || 8080; // take default port as 8080 if not specified

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (err) => console.error(err));
db.once("open", () => console.log("connected to Database"));

app.use(express.json());

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

// rate limit api requests based on ip address
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // 100 requests per minute per IP address
  keyGenerator: (req) => {
    return req.ip; // Use IP address as the key
  },
});

app.use(limiter);

app.use(cors(corsOptions));

// Keep /auth unprotected
app.use("/auth", authRouter);

// protect rest of the routes with authMiddleware
app.use("/", authMiddleware);
app.use('/', indexRoute)
app.use("/api", apiRoute);

// start listening on the server
app.listen(SERVER_PORT, () =>
  console.log(`server listening on http://localhost:${SERVER_PORT}`)
);
