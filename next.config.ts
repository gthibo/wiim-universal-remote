import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// Single source of truth for the version: package.json. Injected at build time
// so the UI footer always matches the package version (no manual sync).
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small Docker image.
  output: "standalone",
  // Native modules must stay external (not bundled by webpack/turbopack).
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
  poweredByHeader: false,
  reactStrictMode: true,
  // The WiiM device API is reached only from the server; album-art images are
  // proxied through our own /api route, so no remote image hosts are allowed.
  images: { remotePatterns: [] },
  // Inlined into both server and client bundles at build time.
  env: { APP_VERSION: pkg.version },
};

export default nextConfig;
