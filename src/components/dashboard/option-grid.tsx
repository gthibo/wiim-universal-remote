"use client";

import { DynIcon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface GridOption {
  id: string;
  label: string;
  icon: string;
}

export function OptionGrid({
  options,
  currentId,
  busyId,
  onSelect,
}: {
  options: GridOption[];
  currentId: string | null;
  busyId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const active = o.id === currentId;
        const busy = o.id === busyId;
        return (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            disabled={busy}
            className={cn(
              "focus-ring flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border text-center transition",
              active
                ? "border-primary/60 bg-primary/15 text-foreground shadow-inner"
                : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground",
            )}
          >
            {busy ? (
              <Spinner className="size-5 text-primary" />
            ) : (
              <DynIcon name={o.icon} className={cn("size-5", active && "text-primary")} />
            )}
            <span className="px-1 text-xs font-medium leading-tight">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
