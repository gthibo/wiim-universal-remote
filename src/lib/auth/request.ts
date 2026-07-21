import "server-only";
import { config } from "@/lib/config";

/**
 * Resolve the real client IP. Behind Zoraxy we trust X-Forwarded-For; the
 * left-most entry is the original client. When TRUST_PROXY is off we ignore
 * forwarded headers (they'd be spoofable).
 */
export function getClientIp(headers: Headers): string {
  if (config.trustProxy) {
    const xff = headers.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "0.0.0.0";
}

/** The scheme the public client used (https through Zoraxy). */
export function getForwardedProto(headers: Headers): string {
  if (config.trustProxy) {
    const p = headers.get("x-forwarded-proto");
    if (p) return p.split(",")[0]!.trim();
  }
  return config.isProduction ? "https" : "http";
}
