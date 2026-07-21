"use client";

import { useEffect, useState, type CSSProperties } from "react";
import useSWR from "swr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { ChevronDown, Check, Save, Trash2, Pencil, RotateCcw, SlidersVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/toast";
import { useConfirm, usePrompt } from "@/components/modal";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { GRAPHIC_GAIN, PEQ_RANGE, PEQ_MODES, PEQ_LETTERS } from "@/lib/wiim/eq-constants";
import type { EqOverview, EqType, ParametricBand, PeqChannel, PeqChannelMode } from "@/lib/wiim/types";

/**
 * SHOWA RE-SKIN: Equalizer panel.
 *
 * Round 28 (this pass) — re-skins the SHARED chrome + the GRAPHIC EQ view to
 * the walnut/faceplate mockup: one rectilinear .glass panel with the two-layer
 * feTurbulence grain (unique filter IDs eqPanelGrain / eqPanelGrain2), an
 * "EQUALIZER" wordmark, tan tile tabs (source + Graphic/Parametric) each with a
 * CSS indicator LED, a POWER knob that replaces the old Switch as the enable
 * toggle (lit = enabled, dark overlay = disabled), a 10-fader graphic bank with
 * recessed grooves + tick marks + a cream knob-cap thumb (eq-knob.png), and a
 * footer with a tan "Presets" dropdown tile plus rename/delete/save tiles.
 *
 * Round 29 (this pass) — re-skins the PARAMETRIC EQ view: 10 bands (a–j),
 * each row = band letter, a tan-tile Type dropdown, a recessed Freq readout,
 * and two hardware-style horizontal sliders (Q, then Gain — deliberately in
 * that order per the mockup) sharing the eq-knob.png cap (scaled down) from
 * the Graphic faders. Q runs on a LOG scale (0.1–24, most useful range is
 * narrow) with ticks at 0.1/0.5/1/2/4/8/16/24; Gain is linear (-12..+12dB)
 * with ticks at -12/-6/0/+6/+12. Both axes render tick marks BELOW the
 * track (not inline on it), with the reference tick (Q=1, Gain=0dB) slightly
 * taller/brighter. All data-layer wiring (SWR fetch, `send`, per-source tabs,
 * preset load/save/rename/delete) is unchanged from the original; only the
 * presentation changed.
 *
 * Assets (Greg placed in public/, baked on --build):
 *   • eq-knob.png (66×72)          — cream fader cap / slider thumb.
 *   • eq-buttons.png (182×49)      — flat tan tile face for the wide tabs +
 *                                    Presets button (background-size 100% 100%;
 *                                    the swatch is near-flat so stretching to
 *                                    each control's width doesn't distort).
 *   • eq-save-button.png (88×53)   — tan tile face for the small square
 *                                    rename/delete/save buttons.
 *   • power-btn.png (55×56)        — lit POWER knob base.
 *   • power-off-overlay.png (55×56)— dark cap laid over the knob when disabled.
 * The tab/button faces are LIGHT tan, so their labels/icons are dark
 * (hsl(var(--static))), per the mockup — the opposite of the dark panels
 * elsewhere. The indicator LED is a pure-CSS dot (Greg's call: LED on every
 * tab incl. the parametric one the mockup was missing).
 */

type Overview = EqOverview & { source: string };

// Flat tan tile faces. Content (LED + label / icon) sits on top. Stretched to
// each control's width via background-size:100% 100% — the swatches are nearly
// flat, so bevel distortion is negligible at --radius. Swap to `.control-tile`
// if the stretch ever reads off once live.
const TAB_FACE: CSSProperties = {
  backgroundImage: "url(/eq-buttons.png)",
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
};
const SAVE_FACE: CSSProperties = {
  backgroundImage: "url(/eq-save-button.png)",
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
};

export function EqCard({ deviceId, initialSource }: { deviceId: string; initialSource?: string | null }) {
  const toast = useToast();
  const [source, setSource] = useState<string | null>(initialSource ?? null);
  const [subTab, setSubTab] = useState<EqType>("graphic");
  const [peqChan, setPeqChan] = useState<"left" | "right">("left");

  const base = `/api/devices/${deviceId}/eq`;
  const key = `${base}${source ? `?source=${encodeURIComponent(source)}` : ""}`;
  const { data, isLoading, mutate } = useSWR<Overview>(key, (u: string) => apiGet<Overview>(u), {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (data?.source && source === null) setSource(data.source);
  }, [data?.source, source]);

  async function send(body: Record<string, unknown>) {
    try {
      await apiSend(base, "POST", body);
      await mutate();
    } catch (e) {
      toast((e as ApiError).message || "EQ command failed", "error");
      await mutate();
    }
  }

  if (!data && isLoading) {
    return (
      <Card className="flex items-center justify-center py-10">
        <Spinner className="size-6 text-primary" />
      </Card>
    );
  }
  // Kill-switch: firmware doesn't expose the EQ v2 API (or errored) → hide.
  if (!data || !data.supported || !data.state) return null;

  const st = data.state;
  const enabled = st.enabled;
  const presets = data.presets?.[subTab] ?? { custom: [], preset: [] };
  const currentName = subTab === "graphic" ? st.graphic.name : st.parametric.name;
  const peqMode = st.parametric.channelMode;
  const activeChan: PeqChannel = peqMode === "lr" ? peqChan : "stereo";
  const peqBands = st.parametric.bands[activeChan] ?? [];

  return (
    <Card className="relative overflow-hidden p-0">
      {/* SHOWA RE-SKIN: panel face texture — same recipe as the presets /
          now-playing control panels, unique filter IDs since all render on the
          same page. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.07 }}
      >
        <filter id="eqPanelGrain">
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
        <rect width="100%" height="100%" filter="url(#eqPanelGrain)" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.1 }}
      >
        <filter id="eqPanelGrain2">
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
        <rect width="100%" height="100%" filter="url(#eqPanelGrain2)" />
      </svg>

      {/* ── Header: wordmark + tabs (left) | POWER knob (right) ───────────── */}
      <div className="relative z-10 flex items-start justify-between gap-6 pl-6 pr-8 pt-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h3 className="font-display text-lg uppercase tracking-[0.15em] text-[hsl(var(--faceplate)/0.75)]">
            <span className="mr-2 inline-flex items-center">
              <SlidersVertical className="size-4" aria-hidden />
            </span>
            Equalizer
          </h3>
          <div className="flex flex-wrap items-center gap-x-16 gap-y-3">
            {/* Source tabs (device-driven — renders whatever sources the unit
                exposes, not the fixed mockup six). Graphic/Parametric now sit
                a fixed gap after these instead of being pushed to the far
                right by justify-between (Greg: bring them left, closer to the
                source row, rather than stretched to the panel edge). */}
            <div className="flex flex-wrap gap-2">
              {data.sources.map((s) => (
                <TabButton
                  key={s.key}
                  label={s.label}
                  active={s.key === st.source}
                  onClick={() => setSource(s.key)}
                />
              ))}
            </div>
            {/* Graphic / Parametric sub-tabs + PEQ mode controls. */}
            <div className="flex shrink-0 items-center gap-2">
              {(["graphic", "parametric"] as EqType[]).map((t) => (
                <TabButton
                  key={t}
                  label={t === "graphic" ? "Graphic EQ" : "Parametric EQ"}
                  active={subTab === t}
                  onClick={() => setSubTab(t)}
                />
              ))}
              {subTab === "parametric" && (
                <>
                  <PeqModeDropdown
                    mode={peqMode}
                    onSelect={(m) =>
                      void send({
                        action: "setChannelMode",
                        source: st.source,
                        mode: m === "lr" ? "L/R" : "Stereo",
                      })
                    }
                  />
                  {peqMode === "lr" && (
                    <div className="flex gap-1">
                      <ChannelButton label="L" active={peqChan === "left"} onClick={() => setPeqChan("left")} />
                      <ChannelButton label="R" active={peqChan === "right"} onClick={() => setPeqChan("right")} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <PowerKnob
          enabled={enabled}
          onToggle={() =>
            void send({ action: "enable", source: st.source, type: subTab, enabled: !enabled })
          }
        />
      </div>

      {/* ── Body: graphic bank (re-skinned) / parametric table (deferred) ── */}
      <div className={cn("transition-opacity", !enabled && "opacity-50")}>
        {subTab === "graphic" ? (
          <GraphicPanel bands={st.graphic.bands} source={st.source} send={send} />
        ) : (
          <ParametricPanel bands={peqBands} source={st.source} channel={activeChan} send={send} />
        )}
      </div>

      {/* ── Footer: Presets tile + rename/delete/save tiles ──────────────── */}
      <PresetBar
        type={subTab}
        currentName={currentName}
        presets={presets}
        onLoad={(name) => void send({ action: "loadPreset", source: st.source, type: subTab, name })}
        onSave={(name) => void send({ action: "savePreset", source: st.source, type: subTab, name })}
        onDelete={(name) => void send({ action: "deletePreset", type: subTab, name })}
        onRename={(name, newName) => void send({ action: "renamePreset", type: subTab, name, newName })}
        onReset={() =>
          void send({
            action: "reset",
            source: st.source,
            type: subTab,
            ...(subTab === "parametric" ? { channel: activeChan } : {}),
          })
        }
      />
    </Card>
  );
}

// --- Tan tile tab with CSS indicator LED ------------------------------------

/** A flat tan tile (eq-buttons.png face) carrying a CSS LED + a dark label.
 *  Active state is read entirely off the LED (per mockup); the label just
 *  firms up slightly when active. */
function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-ring flex h-9 shrink-0 items-center gap-2 pl-[0.5rem] pr-[1rem]"
      style={TAB_FACE}
    >
      <Led lit={active} />
      <span
        className={cn(
          "whitespace-nowrap font-sans text-xs transition-colors",
          active ? "text-[hsl(var(--static))]" : "text-[hsl(var(--static)/0.7)]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** PNG indicator lamp — same assets as the source/output keycap buttons:
 *  led-on.png (lit amber) / led-off.png (dark). */
function Led({ lit }: { lit: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={lit ? "/led-on.png" : "/led-off.png"}
      alt=""
      draggable={false}
      className="h-[0.7rem] w-[0.7rem] shrink-0 select-none"
    />
  );
}

// --- POWER knob (enable toggle) ---------------------------------------------

/** Rotary POWER knob. Base is the lit power-btn.png; when disabled, the dark
 *  power-off-overlay.png is laid over it. No CSS-added glow on either state —
 *  the ring's own warmth is baked into the base asset, so stacking a CSS glow
 *  on top just doubled up. Replaces the original enable Switch. */
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
          aria-label={enabled ? "Turn EQ off" : "Turn EQ on"}
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

// --- Graphic (10 vertical dB faders) ----------------------------------------

function GraphicPanel({
  bands,
  source,
  send,
}: {
  bands: { param: string; label: string; gain: number }[];
  source: string;
  send: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [local, setLocal] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) setLocal(Object.fromEntries(bands.map((b) => [b.param, b.gain])));
  }, [bands, dragging]);

  return (
    <div className="relative z-10 px-6 pb-4 pt-6">
      <div className="flex items-stretch justify-between gap-2">
        {bands.map((b) => {
          const v = local[b.param] ?? b.gain;
          return (
            <div key={b.param} className="flex flex-1 flex-col items-center gap-3">
              <span className="font-mono text-sm tabular-nums text-[hsl(var(--faceplate)/0.8)]">
                {v > 0 ? `+${v}` : v}
              </span>
              <EqSlider
                value={v}
                min={GRAPHIC_GAIN.min}
                max={GRAPHIC_GAIN.max}
                step={GRAPHIC_GAIN.step}
                onChange={(nv) => {
                  setDragging(true);
                  setLocal((s) => ({ ...s, [b.param]: nv }));
                }}
                onCommit={(nv) => {
                  setDragging(false);
                  void send({ action: "setGraphic", source, bands: [{ param: b.param, gain: nv }] });
                }}
                ariaLabel={`${b.label} Hz`}
              />
              <span className="font-sans text-xs font-medium text-[hsl(var(--faceplate)/0.7)]">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A single graphic fader: a recessed vertical groove with tick hairlines down
 *  its right edge and a cream knob-cap (eq-knob.png) as the thumb. Wraps Radix
 *  vertical slider so keyboard + drag + the onChange/onCommit contract are
 *  preserved; there is no coloured range fill (mockup shows a bare groove). */
const EQ_TICKS = Array.from({ length: 9 });

function EqSlider({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  disabled,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <SliderPrimitive.Root
      orientation="vertical"
      className="relative flex h-[220px] w-12 touch-none select-none flex-col items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onChange(v[0]!)}
      onValueCommit={(v) => onCommit(v[0]!)}
      aria-label={ariaLabel}
    >
      {/* tick hairlines — short marks down the right of the groove */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 right-0.5 flex w-3 flex-col justify-between"
      >
        {EQ_TICKS.map((_, i) => (
          <span key={i} className="h-px w-full" style={{ background: "hsl(26deg 12% 58% / 31%)" }} />
        ))}
      </span>

      <SliderPrimitive.Track
        className="relative h-full w-[10px] overflow-visible rounded-full"
        style={{
          background: "hsl(30 10% 4%)",
          boxShadow:
            "inset 0 1px 2px hsl(0 0% 0% / 0.95), inset 0 0 0 1px hsl(0 0% 0% / 0.7), inset 0 -1px 0 hsl(var(--faceplate) / 0.06)",
        }}
      >
        <SliderPrimitive.Range className="absolute w-full" />
      </SliderPrimitive.Track>

      <SliderPrimitive.Thumb
        className="focus-ring block cursor-grab active:cursor-grabbing disabled:opacity-50"
        aria-label={ariaLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/eq-knob.png"
          alt=""
          draggable={false}
          className="w-[42px] max-w-none select-none"
          style={{
            // Greg's exact shadow spec — directional, tight-radius, fully opaque —
            // reads as a hard cast shadow rather than a soft ambient blur.
            filter: "drop-shadow(6px 7px 8px rgba(0, 0, 0, 1))",
          }}
        />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}

// --- Parametric (10 bands: freq / Q / gain / type) --------------------------

const Q_TICKS = [0.25, 0.5, 1, 2, 4, 8, 16];
const GAIN_TICKS = Array.from({ length: 23 }, (_, i) => i - 11);

function ParametricPanel({
  bands,
  source,
  channel,
  send,
}: {
  bands: ParametricBand[];
  source: string;
  channel: PeqChannel;
  send: (b: Record<string, unknown>) => Promise<void>;
}) {
  const visible = bands.filter((b) =>
    (PEQ_LETTERS as readonly string[]).includes(b.letter),
  );
  const LABEL = "shrink-0 font-sans text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--faceplate)/0.55)]";
  return (
    <div className="relative z-10 px-6 pb-6 pt-4">
      <div className="flex items-center gap-4 pb-2">
        <span className="w-5 shrink-0" />
        <span className={cn(LABEL, "w-[100px]")}>Type</span>
        <span className={cn(LABEL, "w-[100px]")}>Freq</span>
        <div className="flex flex-1">
          <span className={cn(LABEL, "flex-1")}>Q</span>
          <span className="w-8 shrink-0" />
          <span className={cn(LABEL, "flex-1")}>Gain</span>
        </div>
      </div>
      <div className="relative flex flex-col gap-4">
        {visible.map((b) => (
          <PeqRow key={b.letter} band={b} source={source} channel={channel} send={send} />
        ))}
        {/* Single continuous Q/Gain divider spanning every row, rendered once
            here instead of per-row. Geometry: this wrapper is full content
            width (its left edge = 0). The Q/Gain area starts after a fixed
            268px prefix (band letter 20px + 3×16px row gaps + Type 100px +
            Freq 100px) and runs to the right edge; inside it the Q and Gain
            halves are equal flex-1 columns split by a 32px (w-8) centre
            gutter. The gutter's centre, in this wrapper's coordinates, is
            268 + ((100% − 268) − 32)/2 + 16 = 50% + 134px — so the divider
            is offset that far right of the wrapper's own centre. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px"
          style={{ left: "calc(50% + 134px)", background: "hsl(var(--faceplate) / 0.16)" }}
        />
      </div>
    </div>
  );
}

function PeqRow({
  band,
  source,
  channel,
  send,
}: {
  band: ParametricBand;
  source: string;
  channel: PeqChannel;
  send: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [gain, setGain] = useState(band.gain);
  const [q, setQ] = useState(band.q);
  const [dragging, setDragging] = useState<"gain" | "q" | null>(null);
  useEffect(() => {
    if (dragging !== "gain") setGain(band.gain);
  }, [band.gain, dragging]);
  useEffect(() => {
    if (dragging !== "q") setQ(band.q);
  }, [band.q, dragging]);

  const set = (params: Record<string, unknown>) =>
    void send({ action: "setParametric", source, channel, letter: band.letter, ...params });

  const off = band.mode === -1;
  const isPassFilter = band.mode === 3 || band.mode === 5;

  return (
    <div className={cn("flex items-center gap-4", off && "opacity-45")}>
      <span className="w-5 shrink-0 text-center font-sans text-xs font-semibold uppercase text-primary">
        {band.letter}
      </span>

      <div className="w-[100px] shrink-0">
        <TypeDropdown mode={band.mode} onSelect={(mode) => set({ mode })} />
      </div>

      <div className="w-[100px] shrink-0">
        <FreqInput value={band.frequency} disabled={off} onCommit={(f) => set({ frequency: f })} />
      </div>

      <div className="flex flex-1 items-center">
        <div className="min-w-0 flex-1">
          <PeqAxis
            value={q}
            min={PEQ_RANGE.qMin}
            max={PEQ_RANGE.qMax}
            scale="log"
            ticks={Q_TICKS}
            disabled={off}
            format={(v) => v.toFixed(2)}
            onChange={(v) => {
              setDragging("q");
              setQ(v);
            }}
            onCommit={(v) => {
              setDragging(null);
              set({ q: v });
            }}
            ariaLabel={`Band ${band.letter} Q`}
          />
        </div>

        {/* 32px centre gutter — the continuous divider (drawn once in
            ParametricPanel) runs down its exact middle. */}
        <span className="w-8 shrink-0" />

        <div className={cn("min-w-0 flex-1 transition-opacity", isPassFilter && "pointer-events-none opacity-30")}>
          <PeqAxis
            value={gain}
            min={PEQ_RANGE.gainMin}
            max={PEQ_RANGE.gainMax}
            scale="linear"
            ticks={GAIN_TICKS}
            disabled={off || isPassFilter}
            padLeft
            format={(v) => isPassFilter ? "N/A" : `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`}
            onChange={(v) => {
              setDragging("gain");
              setGain(v);
            }}
            onCommit={(v) => {
              setDragging(null);
              set({ gain: v });
            }}
            ariaLabel={`Band ${band.letter} gain`}
          />
        </div>
      </div>
    </div>
  );
}

/** Tan-tile Type dropdown (Off / Low Shelf / Peak / High Shelf) — same face
 *  recipe as the header TabButtons, sized to row height. */
function TypeDropdown({
  mode,
  onSelect,
}: {
  mode: number;
  onSelect: (v: number) => void;
}) {
  const label = PEQ_MODES.find((m) => m.value === mode)?.label ?? "Peak";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="focus-ring flex h-8 w-full items-center justify-between gap-1.5 px-3" style={TAB_FACE}>
          <span className="truncate font-sans text-xs text-[hsl(var(--static))]">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-[hsl(var(--static)/0.6)]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="glass z-50 min-w-[--radix-dropdown-menu-trigger-width] rounded-lg p-1 text-sm shadow-2xl"
        >
          {PEQ_MODES.map((m) => (
            <DropdownMenu.Item
              key={m.value}
              onSelect={() => onSelect(m.value)}
              className="cursor-pointer rounded-md px-3 py-1.5 text-[hsl(var(--faceplate))] outline-none data-[highlighted]:bg-white/8"
            >
              {m.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** PEQ mode selector (Stereo / L/R) — same tan tile face as the other tabs. */
function PeqModeDropdown({
  mode,
  onSelect,
}: {
  mode: PeqChannelMode;
  onSelect: (v: PeqChannelMode) => void;
}) {
  const label = mode === "lr" ? "L/R" : "Stereo";
  const modes: { value: PeqChannelMode; label: string }[] = [
    { value: "stereo", label: "Stereo" },
    { value: "lr", label: "L/R" },
  ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="focus-ring flex h-9 items-center gap-1.5 px-4" style={TAB_FACE}>
          <span className="font-sans text-xs text-[hsl(var(--static))]">{label}</span>
          <ChevronDown className="size-3 shrink-0 text-[hsl(var(--static)/0.6)]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="glass z-50 min-w-[--radix-dropdown-menu-trigger-width] rounded-lg p-1 text-sm shadow-2xl"
        >
          {modes.map((m) => (
            <DropdownMenu.Item
              key={m.value}
              onSelect={() => onSelect(m.value)}
              className="cursor-pointer rounded-md px-3 py-1.5 text-[hsl(var(--faceplate))] outline-none data-[highlighted]:bg-white/8"
            >
              {m.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Small L / R channel-select button with an indicator LED. */
function ChannelButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-ring flex h-9 items-center gap-1.5 px-3"
      style={TAB_FACE}
    >
      <Led lit={active} />
      <span
        className={cn(
          "font-sans text-xs font-medium",
          active ? "text-[hsl(var(--static))]" : "text-[hsl(var(--static)/0.55)]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** Recessed dark readout box (cut-into-the-panel, matches the fader grooves)
 *  holding an editable frequency number + "Hz" suffix. */
function FreqInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);

  return (
    <div
      className="flex h-8 items-center rounded-[var(--radius)] px-2.5"
      style={{
        background: "#2d2a26",
        boxShadow:
          "rgba(0, 0, 0, 0.9) 0px 1px 6px inset, rgba(0, 0, 0, -1.4) 0px 0px 0px 1px inset",
      }}
    >
      <input
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        min={PEQ_RANGE.freqMin}
        max={PEQ_RANGE.freqMax}
        disabled={disabled}
        onBlur={() => {
          const f = Number(local);
          if (Number.isFinite(f) && f !== value) onCommit(f);
        }}
        style={{ colorScheme: "dark" }}
        className="min-w-0 flex-1 bg-transparent text-right font-mono text-xs tabular-nums text-[hsl(var(--faceplate))] focus:outline-none disabled:opacity-50"
        aria-label="Frequency"
      />
      <span className="shrink-0 font-sans text-[10px] text-[hsl(var(--faceplate)/0.55)]">Hz</span>
    </div>
  );
}

/** One Q or Gain axis: a horizontal PeqSlider + numeric readout, with tick
 *  marks rendered BELOW the track (not inline on it) — evenly spaced by the
 *  slider's own scale (linear or log), so ticks land under the value they
 *  represent regardless of scale. The reference tick (Q=1 / Gain=0dB) reads
 *  slightly taller + brighter, like a center detent on a real fader. */
function PeqAxis({
  value,
  min,
  max,
  ticks,
  scale,
  disabled,
  padLeft,
  format,
  onChange,
  onCommit,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  ticks: number[];
  scale: "linear" | "log";
  disabled?: boolean;
  padLeft?: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  ariaLabel: string;
}) {
  const toPos = (v: number) =>
    scale === "log"
      ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))
      : (v - min) / (max - min);
  const refTick = scale === "log" ? 1 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className={cn("relative min-w-0 flex-1 pr-2", padLeft ? "pl-8" : "pl-2")}>
        <PeqSlider
          value={value}
          min={min}
          max={max}
          scale={scale}
          disabled={disabled}
          onChange={onChange}
          onCommit={onCommit}
          ariaLabel={ariaLabel}
        />
        <div className={cn("absolute right-2 top-full mt-1.5 h-2", padLeft ? "left-8" : "left-2")}>
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className="absolute top-0 w-px -translate-x-1/2"
              style={{
                left: `${toPos(t) * 100}%`,
                height: t === refTick ? 6 : 4,
                background: `hsl(var(--faceplate) / ${t === refTick ? 0.5 : 0.22})`,
              }}
            />
          ))}
        </div>
      </div>
      <span className="w-16 shrink-0 text-left font-mono text-xs tabular-nums text-[hsl(var(--faceplate)/0.8)]">
        {format(value)}
      </span>
    </div>
  );
}

/** Horizontal PEQ slider — recessed groove (same recipe as the graphic
 *  faders' vertical groove) with the eq-knob.png cap reused as the thumb,
 *  scaled down. `scale="log"` drives Radix on a log-transformed domain so
 *  the Q slider's useful range isn't crushed into a sliver of the track. */
function PeqSlider({
  value,
  min,
  max,
  scale,
  disabled,
  onChange,
  onCommit,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  scale: "linear" | "log";
  disabled?: boolean;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  ariaLabel: string;
}) {
  const toSlider = (v: number) => (scale === "log" ? Math.log(v) : v);
  const fromSlider = (v: number) => (scale === "log" ? Math.exp(v) : v);
  const sliderMin = scale === "log" ? Math.log(min) : min;
  const sliderMax = scale === "log" ? Math.log(max) : max;
  const step = scale === "log" ? (sliderMax - sliderMin) / 480 : 0.5;
  const round2 = (v: number) => Math.round(v * 100) / 100;

  return (
    <SliderPrimitive.Root
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={[toSlider(value)]}
      min={sliderMin}
      max={sliderMax}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onChange(round2(fromSlider(v[0]!)))}
      onValueCommit={(v) => onCommit(round2(fromSlider(v[0]!)))}
      aria-label={ariaLabel}
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
        className="focus-ring block cursor-grab active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
        aria-label={ariaLabel}
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
  );
}

// --- Preset bar (load / save / delete / rename) -----------------------------

function PresetBar({
  type,
  currentName,
  presets,
  onLoad,
  onSave,
  onDelete,
  onRename,
  onReset,
}: {
  type: EqType;
  currentName: string;
  presets: { custom: string[]; preset: string[] };
  onLoad: (name: string) => void;
  onSave: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (name: string, newName: string) => void;
  onReset: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();

  async function doReset() {
    const ok = await confirm({
      title: `Reset ${type} EQ`,
      message: "Reset all bands to their default values? This will clear the current preset.",
      confirmText: "Reset",
      danger: true,
    });
    if (ok) onReset();
  }
  const isCustom = presets.custom.includes(currentName);
  const isFactory = (name: string) => presets.preset.includes(name);

  async function doSave() {
    const name = await prompt({
      title: `Save ${type} EQ`,
      message: "Save the current settings as a custom preset.",
      placeholder: "Preset name",
    });
    if (!name) return;
    if (isFactory(name)) {
      toast("Can't overwrite a built-in preset — choose another name.", "error");
      return;
    }
    onSave(name);
  }

  async function doRename() {
    const newName = await prompt({ title: "Rename preset", defaultValue: currentName });
    if (!newName || newName === currentName) return;
    if (isFactory(newName)) {
      toast("That name belongs to a built-in preset.", "error");
      return;
    }
    onRename(currentName, newName);
  }

  async function doDelete() {
    const ok = await confirm({
      title: "Delete preset",
      message: `Delete the custom preset “${currentName}”?`,
      confirmText: "Delete",
      danger: true,
    });
    if (ok) onDelete(currentName);
  }

  return (
    <div className="relative z-10 mt-2 flex items-center gap-3 px-6 pb-6 pt-4">
      {/* Presets dropdown — tan tile face, dark label. */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="focus-ring flex h-10 items-center gap-2 px-5"
            style={TAB_FACE}
          >
            <span className={cn("font-sans text-sm", currentName ? "text-[hsl(var(--static))]" : "text-[hsl(var(--static)/0.7)]")}>
              {currentName || "Presets"}
            </span>
            <ChevronDown className="size-4 text-[hsl(var(--static)/0.6)]" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="glass z-50 max-h-72 min-w-[--radix-dropdown-menu-trigger-width] overflow-y-auto rounded-lg p-1.5 shadow-2xl"
          >
            {presets.custom.length > 0 && (
              <DropdownMenu.Label className="px-3 py-1 text-[11px] uppercase tracking-wide text-[hsl(var(--faceplate)/0.55)]">
                Custom
              </DropdownMenu.Label>
            )}
            {presets.custom.map((p) => (
              <DropdownMenu.Item
                key={`c-${p}`}
                onSelect={() => onLoad(p)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--faceplate))] outline-none data-[highlighted]:bg-white/8"
              >
                {p}
                {p === currentName && <Check className="size-4 text-[hsl(var(--primary))]" />}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Label className="px-3 py-1 text-[11px] uppercase tracking-wide text-[hsl(var(--faceplate)/0.55)]">
              Presets
            </DropdownMenu.Label>
            {presets.preset.map((p) => (
              <DropdownMenu.Item
                key={`p-${p}`}
                onSelect={() => onLoad(p)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--faceplate))] outline-none data-[highlighted]:bg-white/8"
              >
                {p}
                {p === currentName && <Check className="size-4 text-[hsl(var(--primary))]" />}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Rename/delete (custom only) + save — grouped right next to the
          Presets dropdown per Greg (moved off the panel's far-right edge,
          which is now empty). */}
      {isCustom && (
        <>
          <button
            onClick={() => void doRename()}
            className="focus-ring grid h-10 w-[52px] place-items-center text-[hsl(var(--static)/0.75)] transition-colors hover:text-[hsl(var(--static))]"
            style={SAVE_FACE}
            title="Rename preset"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => void doDelete()}
            className="focus-ring grid h-10 w-[52px] place-items-center text-[hsl(var(--static)/0.7)] transition-colors hover:text-[hsl(var(--velvet))]"
            style={SAVE_FACE}
            title="Delete preset"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
      <button
        onClick={() => void doSave()}
        className="focus-ring grid h-10 w-[52px] place-items-center text-[hsl(var(--static)/0.8)] transition-colors hover:text-[hsl(var(--static))]"
        style={SAVE_FACE}
        title="Save as preset"
      >
        <Save className="size-4" />
      </button>
      <button
        onClick={() => void doReset()}
        className="focus-ring grid h-10 w-[52px] place-items-center text-[hsl(var(--static)/0.7)] transition-colors hover:text-[hsl(var(--static))]"
        style={SAVE_FACE}
        title="Reset to defaults"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  );
}
