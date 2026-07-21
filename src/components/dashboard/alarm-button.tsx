"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AlarmClock } from "lucide-react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

/**
 * Alarm control: resume the device at a wall-clock time. The alarm is held
 * server-side; this just shows the live countdown and posts set/cancel.
 */
export function AlarmButton({
  deviceId,
  firesAt,
  onChanged,
}: {
  deviceId: string;
  firesAt: number | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [time, setTime] = useState("");
  const [currentFiresAt, setCurrentFiresAt] = useState(firesAt);
  const active = currentFiresAt != null && currentFiresAt > now;

  useEffect(() => setCurrentFiresAt(firesAt), [firesAt]);

  useEffect(() => {
    void apiGet<{ firesAt: number | null }>(`/api/devices/${deviceId}/alarm`)
      .then(({ firesAt }) => setCurrentFiresAt(firesAt))
      .catch(() => {});
  }, [deviceId]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const remainLabel = active ? fmt(currentFiresAt! - now) : null;

  async function set() {
    if (!time) return;
    const [hours, minutes] = time.split(":").map(Number);
    const firesAt = new Date();
    firesAt.setHours(hours, minutes, 0, 0);
    if (firesAt.getTime() <= Date.now()) firesAt.setDate(firesAt.getDate() + 1);

    try {
      const result = await apiSend<{ firesAt: number | null }>(`/api/devices/${deviceId}/alarm`, "POST", {
        epochMs: firesAt.getTime(),
      });
      setCurrentFiresAt(result.firesAt);
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't set alarm", "error");
    }
  }

  async function cancel() {
    try {
      const result = await apiSend<{ firesAt: number | null }>(`/api/devices/${deviceId}/alarm`, "POST", { epochMs: 0 });
      setCurrentFiresAt(result.firesAt);
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't cancel alarm", "error");
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Alarm"
          title="Alarm"
          className={cn(
            "focus-ring inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
          )}
        >
          <AlarmClock style={{ width: "1.2rem", height: "1.2rem", filter: "drop-shadow(0 1px 1px hsl(0 0% 0% / 0.55))" }} />
          {active && <span className="tabular-nums">{remainLabel}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="glass z-50 min-w-40 rounded-2xl p-1.5 shadow-2xl"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground">
            Resume at…
          </DropdownMenu.Label>
          <div className="px-2 pb-1">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl bg-white/8 px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <DropdownMenu.Item
            disabled={!time}
            onSelect={() => void set()}
            className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm outline-none transition data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-white/8"
          >
            Set alarm
          </DropdownMenu.Item>
          {active && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => void cancel()}
                className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm text-destructive outline-none transition data-[highlighted]:bg-white/8"
              >
                Turn off
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
