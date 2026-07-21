import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, apiError } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice, runDevice } from "@/lib/device-route";
import { getDevice } from "@/lib/db/devices";
import {
  joinGroup,
  leaveGroup,
  kickSlave,
  setGroupVolume,
  setGroupMute,
} from "@/lib/wiim/multiroom";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join"), masterDeviceId: z.string().min(1) }),
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("kick"), slaveIp: z.string().min(1) }),
  z.object({ action: z.literal("groupVolume"), value: z.number().int().min(0).max(100) }),
  z.object({ action: z.literal("groupMute"), muted: z.boolean() }),
]);

/**
 * Multiroom / group-sync actions: join a master, leave the group, kick a
 * slave, set whole-group volume, or set whole-group mute. Role/slave topology
 * already rides on the existing snapshot via DeviceInfo, so no GET is needed.
 */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const data = parsed.data;
  switch (data.action) {
    case "join": {
      const master = getDevice(data.masterDeviceId);
      if (!master) {
        return apiError(404, "Master device not found", "MASTER_NOT_FOUND");
      }
      return runDevice(() => joinGroup(r.device.host, master.host));
    }
    case "leave":
      return runDevice(() => leaveGroup(r.device.host));
    case "kick":
      return runDevice(() => kickSlave(r.device.host, data.slaveIp));
    case "groupVolume":
      return runDevice(() => setGroupVolume(r.device.host, data.value));
    case "groupMute":
      return runDevice(() => setGroupMute(r.device.host, data.muted));
  }
}
