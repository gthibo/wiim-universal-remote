"use client";

import { useEffect, useState, type CSSProperties } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { CircleDot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { apiSend, ApiError } from "@/lib/client/api";
import { SUB_RANGES } from "@/lib/wiim/constants";
import { cn } from "@/lib/utils";
import type { SubwooferStatus } from "@/lib/wiim/types";

/**
 * SHOWA RE-SKIN: Sub-out panel.
 *
 * Round 32 — re-skins sub-card.tsx to match the walnut/faceplate mockup:
 * same rectilinear .glass Card + two-layer feTurbulence grain (unique filter
 * IDs subPanelGrain / subPanelGrain2), a SUB-OUT wordmark, the shared
 * PowerKnob (power-btn.png / power-off-overlay.png, no ON/OFF labels), two
 * horizontal sliders (Level, Crossover) each with live −/+ step buttons and
 * a value readout, and a Phase row with two tan-tile buttons each carrying
 * the PNG LED (led-on.png / led-off.png).
 *
 * "connected" pill removed entirely — the prop still exists on SubwooferStatus
 * but is not rendered (sub.connected is intentionally unused here).
 *
 * Data layer unchanged: apiSend to /api/devices/${deviceId}/sub, SUB_RANGES,
 * SubwooferStatus. src/-only (no _showa/ mirror for data layer files).
 *
 * Reused assets (public/, baked on --build):
 *   • power-btn.png / power-off-overlay.png — enable toggle knob
 *   • eq-knob.png                           — horizontal slider thumb
 *   • eq-buttons.png                        — tan tile face for Phase buttons
 *   • led-on.png / led-off.png              — PNG indicator lamps
 */

// Tan tile face — same recipe as eq-card TabButton / Phase buttons.
const TAB_FACE: CSSProperties = {
  backgroundImage: "url(/eq-buttons.png)",
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
};

export function SubCard({
  deviceId,
  sub,
  onChanged,
}: {
  deviceId: string;
  sub: SubwooferStatus;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [level, setLevel] = useState(sub.level);
  const [cross, setCross] = useState(sub.crossover);
  const [enabled, setEnabled] = useState(sub.enabled);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) {
      setLevel(sub.level);
      setCross(sub.crossover);
    }
    setEnabled(sub.enabled);
  }, [sub.level, sub.crossover, sub.enabled, dragging]);

  async function set(param: string, value: number, revert?: () => void) {
    try {
      await apiSend(`/api/devices/${deviceId}/sub`, "POST", { param, value });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Sub-out command failed", "error");
      revert?.();
    }
  }

  return (
    <Card className="relative overflow-hidden p-0">
      {/* Panel face texture — unique filter IDs so they don't collide with
          eqPanelGrain / eqPanelGrain2 on the same page. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.07 }}
      >
        <filter id="subPanelGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves={2}
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix in="n" type="saturate" values="0" result="d" />
          <feComponentTransfer in="d">
            <feFuncR type="linear" slope="2.6" intercept="-0.8" />
            <feFuncG type="linear" slope="2.6" intercept="-0.8" />
            <feFuncB type="linear" slope="2.6" intercept="-0.8" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#subPanelGrain)" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.1 }}
      >
        <filter id="subPanelGrain2">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.45"
            numOctaves={2}
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix in="n" type="saturate" values="0" result="d" />
          <feComponentTransfer in="d">
            <feFuncR type="linear" slope="2.6" intercept="-0.8" />
            <feFuncG type="linear" slope="2.6" intercept="-0.8" />
            <feFuncB type="linear" slope="2.6" intercept="-0.8" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#subPanelGrain2)" />
      </svg>

      {/* ── Header: wordmark (left) | POWER knob (right) ── */}
      <div className="relative z-10 flex items-start justify-between gap-6 pl-6 pr-[1.8rem] pt-6">
        <h3 className="font-display text-lg uppercase tracking-[0.15em] text-[hsl(var(--faceplate)/0.75)]">
          <span className="mr-2 inline-flex items-center">
            <CircleDot className="size-4" aria-hidden />
          </span>
          Sub-Out
        </h3>
        <PowerKnob
          enabled={enabled}
          onToggle={() => {
            const next = !enabled;
            setEnabled(next);
            void set("status", next ? 1 : 0, () => setEnabled(!next));
          }}
        />
      </div>

      {/* ── Body: sliders + phase — dims when disabled ── */}
      <div
        className={cn(
          "relative z-10 space-y-6 px-36 pb-6 pt-5 transition-opacity",
          !enabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Level — tick every 1 dB, no labels */}
        <SubSlider
          label="Level"
          value={level}
          min={SUB_RANGES.level.min}
          max={SUB_RANGES.level.max}
          step={SUB_RANGES.level.step}
          unit={SUB_RANGES.level.unit}
          formatValue={(v) => (v > 0 ? `+${v}` : String(v))}
          ticks={Array.from({ length: 31 }, (_, i) => -15 + i)}
          onChange={(v) => {
            setDragging(true);
            setLevel(v);
          }}
          onCommit={(v) => {
            setDragging(false);
            void set("level", v);
          }}
          onStep={(v) => void set("level", v)}
        />

        {/* Crossover — ticks at 50/100/150/200 Hz only, no labels */}
        <SubSlider
          label="Crossover"
          value={cross}
          min={SUB_RANGES.cross.min}
          max={SUB_RANGES.cross.max}
          step={SUB_RANGES.cross.step}
          unit={SUB_RANGES.cross.unit}
          formatValue={(v) => String(v)}
          ticks={[50, 100, 150, 200]}
          onChange={(v) => {
            setDragging(true);
            setCross(v);
          }}
          onCommit={(v) => {
            setDragging(false);
            void set("cross", v);
          }}
          onStep={(v) => void set("cross", v)}
        />

        {/* Phase */}
        <div className="flex items-center gap-5">
          <span className="shrink-0 font-sans text-sm text-[hsl(var(--faceplate)/0.55)]">
            Phase
          </span>
          <div className="flex gap-2">
            {SUB_RANGES.phase.values.map((p) => (
              <PhaseButton
                key={p}
                value={p}
                active={sub.phase === p}
                onClick={() => void set("phase", p)}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Power knob (shared recipe with eq-card, no ON/OFF labels) ──────────────

function PowerKnob({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 pr-[1.8rem]">
      <span className="font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--faceplate)/0.7)]">
        Power
      </span>
      <div className="relative size-11">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn sub-out off" : "Turn sub-out on"}
          className="focus-ring relative block size-11 rounded-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/power-btn.png" alt="" draggable={false} className="size-full select-none" />
          {!enabled && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/power-off-overlay.png"
              alt=""
              draggable={false}
              className="absolute inset-0 size-full select-none"
            />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Sub slider: recessed groove + eq-knob.png thumb + −/+ step buttons ────

function SubSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  formatValue,
  ticks,
  onChange,
  onCommit,
  onStep,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  formatValue: (v: number) => string;
  ticks?: number[];
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  onStep: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div className="flex flex-col gap-2">
      {/* label row: name left, value right */}
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm text-[hsl(var(--faceplate)/0.55)]">{label}</span>
        <span className="font-mono text-sm tabular-nums text-[hsl(var(--faceplate)/0.8)]">
          {formatValue(value)}&nbsp;{unit}
        </span>
      </div>

      {/* track row: − | slider | + */}
      <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {/* − step button */}
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => {
            const next = clamp(value - step);
            onChange(next);
            onStep(next);
          }}
          className="focus-ring flex size-6 shrink-0 items-center justify-center font-sans text-base leading-none text-[hsl(var(--faceplate)/0.5)] transition-colors hover:text-[hsl(var(--faceplate)/0.9)]"
        >
          −
        </button>

        {/* recessed slider groove — same recipe as PeqSlider in eq-card */}
        <SliderPrimitive.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => onChange(v[0]!)}
          onValueCommit={(v) => onCommit(v[0]!)}
          aria-label={label}
        >
          <SliderPrimitive.Track
            className="relative h-[8px] w-full grow overflow-visible rounded-full"
            style={{
              background: "hsl(30 10% 4%)",
              boxShadow:
                "inset 0 1px 2px hsl(0 0% 0% / 0.95), inset 0 0 0 1px hsl(0 0% 0% / 0.7), inset 0 -1px 0 hsl(var(--faceplate) / 0.06)",
            }}
          >
            <SliderPrimitive.Range className="absolute h-full rounded-full" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className="focus-ring block cursor-grab active:cursor-grabbing"
            aria-label={label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/eq-knob.png"
              alt=""
              draggable={false}
              className="w-6 max-w-none select-none"
              style={{ filter: "drop-shadow(3px 4px 4px rgba(0, 0, 0, 0.9))" }}
            />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>

        {/* + step button */}
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => {
            const next = clamp(value + step);
            onChange(next);
            onStep(next);
          }}
          className="focus-ring flex size-6 shrink-0 items-center justify-center font-sans text-base leading-none text-[hsl(var(--faceplate)/0.5)] transition-colors hover:text-[hsl(var(--faceplate)/0.9)]"
        >
          +
        </button>
      </div>
      {/* tick row — sits below the slider track, aligned to the track's
          own width (the slider excludes the −/+ buttons via the outer flex gap) */}
      {ticks && ticks.length > 0 && (
        <div className="relative mx-9 h-[6px]">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 w-px"
              style={{
                left: `${((t - min) / (max - min)) * 100}%`,
                height: "5px",
                background: "hsl(var(--faceplate) / 0.25)",
              }}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

// ── Phase selector button: tan tile + PNG LED ──────────────────────────────

function PhaseButton({
  value,
  active,
  onClick,
}: {
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-ring flex h-9 items-center gap-2 px-4"
      style={TAB_FACE}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={active ? "/led-on.png" : "/led-off.png"}
        alt=""
        draggable={false}
        className="h-[0.7rem] w-[0.7rem] shrink-0 select-none"
      />
      <span
        className={cn(
          "whitespace-nowrap font-sans text-xs transition-colors",
          active ? "text-[hsl(var(--static))]" : "text-[hsl(var(--static)/0.7)]",
        )}
      >
        {value}°
      </span>
    </button>
  );
}
