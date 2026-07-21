"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Users, LogOut, UserMinus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { apiSend, ApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { DeviceListItem } from "@/lib/client/hooks";

/**
 * Multiroom / group-sync card. Shows the device's role (solo/master/slave) and
 * the controls for joining, leaving, kicking slaves, and setting whole-group
 * volume / mute. All underlying device commands are needs-testing (no test
 * hardware — see docs/API-CAPABILITY-RESEARCH.md); this card is purely
 * defensive plumbing that fails soft on errors via toast.
 *
 * Renders null when fewer than 2 devices are configured (multiroom is
 * meaningless with one device) — that's the only visibility gate.
 */
export function MultiroomCard({
  deviceId,
  devices,
  role,
  masterIp,
  slaves,
  onChanged,
}: {
  deviceId: string;
  devices: DeviceListItem[];
  role: "solo" | "master" | "slave";
  masterIp: string | null;
  slaves: { ip: string; uuid: string }[];
  onChanged: () => void;
}) {
  if (devices.length < 2) return null;

  return (
    <Card className="p-0">
      <CardHeader
        icon={<Users className="size-4" />}
        title="Multiroom"
        action={null}
      />
      <div className="px-5 pb-5 pt-3">
        {role === "solo" && (
          <SoloControls deviceId={deviceId} devices={devices} onChanged={onChanged} />
        )}
        {role === "slave" && (
          <SlaveControls
            deviceId={deviceId}
            masterIp={masterIp}
            devices={devices}
            onChanged={onChanged}
          />
        )}
        {role === "master" && (
          <MasterControls
            deviceId={deviceId}
            slaves={slaves}
            devices={devices}
            onChanged={onChanged}
          />
        )}
      </div>
    </Card>
  );
}

/** Resolve a LAN IP to a friendly device name from the devices list. */
function resolveName(ip: string | null, devices: DeviceListItem[]): string {
  if (!ip) return "Unknown";
  const match = devices.find(
    (d) => d.info?.ip === ip || d.host === ip,
  );
  return match?.name ?? ip;
}

function SoloControls({
  deviceId,
  devices,
  onChanged,
}: {
  deviceId: string;
  devices: DeviceListItem[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const others = devices.filter((d) => d.id !== deviceId);

  async function join(masterDeviceId: string) {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "join",
        masterDeviceId,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't join group", "error");
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">This device is standalone.</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="focus-ring inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/25"
          >
            Join group…
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            className="glass z-50 min-w-40 rounded-2xl p-1.5 shadow-2xl"
          >
            <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground">
              Follow…
            </DropdownMenu.Label>
            {others.map((d) => (
              <DropdownMenu.Item
                key={d.id}
                onSelect={() => void join(d.id)}
                className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm outline-none transition data-[highlighted]:bg-white/8"
              >
                {d.name}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function SlaveControls({
  deviceId,
  masterIp,
  devices,
  onChanged,
}: {
  deviceId: string;
  masterIp: string | null;
  devices: DeviceListItem[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const masterName = resolveName(masterIp, devices);

  async function leave() {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", { action: "leave" });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't leave group", "error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">
        Following <span className="font-medium text-foreground">{masterName}</span>
      </span>
      <button
        onClick={() => void leave()}
        className="focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
      >
        <LogOut className="size-3.5" />
        Leave group
      </button>
    </div>
  );
}

function MasterControls({
  deviceId,
  slaves,
  devices,
  onChanged,
}: {
  deviceId: string;
  slaves: { ip: string; uuid: string }[];
  devices: DeviceListItem[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);

  async function kick(slaveIp: string) {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "kick",
        slaveIp,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't kick slave", "error");
    }
  }

  async function commitVolume(v: number) {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "groupVolume",
        value: v,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't set group volume", "error");
    }
  }

  async function commitMute(next: boolean) {
    setMuted(next);
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "groupMute",
        muted: next,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't set group mute", "error");
      setMuted(!next);
    }
  }

  return (
    <div className="space-y-4">
      {slaves.length === 0 && (
        <p className="text-sm text-muted-foreground">No slaves connected.</p>
      )}
      <div className="space-y-2">
        {slaves.map((s) => (
          <div
            key={s.ip || s.uuid}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="truncate text-foreground">{resolveName(s.ip, devices)}</span>
            <button
              onClick={() => void kick(s.ip)}
              className="focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
            >
              <UserMinus className="size-3" />
              Kick
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Group volume</span>
          <span className="font-mono text-sm tabular-nums text-foreground">{volume}</span>
        </div>
        <SliderPrimitive.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0]!)}
          onValueCommit={(v) => void commitVolume(v[0]!)}
          aria-label="Group volume"
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="focus-ring block size-4 cursor-grab rounded-full bg-foreground shadow active:cursor-grabbing" />
        </SliderPrimitive.Root>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Group mute</span>
        <SwitchPrimitive.Root
          checked={muted}
          onCheckedChange={(v) => void commitMute(v)}
          className={cn(
            "focus-ring relative h-5 w-9 rounded-full transition-colors",
            muted ? "bg-primary" : "bg-white/15",
          )}
          aria-label="Group mute"
        >
          <SwitchPrimitive.Thumb
            className={cn(
              "block size-4 rounded-full bg-white shadow transition-transform",
              muted ? "translate-x-[1.125rem]" : "translate-x-[0.125rem]",
            )}
          />
        </SwitchPrimitive.Root>
      </div>
    </div>
  );
}
