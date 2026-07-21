# Contributing

Thanks for your interest in improving Wiim Dashboard! This guide covers the dev setup, conventions, and how to add common things.

## Development setup

```bash
git clone https://github.com/gthibo/Wiim-Dashboard.git
cd Wiim-Dashboard
npm install
cp .env.example .env        # set AUTH_SECRET; for http dev, COOKIE_SECURE=false
npm run dev                 # http://localhost:3000
```

You'll need a real WiiM device on your LAN to exercise the device features. Add it by IP from the **Add device** page.

### Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Production build (standalone) |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`eslint.config.mjs`, flat config) |

**Before opening a PR:** `npm run typecheck && npm run lint && npm run build` must pass.

## Conventions

- **TypeScript, strict.** No `any` unless unavoidable; prefer the shared types in `src/lib/wiim/types.ts`.
- **Server vs client.** Anything under `src/lib/wiim`, `src/lib/auth`, `src/lib/db` is server-only (marked with `import "server-only"`). Never import them into client components. Client code lives in `src/lib/client` and `"use client"` components.
- **Validation.** Validate every request body with Zod (`parseBody`). Allowlist enum-like inputs (sources, outputs, EQ presets).
- **Auth.** Every mutating route must call `guard(req, { mutation: true })`. Read-only routes call `guard(req)`.
- **Device safety.** All device access goes through `src/lib/wiim` so it inherits the SSRF guard and mTLS. Never build an `httpapi.asp` URL by hand in a route.
- **Styling.** Tailwind + the `cn()` helper. Reuse `ui/` primitives and the card layout (`Card` / `CardHeader`). Keep it mobile-first and dark-only.
- **Commits.** Imperative, scoped messages (e.g. `feat(presets): show artwork`, `fix(csp): drop upgrade-insecure-requests over http`).

## How to: add a new device control

1. **Command** — add a builder in `src/lib/wiim/constants.ts` (`Cmd`) and a typed function in `commands.ts` that sends it and checks the response with `assertAccepted`.
2. **Route** — create `src/app/api/devices/[id]/<feature>/route.ts`: `guard({mutation:true})` → `resolveDevice` → `parseBody` (Zod) → `runDevice(() => yourCommand(...))`.
3. **Client** — call it via `apiSend("/api/devices/<id>/<feature>", "POST", body)` and `mutate()` the snapshot.

## How to: add a new dashboard card

1. If the feature has live state, add it to `DeviceSnapshot` (`types.ts`) and fetch it in `snapshot.ts` (gated on a capability).
2. Add a capability flag in `capabilities.ts` if visibility depends on the model.
3. Create `src/components/dashboard/<feature>-card.tsx` using `Card` + `CardHeader`.
4. Render it in `src/components/dashboard/dashboard.tsx`, gated on the capability/snapshot field.

## How to: support a new WiiM command/field

- Check the official PDF, `python-linkplay`, and `pywiim` for the exact command/field name and add it to `docs/WIIM-API.md`.
- Mark clearly in code whether it's **documented** or **community-verified**.
- Map numeric enums in `constants.ts`; parse responses in `parse.ts`.

## Versioning & releases

This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):
- **PATCH** — bug fixes, no behaviour change
- **MINOR** — new backwards-compatible features
- **MAJOR** — breaking changes

**`package.json` is the single source of truth** for the version. It's injected at build time
(`next.config.ts` → `env.APP_VERSION`) and shown in the app footer (`src/lib/version.ts`), which
links to the matching GitHub release — so there's nothing to sync by hand.

To cut a release:

```bash
./scripts/release.sh patch     # or: minor | major | 1.2.3
```

This bumps `package.json`, creates a `release: vX.Y.Z` commit + `vX.Y.Z` tag (using your repo git
identity), pushes with tags, and publishes a GitHub release with auto-generated notes. Then rebuild
and redeploy (`docker compose up -d --build`) so the footer shows the new version.

## Reporting issues

Open a GitHub issue with your WiiM model + firmware (from the Device card), what you expected, and what happened. For security issues, see [SECURITY.md](SECURITY.md) — please don't open a public issue for vulnerabilities.
