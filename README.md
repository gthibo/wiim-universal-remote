# WiiM Universal Remote

**An HTTP control surface that lets a universal remote drive [WiiM](https://www.wiimhome.com/) / LinkPlay audio devices.**

Turns a WiiM device's control API into clean, remote-friendly HTTP URLs. Point a universal remote's "Wi-Fi / IP command" feature at them and each button press controls the WiiM directly over your LAN -- no cloud, no account, no IR blaster.

One of the biggest gaps for WiiM owners is the lack of an official way to drive the device from a third-party universal remote. This fills that gap.

> **Status: early.** The command surface (media, volume, mute, input, output including Bluetooth, presets) is built and runs against real hardware. A few endpoints are still to come -- see [Status & roadmap](#status--roadmap).

---

## Compatibility

**Built and tested specifically for the [Sofabaton X1S](https://www.sofabaton.com/) universal remote** (and its sibling, the X1). The X1S has a built-in "Wi-Fi virtual device / IP command" feature that lets you map physical buttons to HTTP URLs with **no programming** -- you paste a URL per button in the Sofabaton app and it works.

Because this service speaks plain HTTP GET, *anything* that can send an HTTP request can drive it -- Home Assistant, a Crestron/Control4 driver, a Stream Deck, a shell script with `curl`, etc. But among **consumer hardware universal remotes** -- the kind you buy to replace a pile of remotes -- the Sofabaton X1S/X1 is the only one we're currently aware of with the built-in HTTP-command feature needed to use this without writing code.

Other remotes with a similar feature could be added to this list as they're confirmed. **If you're buying a remote specifically to control your WiiM this way, the Sofabaton X1S is the one to get.**

---

## Acknowledgements

The URL vocabulary here is deliberately compatible with [keithmuller/wiim_proxy](https://github.com/keithmuller/wiim_proxy), a Python http proxy that pioneered this approach for the Sofabaton X1S. If you already set up that proxy, your remote's button URLs should work here with only the host/port changed.

The Bluetooth-output and extended-command research draws on [DanBrezeanu/wiim-extended-http-api](https://github.com/DanBrezeanu/wiim-extended-http-api), which documents many undocumented WiiM HTTP commands.

This project began as a fork of a self-hosted WiiM dashboard and reuses its TypeScript WiiM client. What it adds: a single service that controls **multiple** devices, a Docker-first install, and a remote-focused HTTP surface.

---

## How it works

```
  [Universal remote] --HTTP GET-->  [wiim-remote]  --LinkPlay API-->  [WiiM device]
   (Sofabaton X1S)                 (this service)                (on your LAN)
```

The remote's "Wi-Fi virtual device" is configured so each button sends one HTTP URL. This service receives that URL, translates it into the WiiM LinkPlay command, and returns `ok`.

---

## Quick start (Docker)

```bash
docker compose up -d --build
```

The service comes up on port `39447` by default. Then point any browser (or your remote) at a command URL:

```
http://<host>:39447/api/remote/<device>/media/toggle
```

`<device>` is either a stored device ID or -- most simply -- the device's LAN IP directly. For example, for a WiiM Ultra at `192.168.1.102`:

```
http://<host>:39447/api/remote/192.168.1.102/vol/++
```

---

## Command reference

All commands are HTTP `GET` under `/api/remote/<device>/`. Each returns the plain string `ok` on success.

### Media

| URL | Action |
| --- | --- |
| `/media/play` | Play / resume |
| `/media/pause` | Pause |
| `/media/resume` | Resume (alias of play) |
| `/media/toggle` | Play/pause toggle |
| `/media/stop` | Stop |
| `/media/prev` | Previous track |
| `/media/next` | Next track |

### Volume

| URL | Action |
| --- | --- |
| `/vol/<N>` | Set volume to N (0-100) |
| `/vol/up` | Up by 1 |
| `/vol/up/<N>` | Up by N |
| `/vol/down` | Down by 1 |
| `/vol/down/<N>` | Down by N |
| `/vol/++` | Up by 1 (alias) |
| `/vol/--` | Down by 1 (alias) |

Relative and increment forms read the current volume first, then set.

### Mute

| URL | Action |
| --- | --- |
| `/mute/on` | Mute |
| `/mute/off` | Unmute |
| `/mute/toggle` | Toggle mute |

### Input (source)

`/input/<source>` -- accepts any WiiM source key or switchmode value. Common ones: `wifi`, `line-in`, `optical`, `co-axial`, `HDMI`, `phono`, `bluetooth`, `PCUSB`. Case-insensitive; punctuation ignored.

`/input/next-input` is recognised but not yet implemented (returns 501).

### Output

The WiiM has **three independent output axes** -- this service handles all of them correctly:

**Wired hardware outputs** (`/output/<target>`):

| Target | Status |
| --- | --- |
| `line-out` | Confirmed |
| `optical` | Confirmed |
| `coax` / `coaxial` | Confirmed |
| `headphone` | Confirmed |

**Bluetooth output** -- a separate axis from the wired outputs. Connecting a BT sink routes audio to it without changing the wired hardware mode. Verified on a WiiM Ultra + Topping D70 Pro.

| URL | Action |
| --- | --- |
| `/output/bt-devices` | List paired BT sinks with their MAC addresses |
| `/output/bluetooth` | Connect the sole paired sink (simplest remote button) |
| `/output/bluetooth/<mac>` | Connect a specific sink by MAC address |

If you have multiple paired sinks, `/output/bluetooth` returns a 409 listing them so you can use the explicit `/<mac>` form.

**DLNA / Audiocast output** -- a third output axis. No confirmed API command exists at this time; returns 501.

### Presets

`/preset/<N>` -- plays preset slot N (1 and up; the device rejects slots it doesn't have).

---

## Multiple devices

Unlike a one-device-per-process proxy, one `wiim-remote` instance controls any number of devices. The device is chosen by the `<device>` segment in the URL, so your remote can drive different WiiM units from different buttons:

```
http://<host>:39447/api/remote/192.168.1.102/vol/++  # living room
http://<host>:39447/api/remote/192.168.1.195/vol/++  # kitchen
```

---

## Security model

This service is designed for a **trusted home LAN behind a firewall.** A hardware remote cannot log in or send CSRF tokens, so the command endpoints are open on the LAN by default -- the same trust model as the WiiM device itself, which accepts commands from any LAN caller.

**Do not expose this service to the public internet.**

**Optional token.** Set `REMOTE_TOKEN` in the environment to require a shared token on every request. When set, each command URL must include `?token=<value>` (or an `X-Remote-Token` header). When unset, the service runs open on the LAN.

```
http://<host>:39447/api/remote/192.168.1.102/media/toggle?token=your-secret
```

---

## Responses

| Code | Meaning |
| --- | --- |
| `200` `ok` | Command accepted |
| `404` | Unknown command word, or unknown device |
| `501` | Known command, not yet implemented/confirmed |
| `502 / 504` | Device unreachable or timed out |

---

## Status & roadmap

**Working and verified against real hardware:** media, volume (all forms), mute, input switching, all four wired hardware outputs, Bluetooth output (via BT sink pairing), and presets.

**Not yet built:**

- `output/dlna` -- Audiocast/DLNA is a third output axis distinct from both wired and BT output. No confirmed API command exists yet.
- `led/on`, `led/off`, `display/on`, `display/off` -- command string confirmed (`LED_SWITCH_SET:0/1`) via community research; route not yet built.
- `media/seekfow`, `media/seekback` -- relative seek.
- `input/next-input` -- cycle to the next enabled input.

**Power button:** WiiM does not yet expose an HTTP API for the remote power button, so it cannot be implemented by this or any similar proxy at this time.

---

## License

MIT -- see [LICENSE](LICENSE). Portions derive from the MIT-licensed WiiM Dashboard project.
