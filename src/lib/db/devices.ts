import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, now } from "./index";
import type { DeviceCapabilities, DeviceInfo } from "@/lib/wiim/types";

interface DeviceRow {
  id: string;
  name: string;
  host: string;
  port: number;
  capabilities: string | null;
  info: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  capabilities: DeviceCapabilities | null;
  info: DeviceInfo | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

function toDevice(r: DeviceRow): Device {
  return {
    id: r.id,
    name: r.name,
    host: r.host,
    port: r.port,
    capabilities: r.capabilities ? (JSON.parse(r.capabilities) as DeviceCapabilities) : null,
    info: r.info ? (JSON.parse(r.info) as DeviceInfo) : null,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listDevices(): Device[] {
  const rows = getDb()
    .prepare("SELECT * FROM devices ORDER BY sort_order ASC, created_at ASC")
    .all() as DeviceRow[];
  return rows.map(toDevice);
}

export function getDevice(id: string): Device | null {
  const r = getDb().prepare("SELECT * FROM devices WHERE id = ?").get(id) as DeviceRow | undefined;
  return r ? toDevice(r) : null;
}

export function getDeviceByHost(host: string): Device | null {
  const r = getDb().prepare("SELECT * FROM devices WHERE host = ?").get(host) as DeviceRow | undefined;
  return r ? toDevice(r) : null;
}

export function createDevice(input: {
  name: string;
  host: string;
  port?: number;
  capabilities?: DeviceCapabilities | null;
  info?: DeviceInfo | null;
}): Device {
  const ts = now();
  const id = randomUUID();
  const maxOrder =
    (getDb().prepare("SELECT MAX(sort_order) AS m FROM devices").get() as { m: number | null }).m ?? 0;
  getDb()
    .prepare(
      `INSERT INTO devices (id, name, host, port, capabilities, info, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      input.host,
      input.port ?? 443,
      input.capabilities ? JSON.stringify(input.capabilities) : null,
      input.info ? JSON.stringify(input.info) : null,
      maxOrder + 1,
      ts,
      ts,
    );
  return getDevice(id)!;
}

export function updateDevice(
  id: string,
  patch: Partial<{
    name: string;
    host: string;
    port: number;
    capabilities: DeviceCapabilities | null;
    info: DeviceInfo | null;
    sortOrder: number;
  }>,
): Device | null {
  const existing = getDevice(id);
  if (!existing) return null;
  const next = {
    name: patch.name ?? existing.name,
    host: patch.host ?? existing.host,
    port: patch.port ?? existing.port,
    capabilities:
      patch.capabilities !== undefined ? patch.capabilities : existing.capabilities,
    info: patch.info !== undefined ? patch.info : existing.info,
    sortOrder: patch.sortOrder ?? existing.sortOrder,
  };
  getDb()
    .prepare(
      `UPDATE devices SET name = ?, host = ?, port = ?, capabilities = ?, info = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      next.name,
      next.host,
      next.port,
      next.capabilities ? JSON.stringify(next.capabilities) : null,
      next.info ? JSON.stringify(next.info) : null,
      next.sortOrder,
      now(),
      id,
    );
  return getDevice(id);
}

export function deleteDevice(id: string): void {
  getDb().prepare("DELETE FROM devices WHERE id = ?").run(id);
}
