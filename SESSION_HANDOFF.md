# SESSION HANDOFF -- WiiM Universal Remote

This document is the cold-start brief for the **WiiM Universal Remote** project. It was split out of the Wiim-Dashboard project and now lives on its own.

---

## What this is

A headless HTTP control surface that lets a universal remote (target: **Sofabaton X1S**) drive WiiM / LinkPlay audio devices over the LAN via plain GET URLs. It translates remote-friendly URLs (e.g. `/api/remote/192.168.1.102/vol/++`) into WiiM LinkPlay commands.

**Goal:** a community-offerable standalone service. The biggest WiiM community pain-point it solves: no official way to control a WiiM with a third-party universal remote.

**Origin:** forked from the self-hosted WiiM dashboard (`gthibo/Wiim-Dashboard`, itself a fork of `illianoaoi/Wiim-Dashboard`). Reuses the dashboard's TypeScript WiiM client (`src/lib/wiim/`) verbatim.

---

## Repo & location

- **GitHub:** `https://github.com/gthibo/wiim-universal-remote` (public, clean history, single initial commit `9c9ce6`-region)
- **Local path:** `C:\Users\mrthi\Documents\WIIM\Wiim-Remote`
- **Branch:** `main`, tracking `origin`
- **License:** MIT (Greg Thibodeaux + preserved upstream illiano notice)

The local folder is still a **full fork** -- it contains the entire dashboard (Showa UI, `_showa/` tree, all components, `unraid/`, `proxmox/`, `launch-dashboard.ps1`, etc.). Only the remote-proxy pieces are new. Stripping to a headless service is an open task (see below).

---

## What's built (all verified against real hardware)

All routes are GET under `/api/remote/[deviceId]/`. `[deviceId]` resolves as either a stored device UUID *or* a bare LAN IP (preferred; no DB entry needed). All return plain `ok` on success (Keith-compatible).

| Route | Vocabulary | Calls (data layer) |
| --- | --- | --- |
| `media/[action]` | play\|pause\|resume\|toggle\|stop\|prev\|next | `control()` |
| `vol/[...op]` | N\|up\|down\|up/N\|down/N\|++\|-- | `fetchPlayerStatus()` then `control("volume")` |
| `mute/[state]` | on\|off\|toggle | `control()` (toggle reads `.muted`) |
| `input/[source]` | any SOURCES key/value | `switchSource()` |
| `output/[...target]` | see below | `setOutput()` / `connectBtSink()` |
| `preset/[num]` | 1..N | `playPreset()` |

**Output (the interesting one -- WiiM has THREE independent output axes):**
- `output/line-out|optical|coax|headphone` --> wired hardware mode (setAudioOutputHardwareMode ids 2/1/3/4). CONFIRMED.
- `output/bt-devices` --> lists paired BT sinks + MACs.
- `output/bluetooth` --> connects the SOLE paired sink (simple remote button). CONFIRMED -- actually connected the Topping.
- `output/bluetooth/<mac>` --> connects a specific sink by MAC.
- `output/dlna` --> third axis (Audiocast/DLNA). NOT implemented; returns 501. No confirmed command exists.

**BT-out mechanism (important -- it's not a hardware-mode id):** BT output is a SEPARATE axis from setAudioOutputHardwareMode. You connect a specific A2DP sink by MAC and output follows. Confirmed on the Ultra: `getbthistory` lists paired devices (filter `role=="Audio Sink"`), `connectbta2dpsynk:<mac>` switches output to it (returns `OK`). This is why the dashboard can read output="optical" while BT audio plays -- two independent axes.

**Still accepted but not implemented:** `input/next-input` -> 501 (needs source enumeration logic).

---

## Data-layer additions (this session)

Two src-only edits to the shared WiiM client (no `_showa/` mirror -- data-layer files are src-only):

1. `src/lib/wiim/constants.ts` -- added BT command builders to the `Cmd` object: `btHistory`, `btPairStatus`, `btConnect(mac)`, `btDisconnect(mac)`, `btDiscover(seconds)`, `btDiscoverResult`.
2. `src/lib/wiim/commands.ts` -- added `BtSink` interface, `fetchBtSinks(ip)` (filters to Audio Sink role), `connectBtSink(ip, mac)`.

Earlier this session: `src/lib/api.ts` got a `UNKNOWN_DEVICE -> 404` case in `deviceErrorStatus()`.

New files (src-only, no mirror): `src/lib/remote/{auth,respond,resolve}.ts` + the six route groups under `src/app/api/remote/[deviceId]/`.

---

## Key design decisions

- **LAN-trust auth, not session/CSRF.** The X1S can't log in or send CSRF tokens, so remote routes bypass the dashboard's `guard()`. `src/lib/remote/auth.ts` is open-by-default; set `REMOTE_TOKEN` to require `?token=` or `X-Remote-Token` header. This is the main reason we built in a fork, not the live dashboard.
- **Multi-device native.** `resolveHost()` takes UUID or bare IP. This kills Keith's "one server per device" limitation by construction.
- **Keith-compatible URL vocabulary.** Drop-in with keithmuller/wiim_proxy where sensible, extended where we can do better (BT-out, multi-device).
- **Fire-and-forget `ok` responses.** The X1S contract is button->single-GET (confirmed from the Sofabaton app screenshot). Response body almost certainly ignored. `src/lib/remote/respond.ts` is the single choke point if stateful responses ever prove useful.

---

## Hardware / environment

- **WiiM Ultra** at `192.168.1.102` -- has sub-out, currently BT-out to a Topping D70 Pro OCTO.
- **Second device** at `192.168.1.195` -- no sub-out.
- **Topping D70 Pro OCTO BT sink MAC:** `53:4a:52:fe:03:c1` (Pixel 8 Pro at `d4:3a:2c:58:d1:ad` is an Audio Source, NOT a valid output target).
- **Container:** `wiim-remote` on port `39447`, volume `wiim-remote-data`. Fully isolated from the live dashboard (`wiim-dashboard`, port `39446`). Both can run at once.
- **DB:** this container's device DB is FRESH/empty -- but addressing by bare IP in the URL needs no DB entry, so this doesn't matter in practice.

---

## Operational patterns (transferred from the dashboard project)

- Docker rebuild required for all source changes: `docker compose up -d --build`. `restart` does NOT rebuild. Long builds time out through MCP tools -- Greg runs them directly in WSL.
- `Filesystem:create_file` silently no-ops. Write via `Windows-MCP:PowerShell` (`Set-Content` or `[IO.File]::WriteAllBytes` with base64 for TS) or `Filesystem:write_file`.
- `Filesystem:edit_file` edits existing files: always `dryRun:true` first, review diff, then `dryRun:false`. Grep-verify on disk after (new string present, old absent).
- WSL2 localhost port forwarding can lag 30-60s after container start -- false "site unreachable" resolves itself.
- `wsl -d Ubuntu -u root` for passwordless root in MCP commands (no TTY for sudo).
- Direct device probing: `Invoke-WebRequest -SkipCertificateCheck -UseBasicParsing "https://<ip>/httpapi.asp?command=<cmd>"` -- how we verified BT commands this session.
- Git auth through WSL failed; use Windows PowerShell (Windows credential manager) for git push/pull.

---

## Open work / roadmap

**Near-term code:**
- `led/on`, `led/off` -- command string CONFIRMED: `LED_SWITCH_SET:0/1` (from DanBrezeanu/wiim-extended-http-api). Route not yet built. Small. (`display/on/off` likely similar -- confirm.)
- `media/seek` (Keith's seekfow/seekback) -- same read-then-set pattern as relative volume. Small.
- `input/next-input` -- cycle enabled inputs (needs enumeration).
- `output/dlna` -- unknown mechanism, not a quick fill-in.

**Bigger:**
- **Strip to headless.** The repo still carries the whole dashboard. A standalone service wants just `src/lib/wiim/` + `src/lib/remote/` + `src/app/api/remote/` + supporting lib/DB/auth plumbing + Docker files. Needs careful dependency tracing (the remote routes use `guard()`'s sibling `api.ts`, `db/devices.ts`, client TLS/SSRF plumbing, etc.). Likely the new project's first big task.
- **Second device optional per-button addressing** already works via bare IP in URL.

**Known impossible:** power button -- WiiM exposes no HTTP API for it yet.

**Extended-API research source:** `DanBrezeanu/wiim-extended-http-api` documents many undocumented commands (BT, channel balance, SPDIF latency, LED, touch controls, Squeezelite/LMS). Good mine for future tooling.

---

## When the X1S arrives

Everything in "what's built" is ready. Point the X1S Wi-Fi virtual device's button URLs at `http://<host>:39447/api/remote/192.168.1.102/...`. The only genuinely untested thing left is what the X1S does with a non-ok response -- but fire-and-forget is the safe assumption.

---

## Person

Greg (`user.name: Greg T`, `me@gregthibodeaux.com`). Highly methodical: scope confirmed before code, dry-run before apply, verify on disk, doesn't want state-changing commands sent to hardware without asking. Prefers honest "we don't know yet" over plausible guesses.
