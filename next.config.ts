import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small Docker image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Headless service: no images are served or proxied.
  images: { remotePatterns: [] },
  // The dashboard's security headers lived in middleware.ts, which this
  // build does not have. Keep the one that still matters for API responses.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
