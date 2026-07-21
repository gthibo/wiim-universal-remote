// App version — single source of truth is package.json, injected at build time
// via next.config.ts (`env.APP_VERSION`). Falls back to "0.0.0" outside a build.
export const APP_VERSION = process.env.APP_VERSION || "0.0.0";

export const REPO_URL = "https://github.com/gthibo/Wiim-Dashboard";
export const RELEASE_URL = `${REPO_URL}/releases/tag/v${APP_VERSION}`;
export const UPSTREAM_URL = "https://github.com/illianoaoi/Wiim-Dashboard";
