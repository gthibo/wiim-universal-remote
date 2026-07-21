import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "wiim_session";
const PUBLIC_PATHS = ["/login", "/setup"];

/** Generate a base64 CSP nonce using Web Crypto (edge-runtime safe). */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";
  // When served over plain http (LAN testing), don't force-upgrade subresources
  // to https or send HSTS — that would break script/style loading (white page).
  const httpsMode = process.env.COOKIE_SECURE !== "false";
  const nonce = makeNonce();

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: ${isDev ? "'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://challenges.cloudflare.com ${isDev ? "ws:" : ""}`,
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    ...(httpsMode ? ["upgrade-insecure-requests"] : []),
  ]
    .join("; ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  // ---- page auth gate (cookie presence only; real check is server-side) ----
  const isApi = pathname.startsWith("/api");
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isApi && !isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    return applySecurity(NextResponse.redirect(url), csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurity(response, csp);
}

function applySecurity(res: NextResponse, csp: string): NextResponse {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  // HSTS only makes sense (and is only honoured) over https.
  if (process.env.COOKIE_SECURE !== "false") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  // Run on everything except Next internals and static assets. sw.js must be
  // reachable without a session — the auth gate redirecting it to /login (a
  // 307) makes every browser reject the service worker registration outright
  // (a redirected script response is invalid), which silently broke the
  // installable-PWA feature entirely: pwa-register.tsx's registration call
  // swallows the resulting error (.catch(() => {})). icon-192.png/icon-512.png
  // need the same exclusion — the manifest's installability check fetches
  // them unauthenticated too, before any login has happened.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|apple-icon.png|manifest.webmanifest|robots.txt|sw.js).*)",
  ],
};
