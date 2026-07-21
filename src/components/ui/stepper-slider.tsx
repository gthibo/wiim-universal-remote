"use client";

import { Minus, Plus } from "lucide-react";
import { Slider } from "./slider";
import { clamp, cn } from "@/lib/utils";

/**
 * A slider flanked by −/+ buttons for precise, touch-friendly adjustment
 * (sliders are fiddly on iPad). Buttons step by `bigStep` and commit instantly.
 */
export function StepperSlider({
  value,
  min,
  max,
  step = 1,
  bigStep,
  onChange,
  onCommit,
  disabled,
  ariaLabel,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  bigStep?: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const jump = bigStep ?? step;
  const nudge = (dir: -1 | 1) => {
    const v = clamp(value + dir * jump, min, max);
    if (v === value) return;
    onChange(v);
    onCommit(v);
  };

  const btn =
    "focus-ring grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-foreground transition hover:bg-white/14 active:scale-95 disabled:opacity-40";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <button
        type="button"
        onClick={() => nudge(-1)}
        disabled={disabled || value <= min}
        className={btn}
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : "Decrease"}
      >
        <Minus className="size-4" />
      </button>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onCommit={onCommit}
        disabled={disabled}
        aria-label={ariaLabel}
        className="flex-1"
      />
      <button
        type="button"
        onClick={() => nudge(1)}
        disabled={disabled || value >= max}
        className={btn}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : "Increase"}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
