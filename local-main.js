require("dotenv").config();
const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const HUB = require("./HUB_class.js").default;

const PORT = process.env.PORT || 3000;
const NAMESPACE = "/hub";

const app = express();

// Serve static client files from ./public
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Root: serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const hub = new HUB({
  io,
  name: "local-rpi-hub",
  version: "0.3.3",
});

io.of(NAMESPACE).on("connection", (socket) => {
  hub.onNewConnection(socket);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[local-hub] Listening on http://0.0.0.0:${PORT} (namespace ${NAMESPACE})`
  );
});
