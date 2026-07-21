import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type AuthUser } from "@/lib/auth/session";
import { assertCsrf, CsrfError } from "@/lib/auth/csrf";

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function apiError(status: number, message: string, code?: string): NextResponse {
  return NextResponse.json({ error: message, code: code ?? null }, { status });
}

interface Guarded {
  user: AuthUser;
}

/**
 * Gate an API route. Returns the authed user, or a ready-to-return
 * NextResponse (401/403) when auth or CSRF fails.
 *
 *   const g = await guard(req, { mutation: true });
 *   if (g instanceof NextResponse) return g;
 *   const { user } = g;
 */
export async function guard(
  req: Request,
  opts: { mutation?: boolean } = {},
): Promise<Guarded | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "Authentication required", "UNAUTHENTICATED");
  if (opts.mutation) {
    try {
      await assertCsrf(req);
    } catch (e) {
      if (e instanceof CsrfError) return apiError(403, "Invalid CSRF token", "CSRF");
      throw e;
    }
  }
  return { user };
}

/** Map a WiiM/library error to an HTTP status. */
export function deviceErrorStatus(code?: string): number {
  switch (code) {
    case "FORBIDDEN_HOST":
      return 400;
    case "UNKNOWN_DEVICE":
      return 404;
    case "UNSUPPORTED":
      return 422;
    case "TIMEOUT":
      return 504;
    default:
      return 502;
  }
}
