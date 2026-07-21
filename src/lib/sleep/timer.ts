import "server-only";
import { control } from "@/lib/wiim/commands";

/**
 * Server-side sleep timers, keyed by device id. The timer lives in the Node
 * process so it fires even with no browser open (like the scrobbler); on expiry
 * it pauses the device. Cached on globalThis to survive dev hot-reload. Timers
 * are short-lived, so losing them on a server restart is acceptable.
 */

type Entry = { expiresAt: number; timer: ReturnType<typeof setTimeout> };
const store = globalThis as typeof globalThis & { __wiimSleep?: Map<string, Entry> };
const timers = (store.__wiimSleep ??= new Map<string, Entry>());

export function setSleep(deviceId: string, host: string, minutes: number): number {
  cancelSleep(deviceId);
  const ms = Math.max(1, Math.min(720, Math.round(minutes))) * 60_000;
  const expiresAt = Date.now() + ms;
  const timer = setTimeout(() => {
    timers.delete(deviceId);
    void control(host, "pause").catch(() => {});
  }, ms);
  (timer as { unref?: () => void }).unref?.();
  timers.set(deviceId, { expiresAt, timer });
  return expiresAt;
}

export function cancelSleep(deviceId: string): void {
  const e = timers.get(deviceId);
  if (e) {
    clearTimeout(e.timer);
    timers.delete(deviceId);
  }
}

/** Epoch-ms expiry for the device's sleep timer, or null if none/expired. */
export function getSleep(deviceId: string): number | null {
  const e = timers.get(deviceId);
  if (!e) return null;
  if (e.expiresAt <= Date.now()) {
    clearTimeout(e.timer);
    timers.delete(deviceId);
    return null;
  }
  return e.expiresAt;
}
