import "server-only";
import { control } from "@/lib/wiim/commands";

/**
 * Server-side alarms, keyed by device id. The timer lives in the Node process
 * so it fires even with no browser open; on expiry it resumes the device.
 * Cached on globalThis to survive dev hot-reload. Alarms are in-memory only
 * and do not survive a server restart; persistent alarms are a follow-up.
 */

type Entry = { firesAt: number; timer: ReturnType<typeof setTimeout> };
const store = globalThis as typeof globalThis & { __wiimAlarm?: Map<string, Entry> };
const timers = (store.__wiimAlarm ??= new Map<string, Entry>());
const MAX_DELAY = 24 * 60 * 60_000;

export function setAlarm(deviceId: string, host: string, epochMs: number): number {
  const ms = epochMs - Date.now();
  if (ms <= 0) throw new RangeError("Alarm time must be in the future");
  if (ms > MAX_DELAY) throw new RangeError("Alarm time must be within 24 hours");

  cancelAlarm(deviceId);
  const timer = setTimeout(() => {
    timers.delete(deviceId);
    void control(host, "play").catch(() => {});
  }, ms);
  (timer as { unref?: () => void }).unref?.();
  timers.set(deviceId, { firesAt: epochMs, timer });
  return epochMs;
}

export function cancelAlarm(deviceId: string): void {
  const e = timers.get(deviceId);
  if (e) {
    clearTimeout(e.timer);
    timers.delete(deviceId);
  }
}

/** Epoch-ms fire time for the device's alarm, or null if none/expired. */
export function getAlarm(deviceId: string): number | null {
  const e = timers.get(deviceId);
  if (!e) return null;
  if (e.firesAt <= Date.now()) {
    clearTimeout(e.timer);
    timers.delete(deviceId);
    return null;
  }
  return e.firesAt;
}
