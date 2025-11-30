# Collab-Hub Raspberry Pi Setup (Local LAN Server)

This guide walks through **every step** to turn a blank Raspberry Pi into a local Collab-Hub server with an OSC bridge. It assumes **very little prior experience**.

If anything is confusing or doesn’t work, you can update this file as you learn what works best in your environment.

---

## 1. What You Need

- A **Raspberry Pi** (any model that can run Raspberry Pi OS, Pi 3 or newer recommended).
- A **microSD card** (16 GB or larger recommended).
- A **computer** (Mac/Windows/Linux) to prepare the SD card.
- A way to connect the Pi to your network:
  - Wi‑Fi, or
  - Ethernet cable.
- (Optional but helpful) A monitor + keyboard for the Pi, especially for first-time setup.

You will eventually need:

- The **Pi’s IP address** (so you can visit the web interface and send OSC).
- The **IP address of the laptop/desktop** where Max/Pd or other OSC tools are running.

---

## 2. Flash Raspberry Pi OS to the SD Card

1. On your main computer, download **Raspberry Pi Imager** from:

   - https://www.raspberrypi.com/software

2. Insert the **microSD card** into your computer.

3. Open Raspberry Pi Imager and choose:

   - **Operating System**: `Raspberry Pi OS (32-bit)` (or Lite if you prefer only command line).
   - **Storage**: your SD card.

4. Click the **gear / advanced options** (or similar) and set:

   - **Set hostname**: e.g. `collabhub-pi`.
   - **Enable SSH**: choose `Use password authentication`.
   - Internet access, through Wi-Fi or Ethernet, is important. We will be downloading packages/modules.
   - **Set username and password**: e.g. `pi` / `your-password`.
   - **Configure Wi‑Fi** (if not using Ethernet): add your network name (SSID), password, and select your country.
   - **Set locale settings** (time zone, keyboard) if available.
   - You might see an option to use Raspberry Pi Connect. This is optional. You can follow all the steps below without it.

5. Click **Write** and wait until it finishes.

6. When done, safely **eject** the SD card and insert it into your Raspberry Pi.

7. Power on the Pi (plug in power; attach Ethernet if using it).

The Pi will boot and may take a few minutes on the first run.

---

## 3. Find the Raspberry Pi on Your Network

You need the Pi’s **IP address** to connect to it.

### Option A: Using your router

1. Log into your home router’s admin page (often something like `http://192.168.1.1` or `http://192.168.0.1`).
2. Check the **connected devices** list.
3. Look for a device named `collabhub-pi` (or the hostname you set).
4. Note its IP address (something like `192.168.1.23`).

### Option B: Using `ping` (if mDNS is working)

On your main computer (Mac/Windows/Linux), open a terminal and run:

```bash
ping collabhub-pi.local
```

If it responds, you can usually use `collabhub-pi.local` instead of the IP address.

---

## 4. SSH into the Raspberry Pi

**SSH** lets you open a terminal on the Pi from your main computer.

On your main computer:

1. Open **Terminal** (on macOS) or **PowerShell** (on Windows 10/11).

2. Run (replace `pi` and IP/hostname if needed):

```bash
ssh pi@collabhub-pi.local
```

or, if you know the IP:

```bash
ssh pi@192.168.1.23
```

3. The first time, you may see a message like:

> The authenticity of host 'collabhub-pi.local' can't be established...

Type `yes` and press **Enter**.

4. Enter the **password** you set in Raspberry Pi Imager.

If successful, your prompt will change to something like:

```bash
pi@collabhub-pi:~ $
```

You are now logged into the Pi.

---

## 5. Update the Pi and Install System Tools

In the SSH session on the Pi:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git build-essential
```

This may take several minutes.

---

## 6. Install Node.js and npm on the Pi

Collab-Hub runs on **Node.js**. We’ll install a recent version.

On the Pi (still in SSH):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v
npm -v
```

You should see version numbers printed (for example `v20.x.x` and `10.x.x`).

---

## 7. Get the Collab-Hub RPi Bundle onto the Pi

### Clone the Collab-Hub RPi-only repo (recommended)

If you have (or will have) a minimal repo like `collab-hub-local-rpi` that contains:

- `local-main.js`
- `osc-bridge.js`
- `hub/HUB_class.js` (already built and copied from the main repo)
- `public/` (the web client files)
- `package.json`
- `.env.example` (optional template)

Then on the Pi:

```bash
cd ~
git clone https://github.com/Collab-Hub-io/collab-hub-local-rpi.git
cd collab-hub-local-rpi
```

## 8. Install Node Dependencies (on the Pi)

In the project folder on the Pi (e.g. `~/collab-hub-local-rpi`):

```bash
npm install
```

This installs packages such as `express`, `socket.io`, `osc`, and `dotenv`.

If you see errors like `Cannot find module 'lodash'`, that usually means `npm install` hasn’t been run, or the dependency is missing from `package.json`.

---

## 9. Create and Edit the `.env` File

The `.env` file controls ports and addresses used by the local hub and OSC bridge.

From the project folder on the Pi:

```bash
nano .env
```

Paste something like this (adjust values as needed):

```env
# HTTP port for the web hub
PORT=3000

# Where the OSC bridge connects (local hub URL)
HUB_URL=http://localhost:3000/hub

# OSC IN: where the bridge listens for OSC from Max/Pd/etc.
OSC_IN_PORT=9000

# OSC OUT: where the bridge sends OSC back
OSC_OUT_PORT=9001

# Target host for outgoing OSC (often your laptop running Max/Pd)
OSC_TARGET_HOST=192.168.1.50
```

Replace `192.168.1.50` with the **IP address of your laptop/desktop** that will run Max, Pd, or other OSC tools.

To save and exit in `nano`:

1. Press `Ctrl + O`, then **Enter** to save.
2. Press `Ctrl + X` to exit.

---

## 10. Start the Local Hub and OSC Bridge

Make sure your `package.json` in this folder has a script like one of these:

- Simple hub only:

```json
"scripts": {
  "start": "node local-main.js"
}
```

- Hub and OSC bridge together (example using background `&`):

```json
"scripts": {
  "start": "node local-main.js & node osc-bridge.js"
}
```

Then, on the Pi:

```bash
npm start
```

Or, if you want to run them separately:

```bash
node local-main.js
# in another SSH session
node osc-bridge.js
```

If everything starts correctly, you should see logs indicating that the HTTP server and OSC ports are listening.

---

## 11. Connect from a Browser

On a laptop/phone **on the same network** as the Pi:

1. Open a web browser.
2. **First, try the friendly `.local` name:**

- `http://collabhub-pi.local:3000/`

This usually works on:

- **macOS / iOS**: supports `.local` out of the box.
- **Android**: often works when on the same Wi‑Fi, but can depend on the router.
- **Windows**: works if Bonjour/mDNS is installed (e.g. via iTunes or Apple Bonjour Print Services).

3. If `.local` does **not** work (browser can’t find the server), fall back to the Pi’s IP:

- `http://<pi-ip>:3000/`  
  (for example `http://192.168.1.23:3000/`)

4. You should see the Collab-Hub web interface (e.g. `index.html`).

The client JavaScript should be using `io("/hub")` (no hard-coded URLs), so it connects back to the Pi automatically.

---

## 12. Connect OSC (Max/Pd/Other)

From Max, Pd, or another OSC tool on your laptop/desktop:

1. Set the **destination IP** to the Pi’s IP (e.g. `192.168.1.23`).
2. Set the **destination port** to `OSC_IN_PORT` from your `.env` (e.g. `9000`).

To receive OSC back from the hub:

1. Make sure your laptop’s IP is correctly set in `OSC_TARGET_HOST` in `.env`.
2. Listen on `OSC_OUT_PORT` (e.g. `9001`).

Use the Collab-Hub OSC address patterns you’ve designed, such as:

- Broadcast control/event:
  - `/control/<header>`
  - `/event/<header>`
- Targeted control/event:
  - `/target/control/<header>`
  - `/target/event/<header>`

---

## 13. Optional: Auto-Start on Boot (systemd)

If you want the Pi to start Collab-Hub automatically when it powers on:

1. On the Pi, create a systemd service file:

```bash
sudo nano /etc/systemd/system/collabhub.service
```

2. Paste this (adjust `User` and `WorkingDirectory` if needed):

```ini
[Unit]
Description=Collab-Hub local server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/pi/collab-hub-local-rpi
ExecStart=/usr/bin/npm start
Restart=always
User=pi
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Save and exit (`Ctrl + O`, Enter, `Ctrl + X`).

4. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable collabhub.service
sudo systemctl start collabhub.service
```

Now, when the Pi boots, it will automatically run `npm start` in your project folder.

You can check its status with:

```bash
sudo systemctl status collabhub.service
```

---

## 14. Troubleshooting Tips

- **`ssh: Could not resolve hostname collabhub-pi.local`**

  - Try using the Pi’s IP address instead of the `.local` name.
  - Make sure the Pi is powered on and connected to the network.

- **`Permission denied` when running `ssh`**

  - Double-check the username and password you set in Raspberry Pi Imager.

- **`node: command not found`**

  - Re-run the Node.js install commands in step 6.

- **`Cannot find module '...'` when running `node local-main.js` or `npm start`**

  - Make sure you ran `npm install` in the project folder on the Pi.

- **Web page doesn’t load at `http://<pi-ip>:3000/`**

  - Confirm the server is running: `npm start` logs, or `sudo systemctl status collabhub.service` if using systemd.
  - Check that the Pi and your computer are on the same network.

- **Web page loads but clients fail to connect to the hub**

  - Confirm the client code uses `io("/hub")` (origin-relative) and does not hard-code a remote URL.

- **OSC messages aren’t arriving**
  - Check that `OSC_IN_PORT`, `OSC_OUT_PORT`, and `OSC_TARGET_HOST` are set correctly in `.env`.
  - Confirm firewall settings on your laptop (some OSes block UDP by default).

---

## 15. Notes and Future Improvements

- This file is meant to be updated as the project evolves.
- As you refine your RPi-only repo layout and scripts (for example, a single `npm start` that runs both hub and bridge in a robust way), update the relevant sections here.
- If you share a public `collab-hub-local-rpi` repo, you can copy this file (or a simplified version of it) into that repo so others can follow the same steps.
