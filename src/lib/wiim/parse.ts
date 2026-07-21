import {
  PLAYING_STATUS,
  PLAYING_MODE_LABEL,
  NETWORK_PLAY_MODES,
  SOURCES,
} from "./constants";
import type {
  PlayerStatus,
  DeviceInfo,
  SubwooferStatus,
  OutputStatus,
  PlaybackState,
} from "./types";

/** Tolerant JSON parse — WiiM payloads are JSON but occasionally have noise. */
export function safeJson<T = Record<string, unknown>>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Trim to the outermost {...} / [...] and retry.
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Decode the common HTML entities WiiM leaves in metadata (e.g. "&amp;" → "&"). */
function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCode(parseInt(d, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#0*39);/gi, "'")
    .replace(/&amp;/gi, "&"); // last, so "&amp;lt;" → "&lt;" → "<"
}

function safeFromCode(n: number): string {
  try {
    return Number.isFinite(n) ? String.fromCodePoint(n) : "";
  } catch {
    return "";
  }
}

/** WiiM hex-encodes Title/Artist/Album (UTF-8 bytes). Decode when it looks hex. */
export function decodeMaybeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "unknown" || lower === "un_known" || lower === "none") return null;
  if (s.length >= 2 && s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s)) {
    try {
      const decoded = Buffer.from(s, "hex").toString("utf8").replace(/\0+$/g, "");
      // If decoding produced mostly replacement chars, keep the raw value.
      if (decoded && !/�{2,}/.test(decoded)) {
        const t = decoded.trim();
        const tl = t.toLowerCase();
        if (!t || tl === "unknown" || tl === "un_known") return null;
        return decodeEntities(t);
      }
    } catch {
      /* fall through */
    }
  }
  return decodeEntities(s);
}

/** Clean a plain-text getMetaInfo value: drop empty / WiiM "unknow(n)" placeholders, decode entities. */
export function cleanMetaText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "unknow" || lower === "unknown" || lower === "un_known" || lower === "none") return null;
  return decodeEntities(s);
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function nonZero(v: unknown): boolean {
  const s = typeof v === "string" ? v.trim() : "";
  return !!s && s !== "0.0.0.0";
}

/**
 * Map the read-side `loop` field (getPlayerStatusEx) to {repeat, shuffle}.
 *
 * Values follow the official "HTTP API for WiiM Products" status table — which
 * differs from the python-linkplay / Home-Assistant enum (those were written
 * against older LinkPlay firmware and mis-map 0/1/3 on current WiiM units):
 *   0 = loop all            -> repeat all
 *   1 = single loop         -> repeat one
 *   2 = shuffle loop        -> shuffle + repeat all
 *   3 = shuffle, no loop    -> shuffle, no repeat
 *   4 = no shuffle, no loop -> off  (the device's default; sample shows loop:4)
 * -1 (write-only "sequence loop") and 5 (firmware-specific shuffle+repeat) are
 * mapped defensively in case they ever surface on the read side.
 */
function parseLoop(loop: number): { repeat: "off" | "one" | "all"; shuffle: boolean } {
  switch (loop) {
    case 0:
      return { repeat: "all", shuffle: false };
    case 1:
      return { repeat: "one", shuffle: false };
    case 2:
      return { repeat: "all", shuffle: true };
    case 3:
      return { repeat: "off", shuffle: true };
    case 5:
      return { repeat: "all", shuffle: true };
    case -1:
      return { repeat: "all", shuffle: false };
    case 4:
    default:
      return { repeat: "off", shuffle: false };
  }
}

/**
 * Inverse: the loopmode value to WRITE for a desired repeat/shuffle.
 *
 * The WiiM write command (setPlayerCmd:loopmode) only accepts the documented
 * set {-1, 0, 1, 2} and is asymmetric with the read table:
 *   off, no shuffle -> 0   ("sequence, no loop"; device reports back 4)
 *   one, no shuffle -> 1   ("single loop";       reports back 1)
 *   all, no shuffle -> -1  ("sequence loop";     reports back 0 = loop all)
 *   any, shuffle    -> 2   ("shuffle loop" = shuffle + repeat all — the only
 *                           shuffle mode settable over HTTP; reports back 2)
 * Each write round-trips to the matching parseLoop() state above.
 */
export function computeLoopMode(repeat: "off" | "one" | "all", shuffle: boolean): number {
  if (shuffle) return 2;
  if (repeat === "one") return 1;
  if (repeat === "all") return -1;
  return 0;
}

export function parsePlayerStatus(raw: Record<string, unknown>): PlayerStatus {
  const statusKey = String(raw.status ?? "stop").toLowerCase();
  const state: PlaybackState =
    (PLAYING_STATUS as Record<string, PlaybackState>)[statusKey] ?? "stopped";

  const sourceMode = String(raw.mode ?? "0");
  const sourceLabel = PLAYING_MODE_LABEL[sourceMode] ?? "Unknown";
  // Casting app/vendor (e.g. "Plex", "Roon"). WiiM populates this for DLNA/UPnP
  // push sessions, which land on non-streaming modes (Plex → mode 99, normally
  // "Follower") and leave Title/Artist/Album as the hex for "Unknown" in this
  // payload — the real metadata arrives via getMetaInfo instead.
  const vendor = cleanMetaText(raw.vendor);
  const physicalSourceKey = SOURCES.find((s) => s.modes.includes(sourceMode))?.key ?? null;
  let sourceKey: string | null = null;
  if (NETWORK_PLAY_MODES.has(sourceMode)) {
    sourceKey = "wifi";
  } else if (vendor && !physicalSourceKey) {
    // BROAD vendor fix: a populated vendor on a mode that isn't a known
    // physical input is a network/cast push session (Plex/BubbleUPnP/etc.) —
    // treat it as the network source so art + stream-info + service detection
    // all light up (they're gated on sourceKey/service being non-null). Guarded
    // by !physicalSourceKey so a vendor reported alongside a real physical
    // input never gets mis-flagged as network.
    sourceKey = "wifi";
  } else {
    sourceKey = physicalSourceKey;
  }

  const { repeat, shuffle } = parseLoop(num(raw.loop, 0));

  return {
    state,
    title: decodeMaybeHex(raw.Title),
    artist: decodeMaybeHex(raw.Artist),
    album: decodeMaybeHex(raw.Album),
    albumArt: null, // filled from getMetaInfo
    position: Math.round(num(raw.curpos) / 1000),
    duration: Math.round(num(raw.totlen) / 1000),
    volume: Math.round(num(raw.vol)),
    muted: String(raw.mute) === "1",
    sourceMode,
    sourceLabel,
    sourceKey,
    vendor,
    repeat,
    shuffle,
    eqIndex: num(raw.eq, 0),
    quality: null, // filled from getMetaInfo
    service: null, // filled in snapshot (needs mode + art URL)
    audio: null, // filled in snapshot (needs getMetaInfo)
  };
}

/** Pick the active (non-zero) interface address. */
function pickIp(raw: Record<string, unknown>): string {
  const candidates = [raw.apcli0, raw.eth0, raw.eth2, raw.ra0];
  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s && s !== "0.0.0.0") return s;
  }
  return "";
}

const MODEL_NAMES: Record<string, string> = {
  Muzo_Mini: "WiiM Mini",
  WiiM_Mini: "WiiM Mini",
  WiiM_Pro: "WiiM Pro",
  WiiM_Pro_Plus: "WiiM Pro Plus",
  WiiM_Amp: "WiiM Amp",
  WiiM_Amp_Pro: "WiiM Amp Pro",
  WiiM_Amp_Ultra: "WiiM Amp Ultra",
  WiiM_Ultra: "WiiM Ultra",
};

function friendlyModel(project: string, priv: string): string {
  if (project && MODEL_NAMES[project]) return MODEL_NAMES[project];
  const src = project || priv;
  if (!src) return "WiiM Device";
  return src.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function parseDeviceInfo(raw: Record<string, unknown>): DeviceInfo {
  const project = String(raw.project ?? "");
  const priv = String(raw.priv_prj ?? "");
  const tCpu = raw.temperature_cpu;
  const tBoard = raw.temperature_tmp102;
  const { role, masterIp } = parseMultiroom(raw);
  return {
    name: String(raw.DeviceName ?? raw.ssid ?? "WiiM Device"),
    model: friendlyModel(project, priv),
    project,
    firmware: String(raw.firmware ?? raw.Release ?? ""),
    mac: String(raw.MAC ?? raw.STA_MAC ?? raw.ETH_MAC ?? ""),
    uuid: String(raw.uuid ?? raw.upnp_uuid ?? ""),
    ip: pickIp(raw),
    rssi: raw.RSSI != null && raw.RSSI !== "" ? num(raw.RSSI) : null,
    internet: String(raw.internet) === "1",
    network: nonZero(raw.eth0) ? "ethernet" : nonZero(raw.apcli0) ? "wifi" : null,
    group: String(raw.group ?? "0"),
    temperatureCpu: tCpu != null && tCpu !== "" ? num(tCpu) : null,
    temperatureBoard: tBoard != null && tBoard !== "" ? num(tBoard) : null,
    presetCount: Math.max(0, Math.trunc(num(raw.preset_key))),
    multiroomRole: role,
    multiroomMasterIp: masterIp,
    // Master role/slave list can't be derived from getStatusEx on this
    // firmware — snapshot.ts overrides both from a separate
    // multiroom:getSlaveList call.
    multiroomSlaves: [],
  };
}

/**
 * Derive slave-side multiroom role from getStatusEx.
 *
 * Confirmed against real hardware (WiiM Pro fw 4.8, WiiM Ultra fw 5.2,
 * wmrm 4.3): there is no nested `multiroom` object in getStatusEx on this
 * firmware — `master_ip`/`master_uuid` are top-level fields instead, present
 * only when `group` is "1" (follower). getStatusEx never reports slave data
 * for a master, so "master" role can't be derived here at all — see
 * `parseMultiroomSlaves` (requires a separate `multiroom:getSlaveList` call,
 * wired in by snapshot.ts).
 *
 * Never throws — defaults to solo on any shape mismatch so the snapshot poll
 * (which other cards depend on) can never break here.
 */
function parseMultiroom(raw: Record<string, unknown>): {
  role: "solo" | "slave";
  masterIp: string | null;
} {
  const ownIp = pickIp(raw);
  if (String(raw.group ?? "0") !== "1") {
    return { role: "solo", masterIp: null };
  }
  const masterRaw = typeof raw.master_ip === "string" ? raw.master_ip.trim() : "";
  if (masterRaw && masterRaw !== "0.0.0.0" && masterRaw !== ownIp) {
    return { role: "slave", masterIp: masterRaw };
  }
  return { role: "slave", masterIp: null };
}

/**
 * Parse the response of `multiroom:getSlaveList` (sent to a candidate
 * master). Never throws — returns [] on any shape mismatch, which callers
 * treat as "not a master."
 */
export function parseMultiroomSlaves(raw: Record<string, unknown> | null): {
  ip: string;
  uuid: string;
  volume: number;
  mute: boolean;
}[] {
  if (!raw) return [];
  const list = raw.slave_list;
  if (!Array.isArray(list)) return [];
  const slaves: { ip: string; uuid: string; volume: number; mute: boolean }[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const ip = typeof e.ip === "string" ? e.ip.trim() : "";
    const uuid = typeof e.uuid === "string" ? e.uuid.trim() : "";
    if (!ip && !uuid) continue; // skip malformed entries
    slaves.push({
      ip: String(ip),
      uuid: String(uuid),
      volume: num(e.volume, 50),
      mute: String(e.mute) === "1",
    });
  }
  return slaves;
}

export function parseSubwoofer(raw: Record<string, unknown>): SubwooferStatus {
  return {
    enabled: String(raw.status) === "1",
    connected: String(raw.plugged) === "1",
    level: num(raw.level),
    crossover: num(raw.cross, 80),
    phase: num(raw.phase),
    delay: num(raw.sub_delay),
    mainBassFilter: raw.main_filter != null ? String(raw.main_filter) === "1" : null,
    subBypass: raw.sub_filter != null ? String(raw.sub_filter) === "1" : null,
  };
}

export function parseOutput(raw: Record<string, unknown>): OutputStatus {
  return {
    hardware: num(raw.hardware, 2),
    bluetoothSource: String(raw.source) === "1",
    audioCast: String(raw.audiocast) === "1",
  };
}

/** EQGetStat → enabled? (handles {"EQStat":"On"} and plain "On"/"OK"). */
export function parseEqStat(text: string): boolean {
  const j = safeJson<{ EQStat?: string }>(text);
  if (j?.EQStat) return j.EQStat.toLowerCase() === "on";
  return /(^|[^a-z])on([^a-z]|$)/i.test(text);
}

/** EQGetList → array of preset names. */
export function parseEqList(text: string): string[] {
  const j = safeJson<unknown>(text);
  if (Array.isArray(j)) return j.map(String).filter(Boolean);
  return [];
}
