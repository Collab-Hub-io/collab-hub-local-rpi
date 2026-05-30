require("dotenv").config();

const http = require("http");
const https = require("https");
const osc = require("osc");
const { io } = require("socket.io-client");

// Hub URL: same origin as your local hub
// For RPi-only repo, default to local Pi IP/port, override via env if needed.
const HUB_URL = process.env.HUB_URL || "http://localhost:3000/hub";

// OSC config (override via env if desired)
const OSC_IN_PORT = Number(process.env.OSC_IN_PORT || 57120);
const OSC_OUT_PORT = Number(process.env.OSC_OUT_PORT || 57121);
const OSC_TARGET_HOST = process.env.OSC_TARGET_HOST || "127.0.0.1";
const HUB_USERNAME = (process.env.HUB_USERNAME || "").trim();
const HUB_PASSWORD = process.env.HUB_PASSWORD || "";

const passwordAuthEnabled = HUB_USERNAME.length > 0 && HUB_PASSWORD.length > 0;

const authState = {
  accessToken: "",
  refreshToken: "",
  username: HUB_USERNAME,
  mode: "",
};

const AUTH_ERROR_PATTERN = /(token|auth|credential)/i;

const requestJson = (urlString, method, body) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(urlString);
    const payload = body ? JSON.stringify(body) : "";
    const transport = parsed.protocol === "https:" ? https : http;

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let responseText = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseText += chunk;
        });
        res.on("end", () => {
          let responseBody = {};
          if (responseText.trim().length > 0) {
            try {
              responseBody = JSON.parse(responseText);
            } catch (_err) {
              responseBody = { raw: responseText };
            }
          }

          resolve({
            ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
            status: res.statusCode || 500,
            payload: responseBody,
          });
        });
      },
    );

    req.on("error", reject);
    if (payload.length > 0) {
      req.write(payload);
    }
    req.end();
  });

const hubOrigin = (() => {
  const url = new URL(HUB_URL);
  return `${url.protocol}//${url.host}`;
})();

const loginWithConfiguredCredentials = async () => {
  if (!passwordAuthEnabled) {
    return null;
  }

  const result = await requestJson(`${hubOrigin}/api/v1/auth/login`, "POST", {
    username: HUB_USERNAME,
    password: HUB_PASSWORD,
  });

  if (
    !result.ok ||
    !result.payload.accessToken ||
    !result.payload.refreshToken
  ) {
    const message =
      result.payload.error || `Login failed with status ${result.status}.`;
    throw new Error(message);
  }

  authState.accessToken = result.payload.accessToken;
  authState.refreshToken = result.payload.refreshToken;
  authState.username = HUB_USERNAME;
  authState.mode = "password";
  console.log(`[auth] login_ok: ${authState.username}`);
  return authState;
};

const createGuestSession = async () => {
  const payload = {};
  if (HUB_USERNAME.length > 0) {
    payload.username = HUB_USERNAME;
  }

  const result = await requestJson(
    `${hubOrigin}/api/v1/auth/guest`,
    "POST",
    payload,
  );

  if (!result.ok) {
    if (result.status === 404) {
      console.log(
        "[auth] guest_unavailable: server does not support /auth/guest",
      );
      return null;
    }

    const message =
      result.payload.error ||
      `Guest login failed with status ${result.status}.`;
    throw new Error(message);
  }

  if (!result.payload.accessToken || !result.payload.refreshToken) {
    throw new Error("Guest login did not return session tokens.");
  }

  authState.accessToken = result.payload.accessToken;
  authState.refreshToken = result.payload.refreshToken;
  authState.username = result.payload.username || HUB_USERNAME || "osc-bridge";
  authState.mode = "guest";
  console.log(`[auth] guest_ok: ${authState.username}`);
  return authState;
};

const establishInitialSession = async () => {
  if (passwordAuthEnabled) {
    return loginWithConfiguredCredentials();
  }
  return createGuestSession();
};

const refreshSocketSession = async () => {
  if (!authState.refreshToken) {
    return false;
  }

  const result = await requestJson(`${hubOrigin}/api/v1/auth/refresh`, "POST", {
    refreshToken: authState.refreshToken,
  });

  if (
    !result.ok ||
    !result.payload.accessToken ||
    !result.payload.refreshToken
  ) {
    return false;
  }

  authState.accessToken = result.payload.accessToken;
  authState.refreshToken = result.payload.refreshToken;
  console.log(
    `[auth] ${authState.mode === "guest" ? "refresh_guest_ok" : "refresh_ok"}: ${authState.username}`,
  );
  return true;
};

const applySocketAuth = (socket) => {
  const username = authState.username || HUB_USERNAME || "osc-bridge";
  socket.io.opts.query = { username };
  socket.auth = authState.accessToken ? { token: authState.accessToken } : {};
};

// Connect to local Collab-Hub as a Socket.IO client
const socket = io(HUB_URL, {
  query: { username: HUB_USERNAME || "osc-bridge" },
  transports: ["websocket"],
  reconnection: true,
  autoConnect: false,
});

const bootstrapSocketConnection = async () => {
  try {
    if (!authState.accessToken) {
      await establishInitialSession();
    }
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("[auth] session bootstrap failed:", message);
  }

  if (!authState.accessToken) {
    console.log("[auth] anonymous_fallback");
  }

  applySocketAuth(socket);
  socket.connect();
};

socket.on("connect", () => {
  console.log("[osc-bridge] Connected to hub:", HUB_URL);
});

let authRecoveryInFlight = false;
socket.on("connect_error", async (err) => {
  console.error("[osc-bridge] Connect error:", err.message);

  if (
    !AUTH_ERROR_PATTERN.test(String(err && err.message ? err.message : err))
  ) {
    return;
  }

  if (authRecoveryInFlight) {
    return;
  }

  authRecoveryInFlight = true;
  try {
    const refreshed = await refreshSocketSession();
    if (!refreshed) {
      await establishInitialSession();
    }
    applySocketAuth(socket);
    socket.connect();
  } catch (authErr) {
    const message =
      authErr && authErr.message ? authErr.message : String(authErr);
    console.error("[auth] auth_recovery_failed:", message);
  } finally {
    authRecoveryInFlight = false;
  }
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
    a && typeof a === "object" && "value" in a ? a.value : a,
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
    values,
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

bootstrapSocketConnection();
