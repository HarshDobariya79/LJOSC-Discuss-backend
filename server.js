require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const SERVER_PORT = process.env.SERVER_PORT || 8080;

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (err) => console.error(err));
db.once("open", () => console.log("connected to Database"));

app.use(express.json());

const router = require("./routes/index");
app.use("/", router);

app.listen(SERVER_PORT, () =>
  console.log(`server listening on http://localhost:${SERVER_PORT}`)
);
