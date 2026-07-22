import type { Metadata } from "next";

/**
 * Headless service root layout.
 *
 * This build serves API routes only -- no fonts, no CSS, no providers.
 * Next still requires a root layout to exist, so this is the minimum.
 */
export const metadata: Metadata = {
  title: "WiiM Universal Remote",
  description: "HTTP control surface for WiiM / LinkPlay devices",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
