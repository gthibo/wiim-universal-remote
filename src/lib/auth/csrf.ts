import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { CSRF_COOKIE } from "./session";

export class CsrfError extends Error {
  constructor(detail: string) {
    super(`CSRF check failed: ${detail}`);
    this.name = "CsrfError";
  }
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function appOriginHost(): string | null {
  const o = config.appOrigin ? safeUrl(config.appOrigin) : null;
  return o?.host ?? null;
}

/**
 * Origin/Referer host must match the request host (or APP_ORIGIN). Used on its
 * own for pre-session POSTs (login, first-run setup) where no CSRF cookie
 * exists yet, and as the first step of the full double-submit check.
 */
export function assertSameOrigin(req: Request): void {
  const host = req.headers.get("host");
  const appHost = appOriginHost();
  const allowedHosts = new Set([host, appHost].filter(Boolean) as string[]);

  const origin = req.headers.get("origin");
  if (origin) {
    const o = safeUrl(origin);
    if (!o || !allowedHosts.has(o.host)) throw new CsrfError("origin mismatch");
  } else {
    const referer = req.headers.get("referer");
    const r = referer ? safeUrl(referer) : null;
    if (!r || !allowedHosts.has(r.host)) throw new CsrfError("missing/!matching referer");
  }
}

/**
 * Enforce CSRF protection on state-changing requests:
 *  1. Origin/Referer host must match the request host (or APP_ORIGIN).
 *  2. Double-submit: the x-csrf-token header must equal the wiim_csrf cookie.
 * Combined with SameSite=Lax cookies this blocks cross-site forgery.
 */
export async function assertCsrf(req: Request): Promise<void> {
  assertSameOrigin(req);

  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || !timingSafeEqualStr(cookieToken, headerToken)) {
    throw new CsrfError("token mismatch");
  }
}
