import type { Metadata, Viewport } from "next";
import { Antonio, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ModalProvider } from "@/components/modal";
import PwaRegister from "@/components/pwa-register";

/* ============================================================================
   SHOWA HI-FI COUNTER — font loading
   next/font/google self-hosts these at build time (served from 'self'), which
   is required by the app's CSP (`font-src 'self' data:`) — a Google Fonts CDN
   <link> would be blocked outright. Each font exposes a CSS variable that
   globals.css' --font-display / --font-sans / --font-mono tokens resolve to.

   - Antonio: condensed display face for track titles / structural labels.
   - IBM Plex Sans: grotesque UI labels (source pickers, buttons, tabs).
   - IBM Plex Mono: numeric/LCD-style readouts (volume, timestamps, bitrate).
   ========================================================================== */

const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wiim Dashboard",
  description: "Control and monitor your WiiM audio devices",
  applicationName: "Wiim Dashboard",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wiim",
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2A1804",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${antonio.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <PwaRegister />
        {/* SHOWA RE-SKIN: cabinet woodgrain. A fixed, full-viewport inline
            <svg> behind all content (-z-10), blended soft-light over the
            walnut body gradient from globals.css. Inline SVG in the DOM (NOT a
            url("data:image/svg+xml,...") background) so it sidesteps the CSP
            img-src directive entirely — the same reason the fonts are
            self-hosted. Locked feTurbulence params from the design handoff:
            asymmetric baseFrequency 0.006/0.25 (long horizontal grain),
            5 octaves, seed 3, noise dumped into alpha only. Opacity 0.72. */}
        <svg
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
          style={{ mixBlendMode: "soft-light", opacity: 0.72 }}
        >
          <filter id="cabinetGrain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.25"
              numOctaves={5}
              seed={3}
              result="n"
            />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#cabinetGrain)" />
        </svg>
        <ToastProvider>
          <ModalProvider>{children}</ModalProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
