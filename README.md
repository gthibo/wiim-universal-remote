# WiiM Universal Remote

Control a **WiiM / LinkPlay** speaker with a **universal remote**.

WiiM makes excellent streamers, but there is no official way to drive one from a hardware remote like the **Sofabaton X1S**. This is a small service you run on your own network that fixes that. It turns simple web addresses into WiiM commands:

```
http://<your-server>:39447/api/remote/192.168.1.102/vol/up
http://<your-server>:39447/api/remote/192.168.1.102/media/toggle
http://<your-server>:39447/api/remote/192.168.1.102/preset/3
```

Your remote just needs to be able to "open a web address" when you press a button. Most Wi-Fi capable universal remotes can do this. Point the buttons at these URLs and you have real physical control of your WiiM — volume, transport, inputs, outputs, presets.

No account, no cloud, no phone app in the loop. Everything stays on your network.

---

## Before you install: this needs a computer that stays on

**This is the most important thing on this page.** Read it before anything else.

Every button press on your remote is a web request to *this service*. If the machine running it is off, the button does nothing — and **it fails silently**. Your WiiM will be perfectly fine, the music keeps playing, and the remote gives you no error, no blinking light, nothing. It just stops working, and it is genuinely confusing when it happens.

So run this on something that is always on:

- a NAS (Synology, QNAP, Unraid)
- a Raspberry Pi
- a mini PC or home server
- an always-on desktop
- a VM on a home server

**Sleep counts as off.** This trips people up more than shutdown does. A sleeping desktop looks like it's on — the light is on, it's plugged in — but it will not answer requests, and your remote will be dead until you wake it. Windows and macOS both sleep by default. If you use a desktop, turn sleep off first.

**A laptop is a bad choice.** It closes, it sleeps, it leaves the house.

---

## Install

You need [Docker](https://docs.docker.com/get-started/get-docker/). On Windows and macOS that means **Docker Desktop**.

### A word about security first

**Anyone on your Wi-Fi can control your speaker and see what you're playing.**

There is no password by default. That's deliberate — a hardware remote can't type one. On a normal home network this is fine; it's the same level of access as the WiiM app itself, and it's how similar tools work.

What matters:

- **Don't forward this port to the internet.** Don't put it on a public web address. Don't set up a port forward on your router for it.
- **Be aware of guest Wi-Fi.** If guests are on the same network, they can control your speaker too.
- If you need a password anyway, see [Remote token](#remote-token) below.

### Steps

```bash
git clone https://github.com/gthibo/wiim-universal-remote.git
cd wiim-universal-remote
cp .env.example .env
docker compose up -d
```

That's it. Open `http://localhost:39447` on the machine you installed it on.

To reach it from your phone or configure your remote, you need that machine's **network address** instead of `localhost` — something like `http://192.168.1.50:39447`. On Windows run `ipconfig`; on macOS or Linux run `ip addr` or check System Settings → Network.

### Make it start automatically

The container is already set to restart on its own (`restart: unless-stopped` in `docker-compose.yml`). You only need to make sure **Docker itself** starts with the machine:

- **Docker Desktop (Windows/macOS):** Settings → General → check *Start Docker Desktop when you log in*.
- **Linux:** `sudo systemctl enable docker`
- **Docker inside WSL2:** WSL does not start at boot on its own. You'll need a scheduled task or a startup shortcut that runs `wsl -d <distro>` at login.

---

## Set up your WiiM's address

Find your WiiM's IP address in the WiiM Home app: **Device Settings → About → IP Address**. It'll look like `192.168.1.102`.

That address goes in every URL you give your remote.

**Reserve it in your router.** Home networks hand out addresses on a lease, and when the lease expires your WiiM can come back with a different one. If that happens, every button on your remote silently stops working and there is nothing on the remote to tell you why. In your router's admin page, look for *DHCP Reservation*, *Static Lease*, or *Address Reservation*, and pin your WiiM to the address it has now. Five minutes once, and the problem never happens.

---

## The setup console

Open `http://<your-server>:39447` in a browser — your phone works fine and is the easiest way to test.

The console shows your device's current state and gives you buttons that build the right URLs for you. Press a button to confirm it works on the real speaker, then copy the URL into your remote's configuration.

**The console shows a useful subset, not everything.** Volume, seek, and presets all accept more forms than the buttons expose — the full vocabulary is in the tables below. When a URL has a number in it, you can usually just edit that number.

---

## Command reference

Every command is a plain `GET` request. All of them are built the same way:

```
http://<your-server>:39447/api/remote/<wiim-ip>/<command>
```

`<wiim-ip>` must be the **bare IP address** of the WiiM on your LAN (`192.168.1.102`). Addresses outside your local network are rejected.

Everything returns the plain text `ok` on success — except `/status`, which returns JSON.

### Playback

| URL | What it does |
| --- | --- |
| `media/play` | Play |
| `media/resume` | Play (same thing, alternate spelling) |
| `media/pause` | Pause |
| `media/toggle` | Play/pause toggle — **the one you want for a single remote button** |
| `media/stop` | Stop |
| `media/next` | Next track |
| `media/prev` | Previous track |

### Seek

| URL | What it does |
| --- | --- |
| `media/seek/+30` | Jump forward 30 seconds |
| `media/seek/-10` | Jump back 10 seconds |
| `media/seek/90` | Jump to 90 seconds into the track |

Any number works. Relative seeks are clamped to the length of the track.

### Volume

| URL | What it does |
| --- | --- |
| `vol/45` | Set volume to 45 |
| `vol/up` | Up by 1 |
| `vol/down` | Down by 1 |
| `vol/up/5` | Up by 5 |
| `vol/down/5` | Down by 5 |
| `vol/++` | Up by 1 (alternate spelling) |
| `vol/--` | Down by 1 (alternate spelling) |

Volume is 0–100 and is clamped, so `vol/up/10` at volume 97 lands on 100 rather than failing.

For a remote's volume rocker, `vol/up/2` or `vol/up/3` usually feels better than `vol/up` — single steps are slow when you're holding a button.

### Mute

| URL | What it does |
| --- | --- |
| `mute/on` | Mute |
| `mute/off` | Unmute |
| `mute/toggle` | Toggle mute |

### Inputs

| URL | Input |
| --- | --- |
| `input/wifi` | Network / WiFi |
| `input/bluetooth` | Bluetooth |
| `input/line-in` | Line In |
| `input/line-in2` | Line In 2 |
| `input/optical` | Optical |
| `input/optical2` | Optical 2 |
| `input/co-axial` | Coaxial |
| `input/co-axial2` | Coaxial 2 |
| `input/hdmi` | HDMI |
| `input/arc` | HDMI ARC |
| `input/phono` | Phono |
| `input/rca` | RCA |
| `input/xlr` | XLR |
| `input/pcusb` | USB-DAC |
| `input/udisk` | USB Drive |
| `input/cd` | CD |
| `input/next-input` | Cycle to the next enabled input, wrapping around |

Input names are not case-sensitive here, and punctuation is ignored — `input/HDMI`, `input/hdmi`, and `input/co-axial` all work.

Your WiiM only has some of these. A model without an HDMI port won't do anything useful with `input/hdmi`.

`input/next-input` asks the device which inputs you've actually enabled in the WiiM app and steps through only those — which makes it a good single-button "source" key.

### Outputs

The WiiM has **three independent ways** of sending audio out, and they don't behave like one setting with several positions.

**Wired output:**

| URL | Output |
| --- | --- |
| `output/line-out` | Line Out |
| `output/optical` | Optical |
| `output/coax` | Coaxial |
| `output/headphone` | Headphones |

**Bluetooth output** (sending audio *to* a Bluetooth speaker or DAC):

| URL | What it does |
| --- | --- |
| `output/bt-devices` | List paired Bluetooth sinks and their addresses |
| `output/bluetooth` | Connect to your paired sink (only if you have exactly one) |
| `output/bluetooth/<mac>` | Connect to a specific sink by address |

Bluetooth output is a **separate axis** from wired output. Connecting a Bluetooth sink routes audio to it *without* changing the wired setting — so it is normal and correct for the device to report "optical" while the sound is actually going out over Bluetooth. This is a WiiM behaviour, not a bug here.

If you have more than one paired sink, `output/bluetooth` will refuse and tell you the addresses to choose from. Run `output/bt-devices` first, pick the one you want, and use the full form.

**Not supported:** `output/dlna` and `output/audiocast` return an error. We haven't found a working command for that output axis, and we would rather return an honest error than a button that pretends to work.

### Presets

| URL | What it does |
| --- | --- |
| `preset/1` | Play preset 1 |
| `preset/6` | Play preset 6 |

Any positive number is accepted and passed to the device. Different WiiM models have different numbers of preset slots, so rather than guessing a limit we let the speaker reject slots it doesn't have. Presets are the ones you set in the WiiM Home app.

### Lights and display

| URL | What it does |
| --- | --- |
| `led/on` / `led/off` | Front panel LED |
| `display/on` / `display/off` | Screen — **WiiM Ultra only** |

The Pro and Pro Plus have no screen, so `display/*` does nothing on them.

### Status

| URL | What it does |
| --- | --- |
| `status` | Current player state as JSON |

This is the one route that returns JSON instead of `ok`. It's what the console polls. Useful if you're building something on top of this.

Note that `audio`, `service`, `quality`, and `albumArt` are always `null` here. Filling them requires a second call to the device, and this route deliberately makes only one. That's intentional, not a bug.

---

## Remote token

By default there is no password. If you want one — you're on a shared network, or you're just uncomfortable with the default — set `REMOTE_TOKEN` in your `.env` file:

```
REMOTE_TOKEN=some-long-random-string
```

Then restart:

```bash
docker compose up -d
```

Every request now needs that token, either as a query parameter or a header:

```
http://<your-server>:39447/api/remote/192.168.1.102/vol/up?token=some-long-random-string
```

The Sofabaton X1S (and most remotes with a URL field) will happily send the `?token=...` version, since it's just part of the address.

Two honest caveats:

- **This is not encryption.** The token travels in plain text over your LAN, and it will sit in your remote's configuration in the clear. It stops casual access on a shared network. It is not a defence against someone who is already capturing your network traffic.
- **It does not make this safe to expose to the internet.** Don't port-forward it regardless.

---

## Multiple devices

Nothing to configure. The WiiM's address is part of every URL, so one instance of this service handles every WiiM you own:

```
http://<your-server>:39447/api/remote/192.168.1.102/vol/up   ← living room
http://<your-server>:39447/api/remote/192.168.1.195/vol/up   ← office
```

One container, one port, as many speakers as you like.

---

## Setting up a Sofabaton X1S

The X1S is the device this was built for, but nothing here is specific to it — any remote that can fire an HTTP GET will work.

1. In the Sofabaton app, add a **Wi-Fi device**.
2. For each button you want, create an HTTP command and paste in the full URL from the console.
3. Test it. The speaker should respond immediately.

Some practical notes:

- **These are fire-and-forget.** The remote sends the request and doesn't tell you what came back. If a button does nothing, paste the same URL into a phone browser — you'll see the actual error there.
- **There is no power button, and there can't be.** WiiM exposes no HTTP command for power. This is a limitation of the device, not something that can be worked around here. Use `media/pause` as your "off" button.
- **Use `media/toggle`, not separate play and pause.** One button, and it always does the right thing.

---

## Troubleshooting

**A button does nothing, and nothing seems wrong.**
This is almost always the host machine being off or asleep. Check that first, every time. Second most likely: your WiiM's IP address changed — go back to [DHCP reservation](#set-up-your-wiims-address).

**The console loads on the server but not on my phone.**
The two machines need to be on the same network — check you're not on a guest Wi-Fi network or a VPN. Then check the address: `localhost` only works on the server itself; from your phone you need the server's LAN address.

If it still doesn't work, your firewall is likely blocking the port. On Windows, allow inbound TCP on port 39447 for **Private** networks (not Public).

**I'm running Docker inside WSL2 and my phone can't reach it.**
This is a developer setup and not the recommended path, but if you're here: WSL2 uses NAT by default, so Windows only forwards `localhost` into the VM and nothing listens on your LAN address. Add `networkingMode=mirrored` to the `[wsl2]` section of `C:\Users\<you>\.wslconfig` (merge into the existing section — a second `[wsl2]` header is silently ignored), then run `wsl --shutdown`. Requires Windows 11 22H2+ and WSL 2.0.0+. You'll also need the firewall rule above. Docker Desktop does not have this problem.

**`error: FORBIDDEN_HOST`**
The address in your URL isn't on a private network. This service only talks to LAN addresses.

**A command returns an error but the device works fine in the app.**
Not every WiiM supports every command. `display/*` is Ultra-only; inputs your model doesn't have will fail. If you think something should work, open an issue with your model and firmware version.

---

## For people coming from wiim_proxy

If you've used [keithmuller/wiim_proxy](https://github.com/keithmuller/wiim_proxy), most of the URL vocabulary here will be familiar — that was deliberate, so existing buttons mostly port over.

**Most, not all. Seek is different.** wiim_proxy uses `/media/seekfow` and `/media/seekback` with no argument. This uses `/media/seek/+30`, `/media/seek/-10`, or `/media/seek/90`. Different path shape, so old seek URLs will return a 404 here. You'll need to rewrite those two buttons. The version here takes an argument and can seek to an absolute position, which is why it wasn't matched exactly.

**There is no raw command passthrough.** wiim_proxy lets you send arbitrary LinkPlay commands. This doesn't — the vocabulary is closed on purpose, since with no password by default an arbitrary-command endpoint is a much bigger blast radius than a fixed list of volume and transport commands.

**One server handles all your devices.** No need to run a separate instance per speaker.

---

## What this is built on

Next.js on Node 22, three runtime dependencies, no database, no login, no state. The container is stateless — delete and recreate it freely, there is nothing to back up.

It talks to your WiiM over the LinkPlay local HTTP API (`https://<ip>/httpapi.asp?command=...`). Some of those commands are documented by WiiM; some are community-discovered and verified against real hardware. Where a command is unverified it's marked as such in the source rather than presented as fact.

Originally forked from a self-hosted WiiM dashboard, then stripped down to the headless service you see here.

## Contributing

Issues and pull requests welcome — particularly:

- Confirmation of commands on models we don't have (we test on a WiiM Ultra and a WiiM Pro)
- A working command for DLNA / Audiocast output
- Reports from other universal remotes

If you're reporting a command that doesn't work, include your model and firmware version.

## License

MIT. See [LICENSE](LICENSE).
