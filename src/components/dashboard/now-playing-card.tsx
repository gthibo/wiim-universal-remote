"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  Music4,
  Heart,
  FileAudio,
  Gem,
  Disc3,
  Image as ImageIcon,
  Maximize2,
  Mic2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MarqueeText } from "@/components/ui/marquee-text";
import { useToast } from "@/components/toast";
import { apiSend, apiGet, ApiError } from "@/lib/client/api";
import { formatTime, cn } from "@/lib/utils";
import { SOURCES } from "@/lib/wiim/constants";
import { DynIcon } from "@/components/ui/icon";
import { ServiceLogo } from "@/components/ui/service-logo";
import { VinylDisc } from "./vinyl-disc";
import { QualityPill } from "./quality-pill";
import { KioskView } from "./kiosk-view";
import { LyricsView } from "./lyrics-view";
import { SleepButton } from "./sleep-button";
import { AlarmButton } from "./alarm-button";
import { extractColor, type RGB } from "@/lib/client/use-album-color";
import type { PlayerStatus, StreamService, AudioFormat, LyricLine } from "@/lib/wiim/types";

/**
 * SHOWA RE-SKIN: a thin black drop-shadow for dimension on flat glyph icons
 * (toggle row, transport, mute/love, sleep moon) — per Greg's request, applied
 * to every icon/control on this card EXCEPT the play/pause button (that's a
 * dedicated PNG asset with its own baked lighting, not a glyph). Centralized
 * here as a single filter string so all the icons it's applied to share one
 * locked value rather than drifting if tuned individually later.
 */
const ICON_SHADOW: CSSProperties = {
  filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))",
};

/**
 * SHOWA RE-SKIN: the album-art cubby — a recessed wood box inset in the
 * cabinet, visually SEPARATE from the raised control panel beside it (not part
 * of its face). Three stacked layers, back-to-front:
 *   1. cubby-with-records-plain.png — the recessed box + leaning record stack.
 *   2. the live content standing inside it: cover art (square, standing
 *      straight per mockup measurement — NO lean, just a cast shadow down-left),
 *      OR the spinning VinylDisc, OR the LyricsView. The toggle below swaps
 *      which one stands in the box.
 *   3. now-playing-stand.png — the "NOW PLAYING" nameplate, layered in FRONT
 *      across the bottom so the record reads as sitting behind it.
 * Measured from the composite mockup: the hero record fills ~56% of the cubby
 * width, stands dead vertical (0.06deg), seated against the back-left with a
 * strong contact shadow on its left edge + underneath.
 */
function CubbyArt({
  view,
  showArt,
  albumArt,
  srcDef,
  sourceDisplay,
  isPlaying,
  rgb,
  onColor,
  lyrics,
  lyricsLoading,
  pos,
  onSeek,
}: {
  view: "cover" | "vinyl" | "lyrics";
  showArt: boolean;
  albumArt: string | null;
  srcDef: { icon: string } | undefined;
  sourceDisplay: string | undefined;
  isPlaying: boolean;
  rgb: string | null;
  onColor: (c: RGB | null) => void;
  lyrics: { synced: LyricLine[] | null; plain: string | null } | null;
  lyricsLoading: boolean;
  pos: number;
  onSeek: (t: number) => void;
}) {
  return (
    // The cubby is a self-contained recessed box. aspect-[900/584] matches the
    // PNG so the box never distorts; the PNG is the background, content + stand
    // are absolutely positioned within it.
    <div className="relative w-full shrink-0 self-start overflow-hidden aspect-[900/584]">
      {/* Layer 1 — the recessed cubby + record stack (back) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cubby-with-records-plain.png"
        alt=""
        draggable={false}
        className="absolute inset-0 size-full select-none object-cover"
      />

      {/* Layer 2 + 3 — the standing content (cover / vinyl / lyrics) AND the
          NOW PLAYING stand in front of it. Positioned in the right ~64% of the
          box (the empty area beside the leaning stack), seated on the floor.
          Per mockup: record ~56% of cubby width, vertical.
          The CONTENT box below is sized to the art footprint (h-[93%]
          aspect-square); the stand is its CHILD so the stand sizes + centres
          relative to the ART, not the cubby — the record extends past the stand
          on both sides. (Started from the mockup's measured ratio — art
          1006px wide, stand inset 135px per side, ~73% — then widened to 80%
          after Greg's screenshot review; also lifted the art off the cubby
          floor (88%→93% height, 7%→4% bottom padding) so it reads as resting
          ON the floor instead of floating above it.) */}
      <div className="absolute inset-y-0 right-0 flex w-[64%] items-end justify-center pb-[4%] pr-[6%]">
        {/* art-sized content box; `relative` so the stand can anchor to it */}
        <div className="relative h-[93%] aspect-square">
          {view === "lyrics" ? (
            <div className="absolute inset-0 overflow-hidden">
              <LyricsView
                lines={lyrics?.synced ?? null}
                plain={lyrics?.plain ?? null}
                position={pos}
                loading={lyricsLoading}
                onSeek={onSeek}
              />
            </div>
          ) : view === "vinyl" ? (
            <div className="absolute inset-0 grid place-items-center">
              <VinylDisc
                artSrc={showArt ? albumArt : null}
                spinning={isPlaying}
                rgb={rgb}
                onColor={onColor}
                sizeClass="size-full"
              />
            </div>
          ) : (
            // Cover: square album art, standing straight, cast shadow down-left.
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                // Contact shadow: strong on the left + under the record, matching
                // the mockup where the sleeve's left edge sits in deep shade.
                filter:
                  "drop-shadow(-6px 6px 10px hsl(0 0% 0% / 0.65)) drop-shadow(0 3px 6px hsl(0 0% 0% / 0.5))",
              }}
            >
              <AnimatePresence mode="wait">
                {showArt ? (
                  <motion.div
                    key={albumArt ?? "art"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={albumArt ?? undefined}
                      alt=""
                      className="size-full object-cover"
                      draggable={false}
                      onLoad={(e) => onColor(extractColor(e.currentTarget))}
                    />
                  </motion.div>
                ) : (
                  // No cover art (physical input / radio) -> show the source.
                  <div className="grid size-full place-items-center bg-gradient-to-br from-white/[0.07] to-transparent">
                    <div className="flex flex-col items-center gap-2 px-3 text-center text-muted-foreground/55">
                      {srcDef ? (
                        <DynIcon name={srcDef.icon} className="size-12" />
                      ) : (
                        <Music4 className="size-12" />
                      )}
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        {sourceDisplay}
                      </span>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* NOW PLAYING stand — child of the art-sized box, so its width is
              relative to the ART. w-[80%] centred (widened from the mockup's
              ~73% per Greg's review). translate-y pushes it down so it sits in
              FRONT of the art's lower edge (overlapping ~the bottom), reading
              as a nameplate the record stands behind. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/now-playing-stand.png"
            alt=""
            draggable={false}
            className="pointer-events-none absolute bottom-0 left-1/2 z-10 w-[80%] -translate-x-1/2 translate-y-[30%] select-none"
          />
        </div>
      </div>

      {/* SHOWA RE-SKIN: photo tonearm — Layer 4, static (does NOT spin).
          Replaces the previous inline SVG tonearm that lived inside VinylDisc
          (where it was a child of the spinning disc layer, forcing awkward
          coordinate hacks to keep it static). Now a direct sibling of the
          other cubby layers inside this aspect-ratio wrapper so:
            • It can be positioned against the FULL cubby width/height.
            • overflow-hidden on the outer div clips the right edge naturally.
            • It stays static regardless of what the inner vinyl layer does.
          Geometry derived from Greg's mockup (image 3, pixel measurements):
            • Arm spans x=533–769 of 740px cubby = 68–100% from left.
            • Top edge at y=157 of 652px = ~24% from top.
            • Width = 32% of cubby width.
          Rotation: SVG arm vector was pivot(205,22)→headshell(167,140),
          dx=-38 dy=118 → atan2(-38,118) = -17.9° from vertical.
          The photo asset (tonearm2.png, 166×419 RGBA) is portrait with pivot
          at top, headshell at bottom, so rotate(-18deg) aligns it.
          BUG FIX: was rendering unconditionally regardless of `view`, so it
          floated above the cover-art view (and lyrics view) as if resting on
          a record that wasn't there. The tonearm is set-dressing for the
          VINYL illustration specifically — it belongs to that view, not to
          the cubby as a whole — so it's now gated on `view === "vinyl"`. */}
      {view === "vinyl" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/tonearm2.png"
          alt=""
          draggable={false}
          aria-hidden
          className="pointer-events-none absolute select-none"
          style={{
            top: "5%",
            right: "4.4%",
            width: "16%",
            filter: "drop-shadow(-3px 6px 10px hsl(0 0% 0% / 0.65))",
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}

export function NowPlayingCard({
  deviceId,
  player,
  sourceLabels,
  autoSourceLabels,
  activePresetName,
  canLove,
  sleepExpiresAt,
  onChanged,
}: {
  deviceId: string;
  player: PlayerStatus;
  sourceLabels?: Record<string, string>;
  autoSourceLabels?: Record<string, string>;
  /** Last-tapped preset name (Dashboard-owned memory) — substituted in for
   *  the generic "Network" service label on internet-radio streams, which
   *  the WiiM API gives no station name for at all (see StreamInfoLine). */
  activePresetName?: string | null;
  canLove?: boolean;
  sleepExpiresAt?: number | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState(player.position);
  const [vol, setVol] = useState(player.volume);
  const [draggingVol, setDraggingVol] = useState(false);
  const [draggingSeek, setDraggingSeek] = useState(false);
  // Local repeat/shuffle so the buttons update instantly (optimistic); the
  // device reading is asymmetric and lags the poll otherwise.
  const [repeat, setRepeat] = useState(player.repeat);
  const [shuffle, setShuffle] = useState(player.shuffle);
  const loopFreezeUntil = useRef(0);
  const [loved, setLoved] = useState(false);
  const lovedReqRef = useRef("");
  const [kiosk, setKiosk] = useState(false);
  const [kioskView, setKioskView] = useState<"vinyl" | "lyrics">("vinyl");
  const [lyrics, setLyrics] = useState<{ synced: LyricLine[] | null; plain: string | null } | null>(
    null,
  );
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const isPlaying = player.state === "playing";
  const srcDef = player.sourceKey ? SOURCES.find((s) => s.key === player.sourceKey) : undefined;
  const sourceDisplay =
    (player.sourceKey &&
      (sourceLabels?.[player.sourceKey]?.trim() ||
        autoSourceLabels?.[player.sourceKey]?.trim())) ||
    player.sourceLabel;
  // Physical inputs (Optical, Line-in, Coax, HDMI, Phono…) don't carry cover
  // art — show the source icon instead of a stale/blank image. Only
  // network/streaming sources display album art.
  const isPhysicalInput = !!player.sourceKey && player.sourceKey !== "wifi";
  const showArt = !!player.albumArt && !isPhysicalInput;
  // Stream-info block (service / format) — only network & Bluetooth have spare
  // vertical space beneath the cover for it.
  const showStreamInfo = player.sourceKey === "wifi" || player.sourceKey === "bluetooth";
  // Internet-radio streams report NO station name anywhere in the WiiM API
  // (mode is generic "Station", vendor is just "CustomRadio" — the aggregator
  // app, not the station) so detectService falls back to a plain "Network"
  // label there (service.key === "network"). Substitute the last-tapped
  // preset name in that specific case only — NOT for Plex/DLNA pushes, which
  // already carry a real vendor-reported name under the distinct "vendor" key.
  const displayService =
    player.service && player.service.key === "network" && activePresetName
      ? { ...player.service, name: activePresetName }
      : player.service;
  // Tint the card + glow the cover with the album art's dominant colour,
  // extracted from the displayed <img> on load (reliable — no separate load).
  const [albumColor, setAlbumColor] = useState<RGB | null>(null);
  const rgb = albumColor ? `${albumColor[0]}, ${albumColor[1]}, ${albumColor[2]}` : null;
  // Clear the tint when there's no cover (physical inputs / Bluetooth).
  useEffect(() => {
    if (!showArt) setAlbumColor(null);
  }, [showArt]);

  // Now Playing artwork view: cover ↔ vinyl. A real turntable (Phono) defaults
  // to the vinyl view; the choice is remembered across sessions.
  const isPhono = player.sourceKey === "phono";
  const canVinyl = showArt || isPhono;
  const canLyrics = !!(player.title && player.artist);
  const [viewPref, setViewPref] = useState<"cover" | "vinyl" | "lyrics" | null>(null);
  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("wiim:npView") : null;
    if (v === "cover" || v === "vinyl" || v === "lyrics") setViewPref(v);
  }, []);
  const viewRaw: "cover" | "vinyl" | "lyrics" = viewPref ?? (isPhono ? "vinyl" : "cover");
  const view: "cover" | "vinyl" | "lyrics" =
    viewRaw === "lyrics" && !canLyrics
      ? "cover"
      : viewRaw === "vinyl" && !canVinyl
        ? "cover"
        : viewRaw;
  function setView(v: "cover" | "vinyl" | "lyrics") {
    setViewPref(v);
    try {
      localStorage.setItem("wiim:npView", v);
    } catch {
      /* ignore */
    }
  }

  // Reset interpolated position on track / status change.
  useEffect(() => {
    if (!draggingSeek) setPos(player.position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.position, player.title, player.state]);

  // Sync volume from device unless the user is dragging it.
  useEffect(() => {
    if (!draggingVol) setVol(player.volume);
  }, [player.volume, draggingVol]);

  // Sync repeat/shuffle from device, but briefly freeze right after a tap so the
  // optimistic value isn't overwritten by a poll that fires before the device
  // reflects the change.
  useEffect(() => {
    if (Date.now() >= loopFreezeUntil.current) {
      setRepeat(player.repeat);
      setShuffle(player.shuffle);
    }
  }, [player.repeat, player.shuffle]);

  // Reflect the track's Last.fm "loved" status when it changes.
  useEffect(() => {
    setLoved(false);
    if (!canLove || !player.title || !player.artist) return;
    const key = `${player.artist} ${player.title}`;
    lovedReqRef.current = key;
    apiGet<{ loved: boolean }>(
      `/api/lastfm/love?artist=${encodeURIComponent(player.artist)}&track=${encodeURIComponent(player.title)}`,
    )
      .then((r) => {
        if (lovedReqRef.current === key) setLoved(!!r.loved);
      })
      .catch(() => {
        /* leave as not-loved */
      });
  }, [player.title, player.artist, canLove]);

  // Fetch lyrics (LRCLIB) when the lyrics view is open (card or kiosk); per track.
  const lyricsWanted =
    (view === "lyrics" || (kiosk && kioskView === "lyrics")) && !!player.title && !!player.artist;
  useEffect(() => {
    if (!lyricsWanted) return;
    const artist = player.artist;
    const title = player.title;
    if (!artist || !title) return;
    let cancelled = false;
    setLyricsLoading(true);
    setLyrics(null);
    apiGet<{ synced: LyricLine[] | null; plain: string | null }>(
      `/api/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&album=${encodeURIComponent(player.album ?? "")}&duration=${player.duration || 0}`,
    )
      .then((r) => {
        if (!cancelled) {
          setLyrics(r);
          setLyricsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLyrics({ synced: null, plain: null });
          setLyricsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lyricsWanted, player.title, player.artist, player.album, player.duration]);

  // Tick position forward while playing.
  useEffect(() => {
    if (!isPlaying || draggingSeek) return;
    const t = setInterval(
      () => setPos((p) => (player.duration ? Math.min(player.duration, p + 1) : p + 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [isPlaying, draggingSeek, player.duration]);

  async function send(body: Record<string, unknown>, optimistic?: () => void) {
    optimistic?.();
    setBusy(true);
    try {
      await apiSend(`/api/devices/${deviceId}/control`, "POST", body);
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Command failed", "error");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const hasDuration = player.duration > 0;
  const VolIcon = player.muted || vol === 0 ? VolumeX : vol < 50 ? Volume1 : Volume2;

  function cycleRepeat() {
    const next = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    setRepeat(next);
    loopFreezeUntil.current = Date.now() + 2500;
    void send({ action: "repeat", repeat: next, shuffle });
  }

  function toggleShuffle() {
    const next = !shuffle;
    setShuffle(next);
    loopFreezeUntil.current = Date.now() + 2500;
    void send({ action: "shuffle", repeat, shuffle: next });
  }

  async function toggleLove() {
    if (!player.title || !player.artist) return;
    const next = !loved;
    setLoved(next); // optimistic
    try {
      await apiSend("/api/lastfm/love", "POST", {
        artist: player.artist,
        track: player.title,
        love: next,
      });
    } catch (e) {
      setLoved(!next);
      toast((e as ApiError).message || "Last.fm action failed", "error");
    }
  }

  function enterKiosk() {
    setKioskView(view === "lyrics" ? "lyrics" : "vinyl");
    setKiosk(true);
    // Best-effort true fullscreen (desktop); the fixed overlay covers the rest.
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function exitKiosk() {
    setKiosk(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  return (
    <>
      {/* SHOWA RE-SKIN (cubby rebuild): the album art moved OUT of the control
          panel into its own recessed wood cubby, a separate object on the
          cabinet. Cubby (left) + control panel (right) are now siblings in a
          ~50/50 flex row, items-start so the cubby can run taller than the
          panel (they're two objects on a shelf, not a locked grid). */}
      <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-stretch">
        {/* Left — the cubby, plus the cover/vinyl/lyrics/fullscreen toggles
            below it. Its own column, OUTSIDE the .glass panel. gap-6 (not the
            original gap-3) per Greg — more breathing room between the cubby's
            bottom edge and the bare icon row now that it's not housed in a
            panel of its own. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-2 lg:w-[45.5%]">
          <CubbyArt
            view={view}
            showArt={showArt}
            albumArt={player.albumArt ?? null}
            srcDef={srcDef}
            sourceDisplay={sourceDisplay}
            isPlaying={isPlaying}
            rgb={rgb}
            onColor={setAlbumColor}
            lyrics={lyrics}
            lyricsLoading={lyricsLoading}
            pos={pos}
            onSeek={(t) => {
              const v = Math.round(t);
              setPos(v);
              if (hasDuration) void send({ action: "seek", value: v });
            }}
          />

          {/* SHOWA RE-SKIN: bare icon row resting directly on the wood (no
              panel/housing — Greg decided the `.glass` panel wasn't working).
              Same visual language as the transport row's shuffle/repeat
              glyphs: dim, unhoused, no fill.
              CENTERING: must align to the STAND/art's horizontal centre, not
              the cubby's. That centre is NOT the wrapper's midpoint — it's
              derived from the actual geometry inside CubbyArt (content
              wrapper w-64% + pr-6% padding, art centred within that, sized to
              h-93% of height at aspect-square, against the FIXED cubby aspect
              ratio 900/584). Solving that geometry gives a constant
              66.08% of the cubby's total width — constant because every
              input is a fixed ratio/percentage, independent of render size.
              (An earlier attempt used a sibling `w-[64%] justify-center`
              wrapper hoping it would inherit the same centre by analogy; it
              didn't — flex `items-center` centres each child as its OWN box,
              it doesn't give siblings a shared width/position reference. This
              positions directly off the real number instead.)
              `relative w-full` matches the cubby's own width exactly (same
              flex column, same basis), so `left-[66.08%]` resolves against
              that shared width — then `-translate-x-1/2` centres the row on
              that point, same as the stand's own `left-1/2 -translate-x-1/2`. */}
          <div className="relative w-full min-h-8">
            <div className="absolute left-[66.08%] top-0 flex -translate-x-1/2 items-center gap-4">
              {canVinyl && (
                <>
                  <button
                    type="button"
                    onClick={() => setView("cover")}
                    aria-label="Cover view"
                    aria-pressed={view === "cover"}
                    className={cn(
                      "focus-ring grid size-7 place-items-center rounded-full transition",
                      view === "cover"
                        ? "text-[hsl(var(--faceplate)/0.9)]"
                        : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
                    )}
                  >
                    <ImageIcon className="size-5" style={ICON_SHADOW} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("vinyl")}
                    aria-label="Vinyl view"
                    aria-pressed={view === "vinyl"}
                    className={cn(
                      "focus-ring grid size-7 place-items-center rounded-full transition",
                      view === "vinyl"
                        ? "text-[hsl(var(--faceplate)/0.9)]"
                        : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
                    )}
                  >
                    <Disc3 className="size-5" style={ICON_SHADOW} />
                  </button>
                </>
              )}
              {canLyrics && (
                <button
                  type="button"
                  onClick={() => setView("lyrics")}
                  aria-label="Lyrics view"
                  aria-pressed={view === "lyrics"}
                    className={cn(
                      "focus-ring grid size-7 place-items-center rounded-full transition",
                      view === "lyrics"
                        ? "text-[hsl(var(--faceplate)/0.9)]"
                        : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
                    )}
                  >
                    <Mic2 className="size-5" style={ICON_SHADOW} />
                </button>
              )}
              <button
                type="button"
                onClick={enterKiosk}
                aria-label="Fullscreen"
                title="Fullscreen"
                className="focus-ring grid size-7 place-items-center rounded-full text-[hsl(var(--faceplate)/0.45)] transition hover:text-[hsl(var(--faceplate)/0.7)]"
              >
                <Maximize2 className="size-5" style={ICON_SHADOW} />
              </button>
            </div>
          </div>
        </div>

        {/* Right — the raised control panel (.glass Card). */}
        <Card className="relative flex w-full flex-1 flex-col overflow-hidden p-4">
      {/* SHOWA RE-SKIN: panel face texture. A faint, lighter grain that lifts
          the near-black panel so it reads as matte material rather than flat
          ink. Inline <svg> (CSP-safe) absolutely filling the card, behind the
          z-10 content below. Locked: fractalNoise 0.022 / 2 octaves,
          desaturated then contrast-stretched (feComponentTransfer slope 2.6)
          so the tight grain still reads at this low opacity. soft-light @ 0.07. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.07 }}
      >
        <filter id="panelGrain">
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
        <rect width="100%" height="100%" filter="url(#panelGrain)" />
      </svg>
      {/* SHOWA RE-SKIN: panel face texture, layer 2 — a finer second grain
          stacked on top of panelGrain to add micro-tooth rather than replace
          the broader-scale layer 1. Dialed in the standalone texture lab
          (card-on-walnut preview) by A/B-toggling against layer 1 alone.
          Locked: fractalNoise 0.45 / 2 octaves (much tighter than layer 1's
          0.022), same desaturate + contrast-stretch recipe, soft-light @ 0.10. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.1 }}
      >
        <filter id="panelGrain2">
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
        <rect width="100%" height="100%" filter="url(#panelGrain2)" />
      </svg>
      {/* SHOWA RE-SKIN: removed the album-art colour wash entirely (the
          radial+linear gradient driven by `extractColor`, plus the matching
          tinted glow on the cover-art container below). It was working as
          designed — per-track tinting from the actual dominant colour of
          each cover — but Greg found it visually unwanted regardless of
          which colour it happened to be (a cool-toned cover, e.g. blue-grey,
          read as a stray gradient fighting the warm walnut/rust palette).
          This is a deliberate removal, not a bug fix: distinct from the
          earlier removal of the unconditional hardcoded violet tint, which
          was a literal bypass-the-palette bug. `albumColor`/`rgb` are left
          in place (still passed to VinylDisc/KioskView, untouched here) since
          only this card's wash + glow were the ask. */}

      {/* Panel content (meta + transport). The album art used to share this
          row as a left column; it now lives in the separate cubby (left
          sibling), so this is the panel's sole content. */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          {/* SHOWA RE-SKIN: the source pill + bitrate QualityPill that used to
              sit above the title are gone. The mockup keeps the top of the card
              clean — only the sleep/moon control, top-right — and relocates the
              bitrate readout down into the stream-info band at the foot of the
              card, beside the HI-RES LOSSLESS tag (see StreamInfoLine). The row
              is kept (empty but for the sleep button) purely to anchor the moon
              top-right above the title, matching the mockup. */}
          <div className="mb-1 flex items-center">
            <div className="ml-auto">
              <div className="flex items-center gap-1">
                <SleepButton
                  deviceId={deviceId}
                  expiresAt={sleepExpiresAt ?? null}
                  onChanged={onChanged}
                />
                <AlarmButton
                  deviceId={deviceId}
                  firesAt={null}
                  onChanged={onChanged}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* SHOWA RE-SKIN: track title is the one place the jazz-cover
                graphic voice shows up in the main player — Antonio
                (condensed display face), all-caps, at a genuinely large
                "wordmark" scale, per pixel-measurement against the Lovart
                mockup (title cap-height there measured ~5.1–5.5x the
                artist/album line height — this is text-6xl against the
                artist/album text-sm, not a modest bump). Wrapped in
                MarqueeText so long titles scroll like an AVR readout
                instead of either truncating mid-word or wrapping and
                blowing out the card's height — short titles (most of them)
                just sit still, unaffected. */}
            <MarqueeText
              text={(player.title ?? (player.state === "stopped" ? "Nothing playing" : "—")).toUpperCase()}
              className="flex-1 font-display text-5xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-6xl"
            />
            {canLove && player.title && player.artist && (
              <button
                onClick={() => void toggleLove()}
                className={cn(
                  "focus-ring ml-auto grid size-9 shrink-0 place-items-center rounded-full transition",
                  loved ? "text-rose-400" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={loved ? "Unlove on Last.fm" : "Love on Last.fm"}
                title="Last.fm Love"
              >
                <Heart
                  className={cn("size-5", loved && "fill-current")}
                  strokeWidth={loved ? 0 : 2}
                  style={ICON_SHADOW}
                />
              </button>
            )}
          </div>
          <p className="mt-1.5 truncate font-sans text-sm font-bold uppercase tracking-wide text-[hsl(var(--primary))]">
            {player.artist ?? ""}
          </p>
          {player.album && (
            <p className="truncate font-mono text-xs text-muted-foreground/70">{player.album}</p>
          )}

          {/* Progress — only for real tracks. Physical inputs (optical/line-in)
              have no seekable timeline, so the slider is hidden there. */}
          {!isPhysicalInput && (
            <div className="mt-2">
              <Slider
                value={Math.min(pos, player.duration || pos)}
                min={0}
                max={hasDuration ? player.duration : Math.max(pos, 1)}
                variant="seek"
                onChange={(v) => {
                  setDraggingSeek(true);
                  setPos(v);
                }}
                onCommit={(v) => {
                  setDraggingSeek(false);
                  if (hasDuration) void send({ action: "seek", value: v });
                }}
                disabled={!hasDuration}
                aria-label="Seek"
              />
              <div className="mt-1 flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
                <span>{formatTime(pos)}</span>
                <span>{hasDuration ? formatTime(player.duration) : "—"}</span>
              </div>
            </div>
          )}

          {/* SHOWA RE-SKIN: engraved seam between the metadata block and the
              transport row, matching the Lovart mockup (measured: a near-
              black groove with a faint highlight directly beneath it,
              edge-to-edge across the panel — darker than the panel itself,
              not just a lighter dividing rule). Built the same way as
              `.glass`'s recess shading in globals.css (dark inset shade +
              a thin opposite-side highlight) rather than a flat `border-t`,
              since a flat token-colored border resolves lighter than the
              panel and reads as a seam catching light, not one cut into it.
              Unconditional (renders even for physical inputs with no
              progress bar above it) — it's a constant structural zone
              divider, not tied to whether the seekbar happens to be showing.
              SHOWA RE-SKIN (3rd pass): the seam now sits CENTERED in the gap
              between the scrubber/timestamps and the transport row, rather than
              hugging the timestamps with all the empty space dumped below it.
              Equal gaps above (mt-[44px]) and below (mt-[44px] on the transport
              row) split the ~88px of breathing room evenly so the engraved line
              reads as a divider sitting in the middle of the gap — per Greg's
              note that it was riding too close to the scrubber. Total distance
              from timestamps to transport is unchanged; only the seam moved. */}
          <div
            aria-hidden
            className="mt-[44px] h-px shrink-0"
            style={{
              background: "hsl(0 0% 0% / 0.55)",
              boxShadow: "0 1px 0 0 hsl(var(--faceplate) / 0.04)",
            }}
          />

          {/* SHOWA RE-SKIN: transport + volume merged into a single row,
              per Greg's reference screenshot — previously volume sat on its
              own row below the transport buttons; now shuffle, prev, play,
              next, repeat, and the volume icon+slider+readout all share one
              horizontal line. Shuffle/prev/play/next/repeat stay a fixed-
              width cluster on the left; the volume slider is the one
              flexible element that stretches to fill the remaining width,
              matching the screenshot's slider reaching almost to the "100"
              label at the far right. */}
          <div className="mt-[44px] flex items-center gap-4">
            {/* SHOWA RE-SKIN: secondary controls (shuffle/prev/next/repeat) are
                bare unhoused glyphs — dim faceplate tone, no fill, no key shape
                at all. Reversed from an earlier pass that gave prev/next a
                rectilinear button body; a reference screenshot of the actual
                target look showed prev/next as plain double-chevron glyphs
                with no housing whatsoever, matching shuffle/repeat exactly.
                The only thing in this row that's a real "object" is the
                play/pause dome. */}
            <button
              onClick={toggleShuffle}
              className={cn(
                "focus-ring grid size-9 shrink-0 place-items-center transition",
                shuffle ? "text-[hsl(var(--faceplate)/0.9)]" : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
              )}
              aria-label="Shuffle"
            >
              <Shuffle className="size-5" style={ICON_SHADOW} />
            </button>

            <div className="flex shrink-0 items-center gap-6">
              <button
                onClick={() => void send({ action: "prev" })}
                disabled={busy}
                className="focus-ring grid size-10 place-items-center text-[hsl(var(--faceplate)/0.75)] transition hover:text-[hsl(var(--faceplate))] active:translate-y-px"
                aria-label="Previous"
              >
                {/* SHOWA RE-SKIN: strokeWidth={0} — lucide draws a strokeWidth=2
                    outline in currentColor by default even on a filled icon,
                    which at this taupe tone showed as a faint border/ridge
                    around the glyph (flagged by Greg). Pure fill, no stroke. */}
                <SkipBack className="size-7 fill-current" strokeWidth={0} style={ICON_SHADOW} />
              </button>

              {/* SHOWA RE-SKIN: play/pause dome — FOUR rounds of CSS
                  gradient layering got progressively closer but never matched
                  the photorealistic look of the actual mockup (warm satin
                  metal, organic brushed texture, soft light wrap). Greg
                  supplied the mockup's button as a real cropped PNG asset
                  (transparent corners, circle baked in) — same pattern
                  already used elsewhere in this app for photo-backed visuals
                  (the album-niche cubby photo). Swapped to that: a plain
                  <img> filling the button, icon drawn on top. This IS the
                  mockup now, not an approximation of it.
                  Asset location: public/play-button.png (square, transparent
                  corners around the circle) — mirrors the existing
                  public/vinyl-record.svg convention for static UI imagery. */}
              <button
                onClick={() => void send({ action: "toggle" })}
                disabled={busy}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="focus-ring relative grid size-[55px] shrink-0 place-items-center rounded-full transition active:translate-y-px active:brightness-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/play-button.png"
                  alt=""
                  draggable={false}
                  className="absolute inset-0 size-full select-none"
                  style={{
                    filter: "drop-shadow(0 8px 14px hsl(0 0% 0% / 0.55))",
                  }}
                />
                <span className="relative z-10 text-[hsl(36_12%_14%)] [filter:drop-shadow(0_1px_0_hsl(40_20%_70%/0.4))]">
                  {isPlaying ? (
                    <Pause className="size-7 fill-current" />
                  ) : (
                    <Play className="size-7 translate-x-0.5 fill-current" />
                  )}
                </span>
              </button>

              <button
                onClick={() => void send({ action: "next" })}
                disabled={busy}
                className="focus-ring grid size-10 place-items-center text-[hsl(var(--faceplate)/0.75)] transition hover:text-[hsl(var(--faceplate))] active:translate-y-px"
                aria-label="Next"
              >
                <SkipForward className="size-7 fill-current" strokeWidth={0} style={ICON_SHADOW} />
              </button>
            </div>

            <button
              onClick={cycleRepeat}
              className={cn(
                "focus-ring grid size-9 shrink-0 place-items-center transition",
                repeat !== "off" ? "text-[hsl(var(--faceplate)/0.9)]" : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
              )}
              aria-label={repeat === "one" ? "Repeat one" : repeat === "all" ? "Repeat all" : "Repeat off"}
            >
              {repeat === "one" ? (
                <Repeat1 className="size-5" style={ICON_SHADOW} />
              ) : (
                <Repeat className="size-5" style={ICON_SHADOW} />
              )}
            </button>

            {/* Volume — moved up into the transport row per Greg's reference
                screenshot; the slider is the one flex-growing element so it
                fills the row between the repeat icon and the numeric readout,
                rather than living on its own line below. */}
            <button
              onClick={() => void send({ action: player.muted ? "unmute" : "mute" })}
              className="focus-ring grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
              aria-label={player.muted ? "Unmute" : "Mute"}
            >
              <VolIcon className="size-5" style={ICON_SHADOW} />
            </button>
            {/* SHOWA RE-SKIN: volume is a plain Slider (volume variant), not the
                StepperSlider — the mockup has no −/+ buttons, just a thin cream
                line + small cream knob + the numeric readout. The steppers only
                existed for fiddly touch targets on iPad, and this app is
                desktop-only, so they're pure overhead here. */}
            <Slider
              value={vol}
              min={0}
              max={100}
              variant="volume"
              onChange={(v) => {
                setDraggingVol(true);
                setVol(v);
              }}
              onCommit={(v) => {
                setDraggingVol(false);
                void send({ action: "volume", value: v });
              }}
              aria-label="Volume"
              className="min-w-0 flex-1"
            />
            <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {player.muted ? "—" : vol}
            </span>
          </div>
        </div>

      {/* SHOWA RE-SKIN: stream-info is now its OWN recessed full-bleed band at
          the foot of the card, not just a seam-divided line sharing the panel
          surface. The negative margins (-mx-4 -mb-4) cancel the Card's p-4 so
          the band runs edge-to-edge and all the way down to the bottom edge;
          the darker wash + inset top-shadow sink it into a separate trough, so
          it reads as a distinct sunken footer below the main panel — matching
          the mockup, where the service/format strip is clearly its own band,
          not more of the same surface. It also now carries the bitrate readout
          pill (relocated from above the title) beside the tier tag. */}
      {showStreamInfo && displayService && (
        <div
          className="relative z-10 -mx-4 -mb-4 mt-8 px-4 py-3.5"
          style={{
            background: "hsl(0 0% 0% / 0.3)",
            boxShadow:
              "inset 0 2px 5px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(var(--faceplate) / 0.04)",
          }}
        >
          <StreamInfoLine
            service={displayService}
            audio={player.audio}
            quality={player.quality}
          />
        </div>
      )}
      </Card>
      </div>
      {kiosk && (
        <KioskView
          player={player}
          artSrc={showArt ? player.albumArt : null}
          rgb={rgb}
          isPlaying={isPlaying}
          sourceLabel={sourceDisplay}
          vol={vol}
          muted={player.muted}
          onColor={setAlbumColor}
          onSend={(b) => void send(b)}
          onVolume={(v) => {
            setDraggingVol(true);
            setVol(v);
          }}
          onVolumeCommit={(v) => {
            setDraggingVol(false);
            void send({ action: "volume", value: v });
          }}
          view={kioskView}
          onView={setKioskView}
          canLyrics={canLyrics}
          lines={lyrics?.synced ?? null}
          plain={lyrics?.plain ?? null}
          lyricsLoading={lyricsLoading}
          position={pos}
          onSeek={(t) => {
            const v = Math.round(t);
            setPos(v);
            if (hasDuration) void send({ action: "seek", value: v });
          }}
          onExit={exitKiosk}
        />
      )}
    </>
  );
}

/**
 * Single-line stream metadata in the controls column for network / Bluetooth
 * sources: "<logo> Service | FORMAT | TIER" (kept on one row — the stacked
 * version was cramped on mobile).
 */
function StreamInfoLine({
  service,
  audio,
  quality,
}: {
  service: StreamService;
  audio: AudioFormat | null;
  quality: string | null;
}) {
  const tier = audio?.tier ?? null;
  const tierLabel =
    tier === "hires"
      ? "Hi-Res Lossless"
      : tier === "lossless"
        ? "Lossless"
        : tier === "lossy"
          ? "Lossy"
          : null;
  // Graded "metal" styling so quality reads at a glance:
  // SHOWA RE-SKIN: was gold (hi-res) → cream (lossless) → grey (lossy), per
  // a generic "precious metal tier" idea. Greg's reference screenshot shows
  // HI-RES LOSSLESS rendered in the palette's own rust signal accent
  // (sampled from the reference: RGB ~155,85,40, matching hsl(var(--primary))
  // closely), not gold — swapped so hi-res reads as "the accent color lit up"
  // rather than a precious-metal badge unrelated to the rest of the palette.
  // Lossless stays faceplate-cream (already fixed in an earlier pass).
  const tierTextStyle: CSSProperties | undefined =
    tier === "lossless"
      ? {
          // SHOWA RE-SKIN (Round 20 fix): was hardcoded #E8E1D3/#DCD3C2 cream
          // gradient that didn't update when the faceplate token shifted to
          // taupe in Round 19. Now reads --faceplate/--faceplate-dim so it
          // tracks any future palette change automatically.
          backgroundImage: "linear-gradient(to right, hsl(var(--faceplate)), hsl(var(--faceplate-dim)))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }
      : undefined;
  const tierTextClass =
    tier === "hires"
      ? "font-normal text-[hsl(var(--primary))]"
      : tier === "lossless"
        ? "font-normal"
        : "text-muted-foreground";

  const parts: ReactNode[] = [
    <span key="svc" className="font-normal text-foreground/90">
      {service.name}
      {service.detail && (
        <span className="font-normal text-muted-foreground"> · {service.detail}</span>
      )}
    </span>,
  ];
  if (audio?.codec)
    parts.push(
      <span key="codec" className="inline-flex items-center gap-1 font-mono font-normal">
        <FileAudio className="size-3.5" />
        {audio.codec}
      </span>,
    );
  if (tierLabel)
    parts.push(
      <span key="tier" className="inline-flex items-center gap-1 uppercase tracking-wide">
        {tier === "hires" && (
          <Gem className="size-3.5 shrink-0 text-[hsl(var(--primary))]" strokeWidth={1.5} />
        )}
        <span className={tierTextClass} style={tierTextStyle}>
          {tierLabel}
        </span>
      </span>,
    );

  // SHOWA RE-SKIN: bitrate / bit-depth / sample-rate readout, relocated from
  // above the title into this band as a faceplate-cream inset chip beside the
  // tier tag (mockup foot: "… HI-RES LOSSLESS | 700 kbps | 24-bit/44.1 kHz").
  // Only pushed when there's something to show, so the auto separator doesn't
  // leave a dangling "|".
  const hasReadout = !!(
    quality?.trim() ||
    audio?.bitRate ||
    audio?.bitDepth ||
    audio?.sampleRate
  );
  if (hasReadout)
    parts.push(<QualityPill key="bitrate" quality={quality} audio={audio} tone="readout" />);

  const nodes: ReactNode[] = [];
  parts.forEach((p, i) => {
    if (i > 0)
      nodes.push(
        <span key={`sep-${i}`} className="text-muted-foreground/40">
          |
        </span>,
      );
    nodes.push(p);
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-normal text-muted-foreground">
      <ServiceLogo
        logo={service.logo}
        serviceKey={service.key}
        className="size-5 shrink-0 text-foreground/80"
      />
      {nodes}
    </div>
  );
}
