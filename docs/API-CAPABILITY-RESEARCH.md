# API Capability Research — new functionality beyond the current app

Research into LinkPlay/WiiM HTTP API capabilities not yet implemented in this app
(`src/lib/wiim/`). Scope, per the maintainer's brief: multiroom/group sync, home
music shares / NAS, and third-party service control.

**Method.** Read the two reference open-source libraries line-by-line —
[`python-linkplay`](https://github.com/Velleman/python-linkplay)
(`src/linkplay/consts.py`) and
[`pywiim`](https://github.com/mjcumming/pywiim) (`pywiim/api/`) — plus the
official *HTTP API for WiiM Products* PDF
(`https://www.wiimhome.com/pdf/HTTP API for WiiM Products.pdf`) and the
community OpenAPI notes referenced by both projects
(`https://github.com/n4archive/LinkPlayAPI`). The app's maintainer has no test
device available to this work, so every command string below that does **not**
already appear in `src/lib/wiim/constants.ts` is flagged inline as
**needs testing** (i.e. verified in a source library but not yet confirmed on the
target WiiM firmware by this project). No command name is invented; all are
quoted verbatim from one of the sources above.

---

## Multiroom / group sync

This is the richest unimplemented area. Two independent libraries agree on a
`multiroom:` command family and a `ConnectMasterAp:` join command, and pywiim
additionally documents per-slave volume/mute targeting. None of these strings
are present in `constants.ts`.

**Group membership / topology.**

| Purpose | Command | Source | Status |
|---|---|---|---|
| List slaves on the master | `multiroom:getSlaveList` | python-linkplay `consts.py` (`MULTIROOM_LIST`), pywiim `api/constants.py` (`API_ENDPOINT_GROUP_SLAVES`) | **needs testing** on target fw |
| Disband / leave group (slave-side) | `multiroom:Ungroup` (capital U) — pywiim `api/group.py` `disband()`; python-linkplay uses lowercase `multiroom:ungroup` | pywiim `api/constants.py` + `group.py`; python-linkplay `consts.py` | **needs testing** — case differs between libs, try both |
| Kick one slave (master-side) | `multiroom:SlaveKickout:<ip>` | python-linkplay (`MULTIROOM_KICK`), pywiim (`API_ENDPOINT_GROUP_KICK`) | **needs testing** |
| Join a master (modern, router-based) | `ConnectMasterAp:JoinGroupMaster:eth<ip>:wifi0.0.0.0` | python-linkplay (`MULTIROOM_JOIN`), pywiim `api/group.py` `join_slave()` | **needs testing** |
| Join a master (legacy Gen1, WiFi Direct, fw < 4.2.8020) | `ConnectMasterAp:ssid=<hex>:ch=<n>:auth=OPEN:encry=NONE:pwd=:chext=0` | pywiim `api/group.py` `join_slave()` (SSID hex-encoded) | **needs testing**, legacy only |

**`multiroom:getSlaveList` response shape** (from pywiim `api/group.py`
`get_slaves()` / `get_slaves_info()` and python-linkplay `MultiroomAttribute`
enum): a JSON object with `slaves` (integer count), `slave_list` (array of
objects each carrying `ip` and `uuid`), and `wmrm_version`. pywiim also reads a
`multiroom` section straight out of `getStatusEx` containing `master` (the
master's IP) plus the same `slaves`/`slave_list` — so group membership can be
polled without a second round-trip. The `master` field is the recommended way
to tell whether the queried device is a slave (`master` is set and != own IP)
vs. solo/`master`.

**Group-wide volume / mute.** Two distinct command families exist:

1. *Whole-group* (sets every slave at once), from python-linkplay `consts.py`:
   - `setPlayerCmd:slave_vol:<n>` — **needs testing**
   - `setPlayerCmd:slave_mute:mute` / `setPlayerCmd:slave_mute:unmute` — **needs testing**
2. *Per-slave* (target one slave by IP), from pywiim `api/constants.py`:
   - `multiroom:SlaveVolume:<ip>:<n>` (`API_ENDPOINT_GROUP_SLAVE_VOLUME`) — **needs testing**
   - `multiroom:SlaveMute:<ip>:<0|1>` (`API_ENDPOINT_GROUP_SLAVE_MUTE`) — **needs testing**

pywiim's `Group` class (`pywiim/group.py`) implements group volume/mute in
*software* — group volume = `MAX` of all member volumes, group mute = `ALL`
muted — because the device-side slave commands are broadcast-style and the
library wanted per-member sliders. That mirrors what a dashboard would want:
read each member's `getPlayerStatusEx` `vol`/`mute`, aggregate, and write back
with either `slave_vol` (broadcast) or `SlaveVolume:<ip>` (targeted).

**Transport on a group.** pywiim's `Group.play()/pause()/stop()/next_track()`
all simply call the equivalent `setPlayerCmd` on the *master*; the LinkPlay
firmware syncs the slaves. So the transport commands this app already
implements (`setPlayerCmd:resume`, `:pause`, `:next`, …) work as group
controls *if* issued to the master — no new command needed, just routing.

Also note: `getStatusEx` advertises `wmrm_version` (multiroom protocol
generation) and pywiim uses `group`/`master_uuid`/`master_ip` fields on
`getStatusEx`/`getDeviceInfo` for role detection — neither field is read by this
app today.

---

## Home music shares / NAS

**Finding: there is no dedicated SMB/NAS or UPnP/DLNA media-server *browse*
command in any source consulted.** This is a real gap, not an oversight — the
LinkPlay HTTP API has no `browseNAS` / `browseMediaServer` equivalent.

What *does* exist, none of it a true NAS browser:

1. **Generic URL playback** (already half-implemented conceptually, but the
   command strings themselves are not in `constants.ts`):
   - `setPlayerCmd:play:<url>` — confirmed in the official WiiM PDF (the
     `setPlayerCmd:play:uri` example) and pywiim (`API_ENDPOINT_PLAY_URL`).
     Plays any HTTP/stream URL, so a network share exposed over HTTP can be
     played by URL — but there is no directory listing.
   - `setPlayerCmd:playlist:<url>` — pywiim `API_ENDPOINT_PLAY_M3U`; **needs testing**
   - `setPlayerCmd:m3u:play:<url>` — python-linkplay (`M3U_PLAYLIST`); **needs testing**

2. **Lyrion Music Server (LMS) / Squeezelite** — this is the closest thing to a
   "home music server" integration. pywiim ships a whole `pywiim/api/lms.py`
   mixin (`LMSAPI`) and `Squeezelite:` command family in `api/constants.py`,
   marked there as "unofficial and may not be available on all firmware
   versions or device models":
   - `Squeezelite:getState` → `{ default_server, state, discover_list, connected_server, auto_connect }` — **needs testing**
   - `Squeezelite:discover` — trigger LMS discovery on the LAN — **needs testing**
   - `Squeezelite:autoConnectEnable:<0|1>` — **needs testing**
   - `Squeezelite:connectServer:<addr>` (e.g. `192.168.1.4:3483`) — **needs testing**
   pywiim also maps playback `mode` `34` → `"lyrion"` (LMS) in its `MODE_MAP`
   with a reference to issue `mjcumming/wiim#188`. This app's `constants.ts`
   has no `34` entry, so an LMS stream would currently fall through to "Idle"
   or "Network". **Important caveat:** these endpoints only *manage the
   connection* to an LMS server; browsing the LMS library still happens
   through Lyrion's own JSON/CLI protocol on port 3483, not over `httpapi.asp`.

3. **Local USB / MicroSD** (not network shares): commands like `getLocalPlayList`,
   `getFileInfo:index:range`, `setPlayerCmd:playLocalList:index` appear in the
   community OpenAPI notes (`n4archive/LinkPlayAPI`) but only address
   USB/SD-attached storage, **not** network shares — **needs testing**, and not
   a NAS feature.

4. **DLNA / UPnP**: mode `2` (already in this app) is a *receive* (push) mode —
   another device pushes to the WiiM. There is no `httpapi.asp` command to
   browse a UPnP ContentDirectory / media server; that would have to go through
   UPnP SOAP, a separate protocol stack.

**Net:** the only genuinely new, API-native "home music" surface is the
`Squeezelite:` LMS connection manager. For SMB/NAS browsing specifically, the
API offers nothing — the realistic path is generic `setPlayerCmd:play:<url>`
pointed at an HTTP-exposed share.

---

## Third-party music service integration

**Finding: no library-browsing commands for Spotify/TIDAL/Qobuz/etc. exist in
any source.** The streaming services operate via *Connect* (Spotify Connect,
TIDAL Connect, Qobuz Connect) — the WiiM is a passive receiver, and all
library navigation happens in the service's own app/cloud API. The WiiM HTTP
API exposes only mode-switching plus transport forwarding.

What *is* available, beyond the mode-detection this app already does:

1. **Switching *into* a Connect session** (from python-linkplay `consts.py`
   `PLAY_MODE_SEND_MAP`): `setPlayerCmd:switchmode:Spotify`,
   `setPlayerCmd:switchmode:Tidal`, `setPlayerCmd:switchmode:Qobuz` — **needs
   testing** on current WiiM firmware (this app's `constants.ts` `SOURCES`
   list contains only hardware inputs, not these service modes, so they'd be
   net-new). The argument is case-sensitive per the map.

2. **Transport forwarding**: pywiim classifies Spotify/TIDAL/Qobuz as
   "FULL_CONTROL" services, meaning play/pause/next/prev/seek issued via
   `setPlayerCmd` are forwarded to the active Connect session — but this is
   exactly the transport set this app already implements, so when `mode` is
   `31/32/36` the existing commands already work as service transport. No new
   command.

3. **No favourite/love/thumbs-up** for the current track — already documented
   in `docs/WIIM-API.md` ("Not available in the HTTP API"). Reconfirmed:
   neither python-linkplay nor pywiim exposes such a command. The WiiM app's
   heart calls each service's cloud API directly, which a local server cannot
   reach; this app already substitutes Last.fm `track.love`.

**Net:** beyond mode detection there is nothing to control a service's
*library* — only `switchmode:<Service>` to enter a Connect session (useful as
a one-tap "open Spotify on the WiiM") plus the already-implemented transport
forwarding.

---

## Fixed-volume-output toggle (2026-07-13, unresearched)

`getStatusEx` reports a `volume_control` field (`"0"`/`"1"`, confirmed present
on both a WiiM Pro and WiiM Ultra, real hardware) — this is almost certainly
the same setting as the WiiM app's per-device "Fixed Volume" toggle (locks the
line-out level, ignoring any volume/group-volume command while enabled; a user
disabled it manually via the WiiM app during multiroom testing so group
volume could be verified, since it silently no-ops all volume commands like
line-out gear typically does).

**No setter command found for this yet** — unlike the rest of this document,
this entry has **no source-library reference** (not in python-linkplay,
pywiim, the official PDF, or the community OpenAPI notes consulted so far).
It's plausibly named something like `setPlayerCmd:volumeControl:<0|1>` by
analogy with other `setPlayerCmd:` toggles, but that's an unverified guess,
not a confirmed command — **do not send it to real hardware without
testing**, same rule as everything else in this doc.

**Why it'd be worth adding**: a dashboard toggle for this would let a user
switch a unit in/out of "line-out to an external amp" mode without opening
the WiiM app — a natural companion to this app's existing volume/EQ/sub-out
controls, and directly relevant to multiroom (a slave with fixed-volume
output can't have its volume set via group volume at all, silently).

**Suggested next step to actually find the command**: capture the WiiM app's
own network traffic (proxy/mitm) while toggling this setting, since no
existing open-source reference documents it — the same class of gap as the
NAS-browsing finding below, but narrower and plausibly a single new command
once found.

## Recommendation

Ranking the three areas by (a) evidence solidity and (b) user value:

1. **Multiroom / group sync — build this next.** Evidence is the strongest:
   two independent, actively-maintained libraries (python-linkplay, pywiim)
   agree on the `multiroom:` / `ConnectMasterAp:` / `setPlayerCmd:slave_vol`
   command set and the `getStatusEx` `multiroom` + `slave_list` response
   shape. User value is high: group volume, join/leave, and "play on master →
   all slaves follow" are headline WiiM features a dashboard conspicuously
   lacks. The work is well-scoped — a `multiroom` command group in
   `constants.ts` mirroring the table above, a group-role parser reading
   `multiroom.master`/`slave_list` from `getStatusEx`, and broadcast volume via
   `setPlayerCmd:slave_vol`. Only caveat to test: the `Ungroup` vs `ungroup`
   case discrepancy between the two libraries.

2. **Third-party service integration — decided against, 2026-07-13 (was "worth
   a small follow-up," reversed after discussion).** Spotify/TIDAL/Qobuz all
   use a *Connect* protocol, where the phone/computer app is always the
   control point and the speaker is a passive target — this is a protocol
   ceiling, not a scoping choice: no local API (WiiM's official app included)
   can add playlist/favorites browsing for these, ever. The only buildable
   piece was a one-tap `switchmode:<Service>` button to prime the device for a
   Connect handoff, and its actual usefulness is unverified (may do nothing
   without the service's own app already trying to connect) — not worth
   building for that little confirmed value, especially since the maintainer
   already rejects "replicate what the mobile app does" as a goal in general
   (see `SOURCE-OF-TRUTH.md`'s desktop-only rationale). Left as a
   maybe-someday item — revisit only if real user feedback asks for it
   specifically. **Separately unresearched**: WiiM/LinkPlay firmware directly
   integrates some *other* services (TuneIn, and model-dependent ones like
   Amazon Music/Deezer/vTuner) rather than via Connect — these might have a
   real browse API, architecturally unlike Spotify/TIDAL/Qobuz, but this was
   never investigated (out of this document's original scope) and would need
   fresh research before any commitment.

3. **Home music shares / NAS — do not pursue as an API feature.** Evidence is
   *negative*: no source exposes an SMB/UPnP-media-server browse command. The
   only API-native path is the `Squeezelite:` LMS connection manager (pywiim
   only, marked unofficial), which is niche and still requires Lyrion's own
   protocol to browse. The realistic "play from a share" story is generic
   `setPlayerCmd:play:<url>` against an HTTP-exposed path — already trivial to
   add but not a browse experience. Recommend closing this area with a note in
   `WIIM-API.md` rather than building UI for it.

**Suggested next step:** implement multiroom (read `multiroom` from
`getStatusEx`, add `multiroom:getSlaveList` / `multiroom:Ungroup` /
`setPlayerCmd:slave_vol:<n>` / `ConnectMasterAp:JoinGroupMaster:eth<ip>:wifi0.0.0.0`
to `constants.ts`, all flagged needs-testing until confirmed on device), and
in parallel add `mode 34 → Lyrion/LMS` to `PLAYING_MODE_LABEL` so LMS
streams are no longer mislabelled.
