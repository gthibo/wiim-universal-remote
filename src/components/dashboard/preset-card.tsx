"use client";

import { useState } from "react";
import { ListMusic } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/toast";
import { apiSend, ApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { PresetItem } from "@/lib/wiim/types";

/**
 * SHOWA RE-SKIN: presets panel.
 *
 * Round 23 (cubby rebuild) — replaces the single dark trough + 1px CSS grooves
 * with INDEPENDENT recessed walnut cubbies on a uniform 6-column grid, per
 * Greg's mockup. This one structural change resolves three review items at
 * once:
 *   • Separators (previously a 1px dark-on-dark groove, near-invisible) are now
 *     the lit walnut walls between recesses — visible by construction. The grid
 *     gap IS the wall, in both directions; the old <Groove>/<RowSeam> helpers
 *     are gone.
 *   • The last-tile-in-row width bug is gone. The old flex layout donated a
 *     fixed-width groove gutter from cells 1–5 but not the last cell, so tile
 *     6 / 12 kept ~15px the others lost. A uniform grid gives six equal columns.
 *   • The art/caption split from the previous build (which existed ONLY to
 *     contain a self-stretching divider PNG) is reverted — each caption sits in
 *     its own grid cell again, so column alignment is automatic and there is no
 *     stretching element left to reopen the dead-zone gap.
 *
 * Plus two localized fixes:
 *   • Active preset gains the rust lacquer frame AND the protruding rust bar
 *     tab beneath the tile (the "selected" stub from the mockup), not just a
 *     frame ring.
 *   • Empty-slot numeral: tighter circle, thicker ring (per mockup).
 *
 * CSS-first per Greg (this is a flat rectilinear recess, unlike the now-playing
 * niche where CSS failed and a PNG was required). If the recess doesn't read as
 * convincingly pressed-in, fall back to a single reusable cubby-frame PNG.
 *
 * Active-state binding is unchanged: the WiiM poll status has no durable "which
 * preset is selected" field, so we remember the last tapped index client-side
 * and clear it on source change or playback stop (accepted limitation — a
 * preset switched from outside this dashboard won't light up here). This
 * memory is now OWNED by the parent Dashboard (lifted in the DLNA/radio-name
 * fix) rather than local to this card, since NowPlayingCard also needs to
 * know the last-tapped preset name to caption generic "Network" radio streams
 * with the actual station name. PresetCard receives it as a controlled
 * `activeIndex` prop and reports taps upward via `onActivate` instead of
 * managing the memory itself.
 *
 * Panel face texture (presetsPanelGrain / presetsPanelGrain2) is unchanged.
 */

export function PresetCard({
  deviceId,
  presets,
  activeIndex,
  onActivate,
  onChanged,
}: {
  deviceId: string;
  presets: PresetItem[];
  /** Which preset slot is remembered as last-tapped (owned by Dashboard). */
  activeIndex: number | null;
  /** Reports a successful preset tap upward: (slot index, preset name). */
  onActivate: (index: number, name: string | null) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  async function play(index: number, name: string | null) {
    setBusy(index);
    try {
      await apiSend(`/api/devices/${deviceId}/preset`, "POST", { index });
      onActivate(index, name);
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Could not play preset", "error");
    } finally {
      setBusy(null);
    }
  }

  if (presets.length === 0) return null;

  // Chunk into rows of 6; drop any trailing row that's entirely empty slots,
  // then flatten — the grid itself handles the 6-up layout.
  const rows: PresetItem[][] = [];
  for (let i = 0; i < presets.length; i += 6) rows.push(presets.slice(i, i + 6));
  while (rows.length > 1 && rows[rows.length - 1]!.every((p) => p.name === null)) {
    rows.pop();
  }
  const visible = rows.flat();

  return (
    <Card className="relative overflow-hidden p-0">
      {/* SHOWA RE-SKIN: panel face texture — same recipe as the now-playing
          control panel (panelGrain / panelGrain2), unique filter IDs since both
          panels render on the same page. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.07 }}
      >
        <filter id="presetsPanelGrain">
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
        <rect width="100%" height="100%" filter="url(#presetsPanelGrain)" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.1 }}
      >
        <filter id="presetsPanelGrain2">
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
        <rect width="100%" height="100%" filter="url(#presetsPanelGrain2)" />
      </svg>

      <CardHeader
        className="relative z-10"
        icon={<ListMusic className="size-4" />}
        title="Presets"
      />

      {/* Cubby field — uniform 6-up grid. gap-x / gap-y ARE the walnut walls
          (the grooves) between recesses, in both directions. */}
      <div className="relative z-10 grid grid-cols-6 gap-x-3 gap-y-11 px-5 pb-11 pt-3">
        {visible.map((p) => (
          <PresetCell
            key={p.index}
            deviceId={deviceId}
            preset={p}
            active={activeIndex === p.index || busy === p.index}
            busy={busy === p.index}
            onPlay={() => void play(p.index, p.name)}
          />
        ))}
      </div>
    </Card>
  );
}

/** One preset: a recessed walnut cubby (rust lacquer when active) holding the
 *  tile, the protruding rust bar tab when active, and the caption beneath —
 *  all inside a single grid cell so captions align under their tiles. */
function PresetCell({
  deviceId,
  preset,
  active,
  busy,
  onPlay,
}: {
  deviceId: string;
  preset: PresetItem;
  active: boolean;
  busy: boolean;
  onPlay: () => void;
}) {
  const empty = preset.name === null;

  return (
    <div className="flex min-w-0 flex-col">
      <button
        type="button"
        onClick={onPlay}
        disabled={busy}
        aria-pressed={active}
        title={preset.name ?? `Preset ${preset.index}`}
        className="focus-ring group relative block w-full disabled:cursor-default"
        style={cubbyFrameStyle(active)}
      >
        {/* Recessed tile floor — the inset shadow sits the artwork at the bottom
            of the walnut well. */}
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{
            boxShadow:
              "inset 0 2px 6px hsl(0 0% 0% / 0.7), inset 0 0 0 1px hsl(0 0% 0% / 0.5)",
          }}
        >
          {preset.hasArt ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/devices/${deviceId}/preset-art?index=${preset.index}`}
                alt=""
                draggable={false}
                className="absolute inset-0 size-full object-cover transition-[filter] duration-300"
                style={{
                  // Non-active tiles read as a cohesive warm monotone set (mockup);
                  // only the active tile shows full colour.
                  filter: active
                    ? undefined
                    : "grayscale(1) sepia(0.5) brightness(1.04) contrast(0.96)",
                }}
              />
              {busy && (
                <span className="absolute inset-0 grid place-items-center bg-black/45">
                  <Spinner className="size-6 text-[hsl(var(--primary))]" />
                </span>
              )}
            </>
          ) : empty ? (
            <EmptyTile index={preset.index} />
          ) : (
            <NamedNoArtTile index={preset.index} name={preset.name!} busy={busy} />
          )}
        </div>

        {/* Active "selected" bar tab — protrudes from the bottom-center of the
            cubby into the walnut groove below it (mockup). */}
        {active && (
          <div
            aria-hidden
            className="absolute left-1/2 z-10 -translate-x-1/2"
            style={{
              bottom: -4,
              width: "34%",
              height: 7,
              borderRadius: 1,
              background: "linear-gradient(180deg, hsl(15 75% 50%), hsl(15 71% 40%))",
              boxShadow:
                "inset 0 1px 0 hsl(28 92% 70% / 0.7), 0 1px 2px hsl(0 0% 0% / 0.6)",
            }}
          />
        )}
      </button>

      {/* Caption — own grid-cell row, auto-aligned under the tile. mt clears the
          protruding active bar. */}
      <span
        className={cn(
          "mt-4 line-clamp-1 px-0.5 text-center font-sans text-xs uppercase tracking-wide transition-colors",
          active ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--faceplate)/0.7)]",
        )}
      >
        {preset.name ?? `Preset ${preset.index}`}
      </span>
    </div>
  );
}

/** Walnut cubby frame (rust lacquer when active). The frame's padding is the
 *  visible wood wall around each tile; the tile's own inset shadow sits it at
 *  the floor of the recess. */
function cubbyFrameStyle(active: boolean) {
  if (active) {
    return {
      padding: 5,
      background: "linear-gradient(180deg, hsl(15 71% 47%), hsl(15 71% 38%))",
      boxShadow: [
        "inset 0 1px 0 hsl(28 90% 66% / 0.6)", // lacquer top highlight
        "0 3px 7px hsl(0 0% 0% / 0.6)", // sits proud of the panel
        "0 1px 2px hsl(0 0% 0% / 0.45)",
      ].join(", "),
    };
  }
  return {
    padding: 5,
    background:
      "linear-gradient(180deg, hsl(var(--walnut) / 0.9), hsl(var(--walnut-dark) / 0.95))",
    boxShadow: [
      "inset 0 1px 0 hsl(var(--faceplate) / 0.07)", // lit top lip of the wall
      "0 3px 6px hsl(0 0% 0% / 0.55)", // wall casts into the groove
      "0 1px 2px hsl(0 0% 0% / 0.4)",
    ].join(", "),
  };
}

/** Empty slot — brass blank with a tight, thick-ringed numeral (per mockup). */
function EmptyTile({ index }: { index: number }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{
        background: "linear-gradient(180deg, hsl(var(--brass)) 0%, hsl(var(--brass-dim)) 100%)",
        boxShadow: "inset 0 1px 0 hsl(40 60% 88% / 0.6), inset 0 -2px 4px hsl(30 30% 30% / 0.25)",
      }}
    >
      <span
        className="inline-flex select-none items-center justify-center rounded-full font-display text-3xl font-bold leading-none"
        style={{
          color: "hsl(25 20% 45% / 0.85)",
          width: "1.4em",
          height: "1.4em",
          border: "2.5px solid hsl(25 20% 45% / 0.6)",
        }}
      >
        {/* optical centering: the ring is flex-centered, but Antonio's digit ink
            sits low in its line box, so nudge the glyph up. translateY is the
            knob (more negative = higher). */}
        <span className="inline-block" style={{ transform: "translateY(-0.06em)" }}>
          {index}
        </span>
      </span>
    </div>
  );
}

/** Named slot with no art — same brass base, carries the name; matching ring. */
function NamedNoArtTile({ index, name, busy }: { index: number; name: string; busy: boolean }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center"
      style={{
        background: "linear-gradient(180deg, hsl(var(--brass)) 0%, hsl(var(--brass-dim)) 100%)",
        boxShadow: "inset 0 1px 0 hsl(40 60% 88% / 0.6), inset 0 -2px 4px hsl(30 30% 30% / 0.25)",
      }}
    >
      {busy ? (
        <Spinner className="size-6 text-[hsl(25_20%_45%_/_0.8)]" />
      ) : (
        <span
          className="inline-flex select-none items-center justify-center rounded-full font-display text-xl font-bold leading-none"
          style={{
            color: "hsl(25 20% 45% / 0.85)",
            width: "1.4em",
            height: "1.4em",
            border: "2.5px solid hsl(25 20% 45% / 0.6)",
          }}
        >
          <span className="inline-block" style={{ transform: "translateY(-0.06em)" }}>
            {index}
          </span>
        </span>
      )}
      <span
        className="line-clamp-2 font-sans text-[11px] font-medium leading-tight"
        style={{ color: "hsl(25 25% 30% / 0.85)" }}
      >
        {name}
      </span>
    </div>
  );
}
