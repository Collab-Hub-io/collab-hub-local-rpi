# Collab-Hub Raspberry Pi Setup (Local LAN Server)

This guide walks through the steps to turn a blank Raspberry Pi into a local Collab-Hub server. It assumes **very little prior experience**. By the end, you'll be able to set your rpi to automatically connect to your local network, automatically start the collab-hub server, and change the connection port if needed.

If anything is confusing or doesn’t work, you can update this file as you learn what works best in your environment.

## **12/1/2025**: Updates to the Max and PD clients to be able to change server (remote and local) coming soon.

## 1. What You Need

- A **Raspberry Pi** (any model that can run Raspberry Pi OS, Pi 3 or newer recommended).
- A **microSD card** (16 GB or larger recommended).
- A **computer** (Mac/Windows/Linux) to prepare the SD card.
- A way to connect the Pi to your network:
  - Wi‑Fi, or
  - Ethernet cable.
- (Optional but helpful) A monitor + keyboard for the Pi, especially for first-time setup.

You will eventually need:

- The **Pi’s IP address** (so you can visit the Collab-Hub web interface).

---

## 2. Flash Raspberry Pi OS to the SD Card

1. On your main computer, download **Raspberry Pi Imager** from:

   - https://www.raspberrypi.com/software

2. Insert the **microSD card** into your computer.

3. Open Raspberry Pi Imager and choose:

   - **Operating System**: `Raspberry Pi OS (32-bit)` (or Lite if you prefer only command line).
   - **Storage**: your SD card.

4. Click the **gear / advanced options** (or similar) and set:

- **Set hostname**: e.g. `collabhub`.
- **Enable SSH**: choose `Use password authentication`.
- Internet access, through Wi-Fi or Ethernet, is important. We will be downloading packages/modules.
- **Set username and password**: e.g. `pi` / `your-password`.
- **Configure Wi‑Fi** (if not using Ethernet): add your network name (SSID), password, and select your country.
- **Set locale settings** (time zone, keyboard) if available.
- You might see an option to use Raspberry Pi Connect. This is optional. You can follow all the steps below without it.

5. Click **Write** and wait until it finishes.

6. When done, safely **eject** the SD card and insert it into your Raspberry Pi.

7. Power on the Pi (plug in power; attach Ethernet if using it). Double check your power source and your Pi's power specs.

The Pi will boot and may take a few minutes on the first run.

---

## 3. Find the Raspberry Pi on Your Network

You need the Pi’s **IP address** to connect to it.

### Option A: Using your router

1. Log into your home router’s admin page (often something like `http://192.168.1.1` or `http://192.168.0.1`).
2. Check the **connected devices** list.
3. Look for a device named `collabhub` (or the hostname you set).
4. Note its IP address (something like `192.168.1.23`).

### Option B: Using `ping` (if mDNS is working)

On your main computer (Mac/Windows/Linux), open a terminal and run:

```bash
ping collabhub.local
```

If it responds, you can usually use `collabhub.local` instead of the IP address.

---

## 4. SSH into the Raspberry Pi

**SSH** lets you open a terminal on the Pi from your main computer. You won't need to connect your pi to a monitor.

On your main computer:

1. Open **Terminal** (on macOS) or **PowerShell** (on Windows 10/11).

2. Run (replace `pi` and IP/hostname if needed):

```bash
ssh pi@collabhub.local
```

or, if you know the IP:

```bash
ssh pi@192.168.1.23
```

Depending on the Pi model, it might take some time for the Pi to boot, startup, and connect to your network -- all need to happen before you can ssh in. If there is no response, you can wait or cancel the command (Ctrl + c) and try again.

3. The first time, you may see a message like:

> The authenticity of host 'collabhub.local' can't be established...

Type `yes` and press **Enter**.

4. Enter the **password** you set in Raspberry Pi Imager. (Your password letters might not sudo nano /etc/hostnameappear as you type them on the screen.)

If successful, your prompt will change to something like:

```bash
pi@collabhub:~ $
```

You are now logged into the Pi.

---

### How to disconnect from SSH

When you're done working on the Pi, you can close the SSH session with:

```bash
exit
```

or by pressing `Ctrl + D`. Your terminal will return to your local computer.

---

## 5. Update the Pi and Install System Tools

In the SSH session on the Pi: (you can copy paste each code block and press enter)

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git build-essential
```

This may take several minutes.

---

## 6. Reboot the Raspberry Pi (when needed)

Sometimes you will need to reboot the Pi (for example, after changing
hostname or installing updates).

From your SSH session on the Pi, run:

```bash
sudo reboot
```

Your SSH connection will close with a message like `Connection closed`.
Wait 60–90 seconds for the Pi to fully shut down and start back up, then
you can reconnect with `ssh pi@<hostname>.local`.

---

## 7. Install Node.js and npm on the Pi

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

## 8. Get the Collab-Hub RPi Bundle onto the Pi

### Clone the Collab-Hub RPi-only repo

On the Pi (still in SSH):

```bash
cd ~
git clone https://github.com/Collab-Hub-io/collab-hub-local-rpi.git
cd collab-hub-local-rpi
```

This will install the Collab-HUb RPi repo `collab-hub-local-rpi` that contains:

- `local-main.js` (server module)
- `HUB_class.js` (already built and copied from the main repo)
- `public/` (the web client files)
- `package.json`
- `.env.example` (optional template)

### To view the files:

```bash
ls
```

\*\* Use `ls -a` to show hidden files (.env) will display this way.

## 8. Install Node Dependencies (on the Pi)

In the project folder on the Pi (e.g. `~/collab-hub-local-rpi`):

```bash
npm install
```

This installs packages such as `express`, `socket.io`, and `dotenv`.

If you see errors like `Cannot find module 'lodash'`, that usually means `npm install` hasn’t been run, or the dependency is missing from `package.json`.

You might see a message that a "New major version of npm available!" It is okay to update. At the time of this writing, I am using version 11.6.4. Follow directions to update npm.

Example command to update npm (node package manager).

```bash
npm install -g npm@11.6.4
```

You might see a warning:
``The operation was rejected by your operating system. It is likely you do not have the permissions to access this file as the current user```

You can run the command with `sudo` (superuser do):

```bash
sudo npm install -g npm@11.6.4
```

---

## 9. Create and Edit the `.env` File

The `.env` file controls ports and addresses used by the local hub.

From the project folder on the Pi:

```bash
nano .env
```

Paste something like this (adjust values as needed):

```env
# HTTP port for the web hub
PORT=3000
# Hub URL (namespace /hub)
HUB_URL=http://localhost:3000/hub
```

To save and exit in `nano`:

1. Press `Ctrl + O`, then **Enter** to save.
2. Press `Ctrl + X` to exit.

---

## 10. Start the Local Hub

Run:

```bash
npm start
```

If everything starts correctly, you should see logs indicating that the HTTP server is listening. Example:

```bash
[local-hub] Listening on http://0.0.0.0:3000 (namespace /hub)
```

---

## 11. Connect from a Browser

On a laptop/phone **on the same network** as the Pi:

1. Open a web browser.
2. **First, try the friendly `.local` name:**

- `http://collabhub.local:3000/`

This usually works on:

- **macOS / iOS**: supports `.local` out of the box.
- **Android**: often works when on the same Wi‑Fi, but can depend on the router.
- **Windows 10 and later**: most current versions resolve `.local` automatically via mDNS.

  > If `.local` resolution on Windows still does not work, see
  > Microsoft’s guidance on mDNS and legacy name resolution here:
  > https://techcommunity.microsoft.com/blog/networkingblog/aligning-on-mdns-ramping-down-netbios-name-resolution-and-llmnr/3290816

3. If `.local` does **not** work (browser can’t find the server), fall back to the Pi’s IP:

```bash
hostname -I
```

- `http://<pi-ip>:3000/`  
  (for example `http://192.168.1.23:3000/`)

4. You should see the Collab-Hub web interface (e.g. `index.html`).

The client JavaScript should be using `io("/hub")` (no hard-coded URLs), so it connects back to the Pi automatically.

---

## 12. After boot: quick "is it running?" check

If you set up auto-start or started the hub manually and want to quickly
check that it's running after a reboot:

1. **From a browser on your laptop/phone** (same network as the Pi):

- Visit `http://collabhub.local:3000/`.
- If the Collab-Hub page loads, the server is running.

2. **From an SSH session on the Pi** (optional terminal check):

```bash
sudo systemctl status collabhub.service
```

- If you see `Active: active (running)`, the hub is running.

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

You should see `active` and `enabled` like below:

```bash
     Loaded: loaded (/etc/systemd/system/collabhub.service; enabled; preset: enabled)
     Active: active (running) since Sun 2025-11-30 23:41:24 CST; 17s ago
 Invocation: a88f5b37ab564e349fe7b8fa9d857907
   Main PID: 3210 (npm start)
      Tasks: 19 (limit: 1548)
        CPU: 4.729s
     CGroup: /system.slice/collabhub.service
             ├─3210 "npm start"
             ├─3221 sh -c "node local-main.js"
             └─3222 node local-main.js
```

---

## 14. Turn Off Auto-Start (disable systemd service)

If you enabled the `collabhub.service` auto-start but want to stop it from
running on boot:

1. **Disable** the service so it no longer starts automatically:

```bash
sudo systemctl disable collabhub.service
```

2. (Optional) **Stop** the currently running service without rebooting:

```bash
sudo systemctl stop collabhub.service
```

You can always re-enable it later with:

```bash
sudo systemctl enable collabhub.service
```

---

## 15. Troubleshooting Tips

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

---

## 16. Notes and Future Improvements

- This file is meant to be updated as the project evolves.
- As you refine your RPi-only repo layout and scripts (for example, a single `npm start` that runs both hub and bridge in a robust way), update the relevant sections here.
- If you share a public `collab-hub-local-rpi` repo, you can copy this file (or a simplified version of it) into that repo so others can follow the same steps.
