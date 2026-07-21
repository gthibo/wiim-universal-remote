import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wiim Dashboard",
    short_name: "WiiM",
    description: "Control and monitor your WiiM audio devices",
    start_url: "/",
    display: "standalone",
    background_color: "#2A1804",
    theme_color: "#2A1804",
    icons: [
      // Chrome/Edge's desktop installability check has a long history of not
      // reliably honouring an SVG-only icon (even with sizes:"any") in place
      // of real raster icons at these two specific sizes — confirmed on real
      // hardware: the install affordance never appeared with the SVG alone.
      // PNGs first so a strict size-matching lookup finds them before "any".
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
