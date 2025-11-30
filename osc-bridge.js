require("dotenv").config();

const osc = require("osc");
const { io } = require("socket.io-client");

// Hub URL: same origin as your local hub
// For RPi-only repo, default to local Pi IP/port, override via env if needed.
const HUB_URL = process.env.HUB_URL || "http://localhost:3000/hub";

// OSC config (override via env if desired)
const OSC_IN_PORT = Number(process.env.OSC_IN_PORT || 57120);
const OSC_OUT_PORT = Number(process.env.OSC_OUT_PORT || 57121);
const OSC_TARGET_HOST = process.env.OSC_TARGET_HOST || "127.0.0.1";

// Connect to local Collab-Hub as a Socket.IO client
const socket = io(HUB_URL, {
  query: { username: "osc-bridge" },
});

socket.on("connect", () => {
  console.log("[osc-bridge] Connected to hub:", HUB_URL);
});

socket.on("connect_error", (err) => {
  console.error("[osc-bridge] Connect error:", err.message);
});

// OSC UDP port for in/out
const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: OSC_IN_PORT,
  remoteAddress: OSC_TARGET_HOST,
  remotePort: OSC_OUT_PORT,
});

udpPort.on("ready", () => {
  console.log("[osc-bridge] OSC listening on", OSC_IN_PORT);
  console.log("[osc-bridge] OSC target:", `${OSC_TARGET_HOST}:${OSC_OUT_PORT}`);
});

udpPort.on("error", (err) => {
  console.error("[osc-bridge] OSC error:", err.message || err);
});

udpPort.open();

// Helper: unwrap OSC args into plain values
function normalizeOscArgs(args) {
  if (!args || !args.length) return [];
  return args.map((a) =>
    a && typeof a === "object" && "value" in a ? a.value : a
  );
}

// Incoming OSC -> Hub
udpPort.on("message", (msg) => {
  console.log("[osc-bridge] Received OSC:", msg);

  const address = msg.address || "";
  if (!address.startsWith("/")) return;

  const parts = address.split("/").filter(Boolean);
  if (!parts.length) return;

  let target = "all";
  let type;
  let header;

  if (["control", "event", "chat"].includes(parts[0])) {
    // /<type>/<header?>
    type = parts[0];
    header = parts[1];
    target = "all";
  } else {
    // /<target>/<type>/<header?>
    target = parts[0];
    type = parts[1];
    header = parts[2];
  }

  const values = normalizeOscArgs(msg.args);

  console.log(
    "[osc-bridge] Parsed:",
    "target=",
    target,
    "type=",
    type,
    "header=",
    header,
    "values=",
    values
  );

  if (type === "control" && header) {
    const payload =
      values.length === 0 ? null : values.length === 1 ? values[0] : values;
    socket.emit("control", { header, values: payload, target, mode: "push" });
  } else if (type === "event" && header) {
    const payload =
      values.length === 0 ? null : values.length === 1 ? values[0] : values;
    socket.emit("event", { header, values: payload, target, mode: "push" });
  } else if (type === "chat") {
    const text =
      values.length === 0
        ? ""
        : values.length === 1
        ? String(values[0])
        : values.join(" ");
    if (text) {
      socket.emit("chat", { chat: text, target });
    }
  }
});

// Hub -> OSC
function sendOsc(address, values) {
  let args = [];
  if (Array.isArray(values)) {
    args = values;
  } else if (values !== undefined && values !== null) {
    args = [values];
  }
  udpPort.send({ address, args }, OSC_TARGET_HOST, OSC_OUT_PORT);
}

socket.on("control", (data) => {
  if (!data || !data.header) return;
  sendOsc(`/control/${data.header}`, data.values);
});

socket.on("event", (data) => {
  if (!data || !data.header) return;
  sendOsc(`/event/${data.header}`, data.values);
});

socket.on("chat", (data) => {
  if (!data || !data.chat) return;
  const id = data.id || "all";
  sendOsc(`/chat/${id}`, data.chat);
});

process.on("SIGINT", () => {
  console.log("[osc-bridge] Shutting down...");
  try {
    udpPort.close();
  } catch {}
  try {
    socket.close();
  } catch {}
  process.exit(0);
});
