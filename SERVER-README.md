# Collab-Hub Local RPi Server

This folder is the basis for a minimal local-area Collab-Hub hub
running on a Raspberry Pi (or any small Linux machine). It serves
the Collab-Hub web UI and runs the hub logic and OSC bridge together.

## Quick start

The intended result: anyone on the same Wi‑Fi / LAN can open a
browser, go to the Pi’s address, and use Collab-Hub without
touching the public `server.collab-hub.io` instance.

## What this folder expects

This directory is designed to be copied into a small, separate repo
(`collab-hub-local-rpi`) that contains only:

- `local-main.js` – HTTP + Socket.IO server, serves `public/` and
  runs the hub on the `/hub` namespace.
- `osc-bridge.js` – OSC ↔ hub bridge.
- `hub/HUB_class.js` – compiled hub class copied from the main
  `collabhubserver` build.
- `public/` – the Collab-Hub web UI files (e.g. `index.html`,
  `designer.html`, JS/CSS).
- `package.json` – minimal deps (`express`, `socket.io`, `osc`,
  `socket.io-client`, `lodash`).

Once you have that small repo, the Pi user never needs the full
`collabhubserver` codebase.

- Serves the web UI from `http://<pi-ip>:3000/`
- Exposes the Socket.IO hub at `http://<pi-ip>:3000/hub`
- Runs the OSC bridge listening on UDP port `57120` and sending
  to `127.0.0.1:57121` (configurable via env vars in
  `osc-bridge.js`).
  All local clients (index, designer, and custom front‑ends) should
  connect to the hub using a **relative** namespace:

```js
const socket = io("/hub", {
  forceNew: true,
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  // NOTE: do not force transports; let Socket.IO negotiate
  // transports: ["websocket"],
});
```

This ensures the same code works when served from:

- `http://localhost:3000/` (testing on a laptop)
- `http://<pi-ip>:3000/` (running on the Raspberry Pi)

and avoids HTTPS vs HTTP mismatches.
The OSC bridge connects your local hub to OSC tools (Max, Pd, etc.).

# Collab-Hub Local RPi Server

This folder is the basis for a minimal local-area Collab-Hub hub
running on a Raspberry Pi (or any small Linux machine). It serves
the Collab-Hub web UI and runs the hub logic and OSC bridge together.

The intended result: anyone on the same Wi‑Fi / LAN can open a
browser, go to the Pi’s address, and use Collab-Hub without
touching the public `server.collab-hub.io` instance.

## What this folder expects

This directory is designed to be copied into a small, separate repo
(`collab-hub-local-rpi`) that contains only:

- `local-main.js` – HTTP + Socket.IO server, serves `public/` and
  runs the hub on the `/hub` namespace.
- `osc-bridge.js` – OSC ↔ hub bridge.
- `hub/HUB_class.js` – compiled hub class copied from the main
  `collabhubserver` build.
- `public/` – the Collab-Hub web UI files (e.g. `index.html`,
  `designer.html`, JS/CSS).
- `package.json` – minimal deps (`express`, `socket.io`, `osc`,
  `socket.io-client`, `lodash`, `dotenv`).

Once you have that small repo, the Pi user never needs the full
`collabhubserver` codebase.

## Quick start on a Raspberry Pi

On your Raspberry Pi:

```bash
git clone https://github.com/<you>/collab-hub-local-rpi.git
cd collab-hub-local-rpi
npm install
npm start
```

By default this:

- Serves the web UI from `http://<pi-ip>:3000/`
- Exposes the Socket.IO hub at `http://<pi-ip>:3000/hub`
- Runs the OSC bridge listening on UDP port `57120` and sending
  to `127.0.0.1:57121`.

## Configuration via .env

This folder supports a `.env` file (loaded by `dotenv`) so you can
change ports and OSC targets without editing code.

Create `./.env` in this repo with, for example:

```bash
HUB_URL=http://localhost:3000/hub
OSC_IN_PORT=57120
OSC_OUT_PORT=57121
OSC_TARGET_HOST=127.0.0.1
PORT=3000
```

Defaults if `.env` is missing:

- `HUB_URL` → `http://localhost:3000/hub`
- `OSC_IN_PORT` → `57120`
- `OSC_OUT_PORT` → `57121`
- `OSC_TARGET_HOST` → `127.0.0.1`
- `PORT` → `3000`

## Client connection rules

All local clients (index, designer, and custom front‑ends) should
connect to the hub using a **relative** namespace:

```js
const socket = io("/hub", {
  forceNew: true,
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  // NOTE: do not force transports; let Socket.IO negotiate
  // transports: ["websocket"],
});
```

This ensures the same code works when served from:

- `http://localhost:3000/` (testing on a laptop)
- `http://<pi-ip>:3000/` (running on the Raspberry Pi)

and avoids HTTPS vs HTTP mismatches.

## OSC bridge overview

The OSC bridge connects your local hub to OSC tools (Max, Pd, etc.).

- Incoming OSC address patterns:
  - Broadcast control: `/control/webSlider1` `0.5`
  - Targeted control: `/none/control/webSlider1` `0.5`
  - Broadcast event: `/event/kick` `1`
  - Targeted chat: `/Bob/chat` `"hello"`
- Address parsing rules:
  - If the first segment is `control`, `event`, or `chat`, it is
    treated as the type and the target is `"all"`.
  - Otherwise the first segment is the target, the second is the
    type, and the third is the header.

The bridge forwards these into the hub as `control`, `event`, or
`chat` messages, and also mirrors hub messages back out as OSC.

## Stopping the server

To stop the local hub and OSC bridge, press `Ctrl + C` in the
terminal where `npm start` is running.

## Troubleshooting tips

- If you see `Cannot find module 'lodash'` or similar, make sure
  `npm install` ran successfully in the `collab-hub-local-rpi`
  folder and that `lodash` is listed in `dependencies`.
- If a browser shows frequent disconnects, make sure your clients
  **do not** force `transports: ["websocket"]`; let Socket.IO
  pick transports automatically as shown above.
