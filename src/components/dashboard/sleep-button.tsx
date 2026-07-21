"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Moon } from "lucide-react";
import { apiSend, ApiError } from "@/lib/client/api";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const OPTIONS = [15, 30, 45, 60, 90, 120];

/**
 * Sleep-timer control: pause the device after N minutes. The timer is held
 * server-side (so it fires even with the browser closed); this just shows the
 * live countdown and posts set/cancel.
 */
export function SleepButton({
  deviceId,
  expiresAt,
  onChanged,
}: {
  deviceId: string;
  expiresAt: number | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());
  const active = expiresAt != null && expiresAt > now;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const remainLabel = active ? fmt(expiresAt! - now) : null;

  async function set(minutes: number) {
    try {
      await apiSend(`/api/devices/${deviceId}/sleep`, "POST", { minutes });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't set sleep timer", "error");
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Sleep timer"
          title="Sleep timer"
          className={cn(
            "focus-ring inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
          )}
        >
          <Moon style={{ width: "1.2rem", height: "1.2rem", filter: "drop-shadow(0 1px 1px hsl(0 0% 0% / 0.55))" }} />
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
            Pause after…
          </DropdownMenu.Label>
          {OPTIONS.map((m) => (
            <DropdownMenu.Item
              key={m}
              onSelect={() => void set(m)}
              className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm outline-none transition data-[highlighted]:bg-white/8"
            >
              {m} minutes
            </DropdownMenu.Item>
          ))}
          {active && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => void set(0)}
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
