#!/usr/bin/env node

const dns = require("dns");
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const { requireMongoUri } = require("./config/mongoUri");

const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

const mongoStatus = require("./config/mongoStatus");
const mongoConnectOptions = require("./config/mongoConnectOptions");
const mongoUri = requireMongoUri();

mongoose.connection.on("connected", function () {
  mongoStatus.setLastError(null);
  console.log("MongoDB connected");
});

mongoose.connection.on("error", function (err) {
  mongoStatus.setLastError(err);
  console.error("MongoDB connection error:", err.message || err);
});

mongoose.connection.on("disconnected", function () {
  console.warn("MongoDB disconnected — đang thử kết nối lại…");
  mongoose.connect(mongoUri, mongoConnectOptions).catch(function (err) {
    console.warn("MongoDB reconnect:", err.message || err);
  });
});

mongoose
  .connect(mongoUri, mongoConnectOptions)
  .then(async function () {
    try {
      await require("./utils/forumCategorySetup")();
      console.log("Forum category setup OK");
    } catch (e) {
      console.error("forumCategorySetup:", e);
    }
  })
  .catch(function (err) {
    mongoStatus.setLastError(err);
    console.error("MongoDB connect failed:", err.message || err);
    console.error(
      "Sửa MONGODB_URI trong backend/.env — chuỗi mongodb:// (non-SRV) đúng cluster Atlas, đúng replicaSet."
    );
  });

function normalizePort(val) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return val;
  if (n >= 0) return n;
  return false;
}

function onError(error) {
  if (error.syscall !== "listen") throw error;
  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  console.log("Listening on " + bind);
}
