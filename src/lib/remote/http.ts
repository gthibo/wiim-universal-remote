import "server-only";
import { NextResponse } from "next/server";

/**
 * Minimal HTTP helpers for the headless remote service.
 * Extracted from the dashboard's lib/api.ts so the remote routes carry no
 * dependency on sessions, CSRF, or the device DB.
 */

export function apiError(status: number, message: string, code?: string): NextResponse {
  return NextResponse.json({ error: message, code: code ?? null }, { status });
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
