"use client";

import { Thermometer } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";

function tempColor(t: number): string {
  if (t < 50) return "hsl(var(--success))";
  if (t < 65) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function Gauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value / 90));
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = tempColor(value);
  return (
    <div className="relative grid size-36 place-items-center">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums" style={{ color }}>
          {Math.round(value)}°
        </span>
        <span className="text-xs text-muted-foreground">CPU</span>
      </div>
    </div>
  );
}

export function TempCard({ cpu, board }: { cpu: number | null; board: number | null }) {
  if (cpu == null && board == null) return null;
  return (
    <Card className="pb-6">
      <CardHeader icon={<Thermometer className="size-4" />} title="Temperature" />
      <div className="flex flex-col items-center gap-3 px-5 pt-4">
        {cpu != null && <Gauge value={cpu} />}
        {board != null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Board</span>
            <span className="tabular-nums font-medium" style={{ color: tempColor(board) }}>
              {Math.round(board)}°C
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
