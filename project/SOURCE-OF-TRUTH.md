# Source of Truth

Living record of what this fork is, why it exists, and the decisions that got it here. `ARCHITECTURE.md` (repo root) covers the codebase's technical shape; this file covers project-level decisions that aren't derivable from reading code.

## What this project is

**Showa Hi-Fi Counter** — a personal fork of [illianoaoi/Wiim-Dashboard](https://github.com/illianoaoi/Wiim-Dashboard), re-skinned as a piece of physical hi-fi hardware translated into software, now expanding with new features. Repo: [gthibo/Wiim-Dashboard](https://github.com/gthibo/Wiim-Dashboard).

Note on lineage: the original functional-scope audit (see Design origin below) referenced [cvdlinden/wiim-httpapi](https://github.com/cvdlinden/wiim-httpapi) as feature/API-documentation reference material. The actual forked codebase — Next.js App Router, matching the intended stack — is illianoaoi/Wiim-Dashboard, a different project. Don't confuse the two when tracing history.

## Fork governance (decided 2026-07-11, corrected 2026-07-13)

**Correction (2026-07-13):** the 2026-07-11 decision below was based on a mistaken read of upstream as unresponsive. Checking GitHub directly on 2026-07-13 showed: the SSRF fix (issue #1 / PR `fix/ssrf-album-art-presets`) was actually landed by illianoaoi the same day it was filed, 2026-06-19 — credited as co-author on the commit — it just wasn't merged via GitHub's UI (hand-applied into their own commit instead), which is why it read as "still open/ignored." And on 2026-07-13, illianoaoi fixed three more issues gthibo reported (lyrics lookup #5, subwoofer false-positive #6, parametric EQ L/R #7), each with a direct thank-you comment. **Upstream is actively maintained, not unresponsive.**

Revised decision: this is an **active fork of an actively-maintained project**, not an independence move driven by upstream neglect.

- Keep filing upstream PRs for core/bug fixes (SSRF, subwoofer, EQ-type issues) — this channel demonstrably works now; don't duplicate core fixes only in the fork.
- The fork's real differentiators are the visual re-skin plus genuinely new features upstream hasn't built: multiroom/group-sync, wake-alarm timer, installable PWA shell.
- Reposition the README — it currently frames this as "just a re-skin, all credit to original," which undersells the real feature divergence (PWA, alarm, multiroom) and doesn't reflect that upstream is a live, responsive project worth crediting warmly and accurately (not as a footnote, not as "abandoned").
- Intent: offer this to the broader WiiM user community, not keep it personal-use-only — as a hi-fi-styled fork built on an active, well-maintained upstream.
- Base project is MIT-licensed — no obligation to upstream anything, but no reason to disclaim the relationship either now that it's a healthy one.

**Upstream sync check (2026-07-13):** GitHub shows this fork ~6 commits behind `illianoaoi/Wiim-Dashboard:main` (their own 0.3.7 release: sub-out false-positive, EQ L/R, lyrics timeout/album-mismatch, Plex/DLNA cast detection). Diffed all four against our code before merging anything — **we already had equivalent or better fixes for all four**, independently (likely folded into the `Showa Hi-Fi Counter` re-skin squash commit alongside visual work, never surfaced as separate fixes at the time). Nothing merged; one small robustness gap adopted (`capabilities.ts` subwoofer detection broadened to match upstream's OR condition). Deliberately **not** claimed in the public README: a "we're at parity" claim would need re-verifying every time upstream ships something, an overclaim risk in the same class as the pre-correction "unresponsive" framing above. Re-check next time the "behind" count grows meaningfully rather than assuming it still holds.

## Publishing / deployment

- **GHCR** (primary): `ghcr.io/gthibo/wiim-dashboard` — fixed 2026-07-10 (was incorrectly still pointing at `ghcr.io/illianoaoi/wiim-dashboard`, copied verbatim from upstream and never repointed).
- **Docker Hub** (optional mirror): `docker.io/mrthibsog/wiim-dashboard`. `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` (Read & Write scope) added as GitHub repo secrets on gthibo/Wiim-Dashboard 2026-07-11 — active, will mirror on the next version-tag push (`./scripts/release.sh patch`).
- **Unraid**: one-click Community Applications template at `unraid/wiim-dashboard.xml`, points at the corrected GHCR image.
- **Proxmox**: `proxmox/install.sh`, same corrected image reference.

## Design origin (captured 2026-06-19, original build phase)

Full history lives in the user's Open-Brain (topic: "WiiM Dashboard") — this is a condensed pointer, not a replacement.

- **Design thesis**: Rams/Loewy hi-fi control panel aesthetic (real-feeling sliders, dark-walnut cabinet body, sharp rectilinear edges, low-contrast matte controls) combined with a 1960s–80s Japanese/jazz graphic design voice confined to the now-playing display and small iconographic marks. References: Braun RT 20, Harman/Kardon Citation series (object language); Blue Note/CTI/Atlantic jazz cover art (graphic language).
- **Color tokens (locked v2)**: Walnut `#3B2306` (bg) · Walnut Dark `#2A1804` (gradient edge/niches) · Faceplate `#E8E1D3` · Faceplate Dim `#DCD3C2` · Rust `#B3441E` (primary accent, active/play states only) · Tape Teal `#2E7D7A` (secondary accent, EQ/now-playing pulse) · Velvet `#7A2424` (mute/error only, never decorative) · Static `#1C1A17` (body text). Walnut+Faceplate ≈ 90% of every screen.
- **Control philosophy**: sliders not dials (lower build complexity, best mood-board reference used sliders); no rounded corners on hardware-style controls; squared transport keys not circular play/pause; source/output selection stays low-prominence, expands on interaction rather than an always-visible button wall.
- **Original functional scope** (from auditing wiim-httpapi's feature set): playback transport, presets grid with artwork, 10-band graphic EQ with named presets, source/output selection, sub-out controls, device diagnostics.
- **Original parking lot (explicitly out of scope in the initial PRD)**: multi-room/group playback, deep alarm configuration. **Both are now being picked up** — alarm shipped 2026-07-10 (`src/lib/alarm/`), multiroom is researched and scoped (`docs/API-CAPABILITY-RESEARCH.md`) as the next feature to build.
- **Original workflow**: feature spec + initial design language done with Gemini/NotebookLM, iterated with Claude. As of 2026-07, active development runs through Claude Code + Ringer (verified worker swarms) instead.
- **Desktop-only rationale (surfaced 2026-07-13, reasoning not previously written down):** deliberate, not an oversight or resource constraint. The maintainer doesn't see the value in a stripped-down mobile version of a more full-featured desktop app — mirrors the official WiiM mobile app's own scope rather than trying to out-feature it on a small screen. This directly informed the 2026-07-13 decision not to build Spotify/TIDAL/Qobuz Connect quick-switch buttons (see `docs/API-CAPABILITY-RESEARCH.md`): those buttons would only replicate a slice of what the *native* streaming-service apps already do better, the same "why bother stripping down a full app" reasoning as the mobile-responsive decision. Worth checking against this rationale before proposing any future feature whose main pitch is "matches what the mobile app / other apps already do."

## Current feature-expansion tracking

See `SESSION-LOG.md` for the working log and `../docs/API-CAPABILITY-RESEARCH.md` for the multiroom/NAS/service-integration research backing the next round of feature work.
