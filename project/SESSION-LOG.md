# Session Log

Dated entries, newest first. Purpose: let a fresh session (or a fresh person) pick up cleanly without re-deriving context or re-discovering the same problems. Keep entries factual and scoped to what happened + what's pending — design rationale belongs in `SOURCE-OF-TRUTH.md`, environment footguns belong in `GOTCHAS.md`.

---

## 2026-07-13 — Multiroom slave "Nothing Playing" bug: master-mirroring fix implemented and live-verified

**Context:** continuation of the same-day investigation below, picked up in a fresh session per the deliberate handoff. The Spotify-sourced-master case (slave's `curpos` frozen, no advancing signal at all) was the one gap the position-delta workaround couldn't cover by construction.

**Fix implemented in `snapshot.ts`:** replaced the slave-role branch of the vendor-push heuristic with direct master-mirroring, exactly as designed in the previous entry. For a confirmed slave (`info.multiroomRole === "slave"` with `info.multiroomMasterIp` set), the poll now fetches the master's own `getPlayerStatusEx` directly and substitutes it for the slave's own player object verbatim — except `volume`/`muted`, which stay the slave's own (genuinely per-device, not something a master mirrors). On master-fetch failure (transient unreachability), falls back to the slave's own status rather than erroring. The meta/quality lookup and the vendor-push heuristic below it were both changed to key off `metaIp` (the master's ip once mirroring succeeds, the device's own ip otherwise) instead of `device.ip`/`device.id`, so a master and every slave mirroring it agree on the same playing/stopped judgement instead of drifting independently. The vendor-push heuristic itself was simplified back to its original condition (`player.vendor && sourceMode === "99"`) — the `|| info?.multiroomRole === "slave"` special-case from the partial fix is no longer needed, since mirroring now supplies the master's own honest state directly for every source, not just the ones with an advancing local signal.

**Verified live** (Docker image rebuilt from source, local container at `127.0.0.1:39446` restarted onto it, tested logged in as the user): with Living Room WiiM Ultra as master playing Spotify Connect and Bedroom WIIM Pro joined as slave, the Bedroom device's Now Playing card correctly showed the master's actual track ("The Runner" — Vetle Nærø), with position visibly advancing across polls (2:46 → 2:58 → 3:18 → 3:25) — the exact case that previously showed "Nothing Playing." Also watched it through a live track change (master and slave both transitioned to "La" — Nils Frahm, master 1:57 → slave 2:50/2:53, in sync) confirming the mirroring re-fetches correctly on every poll rather than caching stale metadata. `tsc --noEmit` and `eslint . --max-warnings=0` both clean.

**Not separately re-verified this session** (unchanged code paths, already covered by the previous entry's live tests): CustomRadio- and Plex-sourced masters. The `metaIp`-keyed vendorTransport map is a mechanical rename of the same logic already proven for those cases, not a behavior change for the non-slave (standalone Plex/DLNA cast) path.

**Status:** implemented, live-verified for the Spotify case that was the whole reason this was deferred to a fresh session. Committed (`2092e09`) and pushed.

**Follow-up bug found immediately after, same session:** user reported album art missing on the mirrored slave. Root cause: `src/app/api/devices/[id]/art/route.ts` is a separate endpoint hit directly by the `<img>` tag — it never sees `snapshot.ts`'s in-memory mirrored player, and was independently re-deriving art from the slave's own host via its own `fetchMetaInfo` call. Fixed the same way: the route now calls `fetchDeviceInfo` on the requested device, and if it's a confirmed slave, fetches meta/art from `multiroomMasterIp` instead, passing that same host to `wiimFetchRaw`'s SSRF `deviceHost` check (the private-IP art fetch must match whichever host the art URL actually belongs to). Falls back to the device's own host if the device-info lookup fails or it isn't a slave. Live-verified: Bedroom WIIM slave now shows the same cover art as the Living Room Ultra master (FKJ — "Skyline"). `tsc`/`eslint` both clean.

**Also noted:** while testing the device-switcher dropdown, one browser click landed on a preset card instead due to a coordinate/layout mismatch, triggering the app's optimistic preset-highlight UI state on a *slave* device. No actual effect on real playback occurred (Spotify Connect kept playing uninterrupted, the group's "Following: WiiM Ultra" state was unaffected) — WiiM firmware appears to silently ignore/reject source-changing commands sent to a device while it's a multiroom follower. Not investigated further since nothing broke, but worth knowing this is the actual real-world behavior if it comes up again.

---

## 2026-07-13 — Multiroom slave "Nothing Playing" bug: investigated, partial fix committed, full fix designed but not implemented

**Context:** after the preset-highlight fixes (previous entry), user reported a new symptom while testing multiroom: activate a preset on one device, switch to the other (now a slave in the group), and the Now Playing card says "Nothing Playing" even though audio is genuinely playing in both rooms.

**Root cause, confirmed by direct hardware polling across three source types:** a multiroom slave always reports `mode: 99` with a permanently-stuck `status: "stop"` — never changes, confirmed by pausing the master and re-checking (slave's status was identical paused vs. playing). The app already has a workaround for this exact shape of problem (`vendorTransport` in `snapshot.ts`, built for direct Plex/DLNA casts): compare `curpos` across polls, since `status` is useless — but its trigger condition required a populated `vendor` field, which turned out to be unreliable across sources:
- **CustomRadio-sourced master:** slave's `vendor` reads `"CustomRadio"` (populated) and `curpos` genuinely advances. Existing mechanism already worked here.
- **Plex-sourced master:** slave's `vendor` comes back **empty**, so the existing mechanism never triggered at all, even though curpos genuinely advances. **Fixed and verified live** (logged in as the user): widened the trigger to also fire whenever `info.multiroomRole === "slave"` (a hard signal from `group`/`master_ip`, independent of the unreliable vendor field) — see `snapshot.ts`. Confirmed working: Now Playing card shows a playing state (pause icon, advancing progress bar) instead of "Nothing Playing." Title/artist stay blank in this case — the fix only corrects play/stop state, doesn't mirror the master's track metadata.
- **Spotify-sourced master:** slave's `vendor` is also empty, but **`curpos` is frozen** (confirmed: identical across 5 polls, ~5 seconds, while the master's own position was actively advancing) — a different failure mode the widened condition doesn't cover, since there's no advancing signal to detect at all.

**Decision (not yet implemented):** the position-delta trick is fundamentally a per-source guessing game — three sources tested have already produced two incompatible slave-side signatures. The robust fix is to stop inferring anything from a confirmed slave's own (unreliable) transport fields, and instead fetch the **master's own `getPlayerStatus`/meta directly** (using `info.multiroomMasterIp`, already tracked) and mirror its title/artist/state/position — correct by construction regardless of what the master's source is, with a fallback to the slave's own fields if the master fetch fails (offline, network hiccup). This should **replace**, not extend, the slave-role branch of the current fix; the vendor-based branch should remain only for a genuinely standalone (non-grouped) Plex/DLNA cast receiver, which still has no master to query.

**Why this wasn't implemented today:** deliberate — this session had already covered a very large amount of ground over many hours (README repositioning, multiroom feature fixes, ESLint setup, a full release, upstream-sync audit, two rounds of preset-highlight debugging, and this investigation), and continuing to add a nontrivial new cross-device fetch on top of all that risked the kind of context dilution/attention drift that shows up in very long sessions before it's obvious. Decided to stop here, log the investigation precisely, and let a fresh session implement the master-mirroring fix from this doc rather than from a sprawling transcript.

**Status:** partial fix (CustomRadio/Plex slave case) implemented, verified live, and committed. Spotify (and any other source with frozen slave-side curpos) still shows "Nothing Playing" — known, documented, not yet fixed. Master-mirroring fix designed above, ready to implement in a fresh session. The `KNOWN PARTIAL FIX, NOT COMPLETE` comment right above the affected code in `snapshot.ts` has the same detail inline.

---

## 2026-07-13 — Preset-highlight fix, round 2: found the real root cause

**Context:** the per-device scoping + localStorage persistence fix (previous entry) was live-tested and initially looked broken — some presets never highlighted, or the highlight vanished within moments of being set. User's own hardware description ("RL Grime on Plex... won't highlight at all even though it plays fine") gave a precise repro target.

**Root cause, confirmed by direct hardware polling:** some presets (confirmed: a SoundCloud-sourced one, "RL Grime," preset #8 on the Bedroom WiiM) genuinely report `status: "stop"` for the very first poll immediately after activation, before settling into `"load"` then `"play"` a second or two later — not a real stop, just how that source's stream starts up. Other presets tested (CustomRadio, a Plex-sourced one) went straight `load → play` with no "stop" blip, which is why they'd worked in earlier spot-checks. The clearing effect's "if state is stopped, the remembered preset is stale" rule has no way to tell a real stop from this transient one, so it wiped the highlight (and, after the previous fix, its persisted localStorage entry) within moments of being set — matching exactly the "click once: nothing, click twice: works" and "never highlights" reports.

**Fix:** added an 8-second grace window after activation (`activatedAt` timestamp, stored alongside the rest of the remembered-preset state and persisted to `localStorage` too) during which the "stopped" check is skipped — the source-key-mismatch check is untouched, since that's mode-based and wasn't implicated. Verified live, logged in as the user (temporary credentials shared and used for this session only): the RL Grime preset now highlights and stays highlighted through the transient stop, and survives switching to the other device and back.

**Also fixed in the same session:** the actual live app's footer/version-link (`src/lib/version.ts`) pointed at `illianoaoi/Wiim-Dashboard` — same "copied from upstream, never repointed" bug as the docs, but in shipped app code, causing the version link to 404. Reworded from "Vibe coding by illiano" to "Forked from illiano's WiiM Dashboard," now linking correctly.

**Not yet fixed / no plan to fix:** the underlying "no durable current-preset field" limitation remains — a preset changed from outside this dashboard (WiiM app, another control point) still won't be reflected. That's an accepted, documented limitation, not something today's fixes address.

**Status:** all fixes implemented and live-verified (PWA install, footer/URL, LastFM reorder, preset highlighting both rounds). Not yet committed — several rounds of changes are stacked up pending commit.

---

## 2026-07-13 — PWA install fix, footer/URL fix, LastFM reorder, preset-highlight fix

**PWA install bug (real, affected the published v0.4.0 release):** asked to check on the "installable app" feature from the 2026-07-11 session — it had never been tested against a real deployment. Found `sw.js` returning an HTTP 307 redirect to `/login`: `middleware.ts`'s auth-gate matcher excludes several static paths from requiring a session (`favicon.ico`, `manifest.webmanifest`, etc.) but `sw.js` was missing from that list. A redirected service-worker script fails registration in every browser, and `pwa-register.tsx`'s `.catch(() => {})` swallowed the resulting error silently — so the install feature had likely never worked, for anyone, since it shipped. Fixed (added `sw.js` to the matcher's exclusion list), rebuilt, and verified live via `navigator.serviceWorker.getRegistrations()` on a fresh unauthenticated visit — now `active: true`.

**Footer/URL bug (also live since inception, unrelated to the above):** `src/lib/version.ts`'s `REPO_URL`/`RELEASE_URL` pointed at `illianoaoi/Wiim-Dashboard` — meaning the footer's "v0.4.0" link 404'd (this fork's release tags don't exist on upstream's repo). Same "copied from upstream, never repointed" class of bug hit repeatedly today, this time in live app code. Fixed: `REPO_URL` now points at `gthibo/Wiim-Dashboard`, added a separate `UPSTREAM_URL` constant for illiano's repo specifically. Footer text changed from "Vibe coding by illiano" (misattributes authorship of *this* running instance) to "Forked from illiano's WiiM Dashboard" (fair credit, correct link) + a working version link.

**LastFM stats panel reordered** to sit below the Sub-out/Temperature grid instead of above it (`dashboard.tsx`) — simple JSX reorder, no logic change.

**Preset highlighting bug (two real issues, one fix):** `activePreset`/`activePresetSourceKey` in `dashboard.tsx` were single global state, not scoped per device — switching to a device that happened to share the previous device's `sourceKey` (common: both on "wifi") never triggered the clearing effect, so the wrong device's highlighted preset leaked onto the newly selected one. Separately, a page refresh always lost the highlight entirely (plain React state, no persistence) — accepted as an inherent limitation in the original comment (no durable "current preset" field from the WiiM API), but that memory was already just an optimistic, unverified guess even within a session, so persisting the *same* guess across a refresh doesn't add new risk. Fixed both: the memory is now loaded/cleared per-device (keyed by device id) on every device switch, and persisted to `localStorage` (`wiim:activePreset:<deviceId>`) on activation and cleared from storage too when the existing staleness rule (source changed / playback stopped) fires.

**Verified:** typecheck + lint clean for all four changes; PWA fix confirmed live via browser (service worker `active: true`, footer links confirmed correct via DOM query). LastFM reorder and preset-highlight fix are both behind login — not yet verified live by the user.

**Status:** all four implemented, not yet committed (user asked to hold commits from the earlier quick-switch-exploration docs batch too — this is now on top of that).

## 2026-07-13 — Third-party service quick-switch: explored, decided against

**Context:** considered the "Spotify/TIDAL/Qobuz one-tap quick-switch" feature queued from `docs/API-CAPABILITY-RESEARCH.md`'s original ranking. Before designing, checked how source-switching actually resolves in code: mode codes 31/32/36 (Spotify/TIDAL/Qobuz) already fall inside `NETWORK_PLAY_MODES`, and `parsePlayerStatus` resolves those to the generic `wifi` sourceKey *before* any more specific match — so these three could never actually highlight as the active source without reworking shared mode-resolution logic used by every streaming/DLNA/radio source.

**Decided against building it at all**, for a more fundamental reason than that risk: Spotify/TIDAL/Qobuz all use Connect protocols, where the phone/computer app is always the control point — no local API (including WiiM's own official app) can add real playlist/favorites browsing for these, full stop. The only buildable piece (a `switchmode:<Service>` button) has unverified real-world value. Left as a maybe-someday item in `docs/API-CAPABILITY-RESEARCH.md`, revisit only on real user demand. Also surfaced and wrote down the maintainer's actual desktop-only rationale for the first time (see `SOURCE-OF-TRUTH.md`) — it directly informed this decision.

**Also flagged, unresearched:** TuneIn and other services LinkPlay integrates directly into firmware (not via Connect) might have a genuine browse API — architecturally different from Spotify/TIDAL/Qobuz, but never investigated. Noted in `docs/API-CAPABILITY-RESEARCH.md` as a distinct open question, not bundled with the Connect-services "no."

**Status:** no code changed. Docs updated (`SOURCE-OF-TRUTH.md`, `docs/API-CAPABILITY-RESEARCH.md`), pending commit.

---

## 2026-07-13 — v0.4.0 release + checked upstream sync

**Released 0.4.0.** GitHub Actions turned out to have been disabled on this fork the whole time (default behavior for forks — user manually enabled it via the Actions tab banner), so no CI run or GHCR image had ever actually been published despite the workflows existing since 2026-07-11. Re-tagged after enabling; the release workflow ran successfully (multi-arch build, ~15 min including arm64 under QEMU) — confirmed `ghcr.io/gthibo/wiim-dashboard:0.4.0`/`:latest` both pull, and the GitHub Release body matches CHANGELOG.md. Also fixed `scripts/release.sh`'s own leftover `illiano` git-identity comment and `illianoaoi` echo messages — same "copied from upstream, never repointed" class of bug already hit in README.md/CONTRIBUTING.md.

**Checked the "6 commits behind upstream" GitHub banner.** Fetched upstream and diffed all 4 real fixes (`6865ddd` sub-out false-positive, `3120d58` EQ L/R, `7aec6aa` lyrics timeout/album-mismatch, `59db72f` Plex/DLNA cast detection) against our current code before merging anything. Finding: **we already have equivalent or better fixes for all four**, independently — likely bundled into the `Showa Hi-Fi Counter — visual re-skin (Rounds 1–33)` squash commit alongside visual work, never surfaced as separate documented fixes. Nothing merged or cherry-picked; would have been redundant/conflict-prone. One genuine small gap adopted from upstream's version: `capabilities.ts`'s subwoofer detection now also OR-checks `delay_main_sub`/`linein_delay` alongside `plugged` (upstream's slightly more robust condition — we only had a bug-free but narrower `plugged`-only check).

**Status:** release live, upstream-sync check done, capabilities.ts fix pending commit.

---

## 2026-07-13 — Multiroom bug fixes + relocate into Device panel (implemented)

**Context:** live-tested multiroom on real hardware (WiiM Pro fw 4.8, WiiM Ultra fw 5.2, wmrm 4.3). Found and fixed three real bugs (see `GOTCHAS.md` for the field-shape details): role/master-IP detection relied on a `multiroom` object `getStatusEx` never sends on this firmware (fixed via top-level `master_ip`/`master_uuid` + a new `multiroom:getSlaveList` call); group mute and group volume's broadcast commands (`setPlayerCmd:slave_mute`/`slave_vol`) are accepted but no-op on this hardware — switched both to the confirmed-working per-slave targeted commands (`multiroom:SlaveMute:<ip>:<0|1>`, `multiroom:SlaveVolume:<ip>:<n>`). All of join/leave/kick/group-mute/group-volume now verified working live. One reported bug (leaving a group once stopped the master's playback) did not reproduce across two independent retests and is not fixed — documented as unreproducible, not silently dropped.

**Now planned:** relocate all three multiroom states (solo/slave/master) from the standalone `multiroom-card.tsx` into the DEVICE column of `source-output-panel.tsx` (`DeviceSection`), between the Add/Settings/Logout action tiles and the existing Model/Firmware/IP info rows (own leading/trailing divider, same recipe as the existing one). Visibility gate unchanged: only renders when `devices.length >= 2`.

- **Solo:** one line, "Standalone" + compact "Join group…" dropdown (unchanged interaction, restyled to the column's faceplate/glass palette).
- **Slave:** one line, "Following **Name**" + a small "Leave" button.
- **Master:** one compact row per slave (name + "Kick"), then one combined row mirroring the now-playing card's transport-row layout (icon-button | slider | numeric value): a new 1.5rem power-graphic mute button (`power-btn.png`/`power-off-overlay.png`, muted = off-look per confirmed mapping) + the shared `Slider` component (`variant="volume"`, same styling as now-playing's volume slider) + numeric readout.
- No dedicated "Multiroom" header row (kept compact per user request — it's a Device subsection, not a new top-level section like Source/Output).
- `deviceId` and `onChanged` get threaded one level down into `DeviceSection` (both already exist in `SourceOutputPanel`); `role`/`masterIp`/`slaves` read directly off the already-passed `info` prop (`DeviceInfo` already carries all three) — no other new props needed.
- `multiroom-card.tsx` is left on disk, unreferenced (its standalone usage removed from `dashboard.tsx`) — same convention already used for `device-info-card.tsx`/`source-card.tsx`/`output-card.tsx`; the "absorbed" note goes in `source-output-panel.tsx`'s existing top-of-file comment, not in the orphaned file itself (matching how those three are documented).

**Status:** implemented, live-verified against real devices (correct role/master display, Kick, group mute, group volume all confirmed working), and polished per follow-up feedback: Kick/Leave recolored to `--primary` (rust), the mute+volume row given `mt-8` spacing (was inheriting `space-y-3`'s 0.75rem), a "Group Volume" label added below the slider, "Following:" given a colon + spacing, slave rows prefixed "Connected:". Also fixed a real bug found during polish: the volume slider always initialized to a hardcoded 50 (not synced to the actual device), now initialized and kept synced from `multiroom:getSlaveList`'s per-slave `volume`/`mute` fields (with a drag-guard, same pattern as the now-playing card's own volume sync). Committed across three commits (protocol fixes, UI relocation, docs) and pushed to `origin main`.

---

## 2026-07-13 — ESLint setup

**Context:** this repo has never had an ESLint config (see `GOTCHAS.md`'s 2026-07-11/12 entries) — `next lint` hit an interactive "how do you want to configure ESLint?" wizard that couldn't run non-interactively, so `npm run lint` was effectively dead. User asked to close this gap after wrapping up multiroom.

**Done:** installed `eslint` + `eslint-config-next@15.5.4`, added `eslint.config.mjs` (flat config, `next/core-web-vitals` + `next/typescript` via `FlatCompat`), excluding `_showa/` (already excluded from TypeScript itself, per `tsconfig.json`) and the auto-generated `next-env.d.ts`. Ran it against the whole real codebase for the first time ever: only 4 warnings, 0 errors — genuinely clean given the codebase's history. Fixed all four: an anonymous default export in `postcss.config.mjs`, an unused `PEQ_LETTERS` import in the EQ route, a truly-dead `hasDuration` prop threaded through `CubbyArt` in `now-playing-card.tsx` (removed from the prop type/destructure/call site, not just the lint warning), and a stale `eslint-disable-next-line react-hooks/exhaustive-deps` comment in `marquee-text.tsx` that no longer suppressed anything.

Also switched `package.json`'s `lint` script from `next lint` (deprecated, removed in Next.js 16 — it printed the deprecation notice itself) to plain `eslint .`, and added `npm run lint` to the documented pre-PR check in both `CONTRIBUTING.md` and `README.md` (was `typecheck && build` only).

**Verified:** `npm run lint` (well, direct `eslint .` — see Windows/npm-shim gotcha in `GOTCHAS.md`) passes with zero warnings; a full Docker build also passes, confirming ESLint running for the first time inside `next build` doesn't break anything.

**Status:** implemented, verified via typecheck + real Docker build. Not yet committed.

**Context:** the 2026-07-11 fork-governance premise ("upstream unresponsive 3+ weeks") was found to be wrong when checked against GitHub directly — illianoaoi landed the SSRF fix same-day back on 2026-06-19 (credited user as co-author), and fixed three more user-reported issues on 2026-07-13 (lyrics lookup, subwoofer false-positive, parametric EQ L/R), each with a thank-you comment. Upstream is actively maintained. `SOURCE-OF-TRUTH.md`'s fork-governance section and the corresponding memory were corrected same day. This changes the README's framing from "independent fork because upstream went quiet" to "active fork of an active project."

**Plan (approved by user 2026-07-13, section by section):**
1. **Opening/identity:** keep "Showa Hi-Fi Counter" and the hi-fi visual hook as the header. Replace "Same functionality... all credit goes to illianoaoi" with framing as a hi-fi-styled fork of the actively-maintained WiiM Dashboard, adding multiroom, wake-alarm, and an installable PWA on top of upstream's core. One-line "forked from illianoaoi/Wiim-Dashboard (MIT)" near the top, not the dominant message.
2. **Feature list:** merge the fork's short "what's different" bullets and upstream's full feature table into one unified table. Fork's real additions (Multiroom, Wake-alarm timer, Installable PWA) become regular rows, not a separate "extras" section. Drop the subwoofer false-positive bug-fix claim — upstream fixed that themselves (issue #6), no longer this fork's differentiator.
3. **Install instructions + CONTRIBUTING.md:** fix `git clone` / `docker run` examples to point at `gthibo/Wiim-Dashboard` / `ghcr.io/gthibo/wiim-dashboard` (matches the corrected registry in `SOURCE-OF-TRUTH.md`). Same fix in `CONTRIBUTING.md`'s clone URL; remove the leftover `git config user.name "illiano"` instruction (copy-paste artifact from upstream's CONTRIBUTING.md).
4. **Credits/License/footer:** License & Credits section credits illianoaoi warmly and specifically (original architecture, device integration, active ongoing maintenance) alongside the MIT license. Drop the "Vibe coding by illiano" footer and the GitHub Sponsors link (currently points only to illianoaoi) — no replacement support link for now since the user doesn't have one set up yet; can add later.

**Status:** implemented. `README.md` restructured into one unified doc (merged feature table, corrected clone URL/GHCR image/CI badge to `gthibo/Wiim-Dashboard`, rewritten opening + License & credits, dropped the Sponsors/footer section, added Multiroom/Wake-alarm/Installable-app rows and a Multiroom troubleshooting entry). `CONTRIBUTING.md` clone URL fixed and the leftover `git config user.name "illiano"` instruction removed. Old unskinned upstream screenshots (embedded from the previously-quoted original README) were dropped as part of the merge — the walnut re-skin screenshots at the top now represent the app's actual current look, and keeping both was inconsistent. Not yet committed — pending user review.

---

## 2026-07-11 — Ringer setup + first real feature batch

**Environment set up.** Ringer (verified-swarm orchestrator) installed and running from WSL2 Ubuntu (native Windows isn't supported — see `GOTCHAS.md`). Two worker lanes proven: Codex (free ChatGPT tier — thin quota, treat as occasional not default) and OpenCode+OpenRouter (primary lane going forward — cheap, reliable, not tied to any subscription already at capacity).

**Shipped, all verified against the real repo:**
- Installable desktop PWA shell — `src/app/manifest.ts`, `public/sw.js`, `src/components/pwa-register.tsx`, wired into `src/app/layout.tsx`. Desktop-installable via Chrome/Edge; no mobile-responsive work (out of scope this round, not a hard rule).
- Wake-alarm timer — `src/lib/alarm/timer.ts`, `src/app/api/devices/[id]/alarm/route.ts`, `src/components/dashboard/alarm-button.tsx`, wired into `now-playing-card.tsx`. Mirrors the existing sleep-timer pattern. **Known follow-up**: `AlarmButton` gets `firesAt` from its own separate fetch on mount rather than the shared 3s snapshot poll `SleepButton` uses — works, but won't live-update the same way. In-memory only, does not survive a server restart (documented limitation, same as sleep timer). **Verification caveat**: this task's Codex attempts both failed instantly on the quota wall (see GOTCHAS.md), so this code was never actually run through Ringer's automated check. It was recovered from `git stash` (an earlier interrupted attempt) and verified with a manual, independently-run `npm run build` instead — same code, but not swarm-verified the way pwa-shell/release-fix-and-unraid were.
- Release pipeline fix — `.github/workflows/release.yml`, `proxmox/install.sh`, `docs/EASY-INSTALL.md` all corrected from the stale `illianoaoi/wiim-dashboard` image path to `gthibo/wiim-dashboard` (GHCR) / `mrthibsog/wiim-dashboard` (Docker Hub, dormant until secrets are added).
- Unraid Community Applications template — new `unraid/wiim-dashboard.xml`.
- `docs/API-CAPABILITY-RESEARCH.md` — deep research into LinkPlay/WiiM API capabilities not yet implemented (multiroom/group sync, NAS/local-media, third-party service control), sourced from python-linkplay and pywiim. **Recommendation: multiroom next** — strongest evidence, highest user value.

**All four tasks' changes currently sit uncommitted in the working tree** — not committed yet, pending your review/testing.

**Decisions made this session:**
- Fork governance: proceeding independently of unresponsive upstream. Full detail in `SOURCE-OF-TRUTH.md`.
- Docker Hub username confirmed as `mrthibsog` (separate from GitHub username `gthibo`).
- This `project/` doc set created; historical design-phase context (color tokens, control philosophy, original scope) lives in the user's Open-Brain (topic: "WiiM Dashboard", captured 2026-06-19) — condensed into `SOURCE-OF-TRUTH.md`, full detail stays in Open-Brain. Bridging update captured back to Open-Brain this session connecting the original build phase to this feature-expansion phase.

**Also done this session:** `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` GitHub repo secrets added (Read & Write scope) — Docker Hub publishing is now active, will mirror on the next version-tag push.

**Also done:** all four tasks' diffs reviewed and committed as 5 separate commits (PWA shell, alarm timer, release-path fix + Unraid template, research doc, project docs). `./ringer.py install-agent` run — but note it installs into WSL's own Claude Code config (`~/.claude` on the Linux side), not Windows-side Claude Code (`C:\Users\mrthi\.claude`), which is what this orchestrator session actually runs as. Manually replicated the skill file and hooks to the Windows-side config. Hit and fixed a real gotcha doing this — see GOTCHAS.md ("Windows-side Ringer hooks need MSYS_NO_PATHCONV=1").

**Pending / next up:**
- README repositioning for community-facing framing (good candidate for a future Ringer swarm round).
- Next session should start fresh — this one has served its purpose.

---

## 2026-07-11/12 — Multiroom feature build

**Shipped, swarm-verified, currently uncommitted pending your review/live-device test:**
- Multiroom / group-sync support — `src/lib/wiim/constants.ts` (command strings), `src/lib/wiim/types.ts` + `parse.ts` (role/master/slaves derived from the existing `getStatusEx` poll, zero extra HTTP calls), `src/lib/wiim/multiroom.ts` (new: joinGroup/leaveGroup/kickSlave/setGroupVolume/setGroupMute), `src/app/api/devices/[id]/multiroom/route.ts` (new POST route), `src/components/dashboard/multiroom-card.tsx` (new UI card), wired additively into `dashboard.tsx`. Passed real `npm run typecheck` + `npm run build` (not just the worker's self-report — independently re-verified).
- **Every multiroom command is flagged `needs testing`** in code — no test hardware was available for the underlying research (`docs/API-CAPABILITY-RESEARCH.md`). You have 2+ real WiiM devices; testing join/leave/kick/group-volume/group-mute live is the natural next step before this ships to end users.
- Known open question worth testing first: `leaveGroup` tries `multiroom:Ungroup` (capital U) then falls back to lowercase `multiroom:ungroup` if rejected — the two source libraries disagree on casing.

**Rocky path to get here (all now documented in GOTCHAS.md so it doesn't repeat):** Codex free-tier quota was fully exhausted (hit twice, same "try again Aug 9" wall — see GOTCHAS.md), so this ran on OpenCode+GLM 5.2 instead. Along the way: a stuck-process kill left two workers briefly racing on the same files (no corruption, but caught late), a laptop sleep interrupted a background run, an `npm run lint` gate turned out to be unwinnable (repo has no ESLint config, ever — pre-existing gap, not addressed this round), and a worker `git restore`'d two unrelated project-doc files mid-task (recovered, and specs now hard-forbid any git write command outside owned paths). Final clean pass: first-try pass, ~13 minutes, GLM 5.2.

**Pending / next up:**
- Live-test the multiroom feature against your 2 real WiiM devices (join/leave/kick/group-volume/group-mute) — everything is `needs testing`.
- Set up a working ESLint config for this repo at some point (out of scope this round; `npm run lint` currently can't run non-interactively at all).
- Decide whether/when to commit the multiroom changes.
