const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET"],
  },
});

const cors = require("cors");

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

io.on("connection", (socket) => {
  //   console.log("socket", socket);
  socket.emit("hello", {
    message: "Fire!",
  });

  socket.on("chat", (chatData) => {
    console.log("chatData", chatData);
  });
});

module.exports = server;
