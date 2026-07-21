import "server-only";
import { NextResponse } from "next/server";
import { getDevice, type Device } from "@/lib/db/devices";
import { apiError, deviceErrorStatus, json } from "@/lib/api";
import { WiimError } from "@/lib/wiim/client";

/** Resolve a device by id, or return a 404 response. */
export function resolveDevice(id: string): { device: Device } | { res: NextResponse } {
  const device = getDevice(id);
  if (!device) return { res: apiError(404, "Device not found", "NOT_FOUND") };
  return { device };
}

/** Run a device command, mapping WiiM errors to sensible HTTP statuses. */
export async function runDevice<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    return json({ ok: true, result });
  } catch (e) {
    if (e instanceof WiimError) {
      return apiError(deviceErrorStatus(e.code), e.message, e.code);
    }
    const msg = e instanceof Error ? e.message : "Device error";
    return apiError(502, msg, "DEVICE_ERROR");
  }
}
