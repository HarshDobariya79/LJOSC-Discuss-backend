require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const authMiddleware = require("./middleware/authentication")
const authRouter = require("./routes/auth");
const indexRoute = require("./routes/index");

const SERVER_PORT = process.env.SERVER_PORT || 8080;

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (err) => console.error(err));
db.once("open", () => console.log("connected to Database"));

app.use(express.json());

app.use("/auth", authRouter);
app.use("/", authMiddleware);
app.use('/', indexRoute)

app.listen(SERVER_PORT, () =>
  console.log(`server listening on http://localhost:${SERVER_PORT}`)
);
