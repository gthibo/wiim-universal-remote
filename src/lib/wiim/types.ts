/**
 * Normalised, UI-friendly shapes derived from the raw WiiM API responses.
 *
 * Headless build: the EQ, lyrics, and multi-device-snapshot types were removed
 * with the dashboard (2026-07-22) -- they had no consumer here and implied
 * features this service does not have. Git history has them if the dashboard
 * ever needs them back. What remains is what commands.ts / parse.ts actually
 * return.
 */

export type PlaybackState = "playing" | "paused" | "stopped" | "loading";

/** The streaming service / protocol behind the current track (network & BT). */
export interface StreamService {
  key: string; // "tidal" | "spotify" | "qobuz" | "airplay" | "bluetooth" | ...
  name: string; // display label, e.g. "TIDAL Connect"
  logo: string | null; // brand-logo key; null -> caller picks a fallback
  detail?: string | null; // e.g. the connected Bluetooth source device name
}

/**
 * Audio format for the current track. WiiM's HTTP API does NOT expose the
 * codec, so `codec`/`tier` are inferred from sampleRate/bitDepth + the known
 * service. Numbers are the raw getMetaInfo values.
 */
export interface AudioFormat {
  codec: string | null; // inferred, e.g. "FLAC" | "ALAC" | "MP3" | "AAC" | "OGG"
  tier: "hires" | "lossless" | "lossy" | null;
  sampleRate: number | null; // Hz
  bitDepth: number | null; // bits
  bitRate: number | null; // kbps
}

export interface PlayerStatus {
  state: PlaybackState;
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArt: string | null; // absolute device URL
  position: number; // seconds
  duration: number; // seconds
  volume: number; // 0-100
  muted: boolean;
  /** raw numeric source mode (getPlayerStatusEx `mode`). */
  sourceMode: string;
  /** friendly current source label. */
  sourceLabel: string;
  /** which SOURCES.key this maps to, when identifiable. */
  sourceKey: string | null;
  /** casting app/vendor (getPlayerStatusEx `vendor`), e.g. "Plex"; null if none. */
  vendor: string | null;
  repeat: "off" | "one" | "all";
  shuffle: boolean;
  /** numeric EQ preset index from player status (presentational only). */
  eqIndex: number;
  quality: string | null; // e.g. "44.1 kHz / 16 bit"
  /**
   * NOTE: `service`, `audio`, `quality` and `albumArt` are filled from
   * getMetaInfo. The /status route deliberately does not call it (one HTTP
   * round trip, not two), so they are null there. That is expected, not a bug.
   */
  service: StreamService | null;
  audio: AudioFormat | null;
}

export interface DeviceInfo {
  name: string;
  model: string; // marketing-ish (project / priv_prj)
  project: string;
  firmware: string;
  mac: string;
  uuid: string;
  ip: string;
  rssi: number | null;
  internet: boolean;
  /** active network interface. */
  network: "ethernet" | "wifi" | null;
  group: string; // "0" master/standalone, "1" follower
  /** temperatures in degrees C when the model exposes them (amp models). */
  temperatureCpu: number | null;
  temperatureBoard: number | null;
  /** number of preset slots (preset_key). */
  presetCount: number;
  /**
   * Multiroom role. "solo"/"slave" come from getStatusEx (`group` +
   * top-level `master_ip`). "master" required a separate
   * `multiroom:getSlaveList` call that this build does not make, so in
   * practice this is never "master" here.
   */
  multiroomRole: "solo" | "master" | "slave";
  /** master's IP when role === "slave"; null otherwise. */
  multiroomMasterIp: string | null;
  /** slave entries when role === "master"; empty otherwise. */
  multiroomSlaves: { ip: string; uuid: string; volume: number; mute: boolean }[];
}

export interface SubwooferStatus {
  enabled: boolean;
  connected: boolean;
  level: number; // -15..+15 dB
  crossover: number; // 30..250 Hz
  phase: number; // 0 | 180
  delay: number; // ms
  mainBassFilter: boolean | null;
  subBypass: boolean | null;
}

export interface OutputStatus {
  hardware: number; // current OUTPUTS.id
  bluetoothSource: boolean;
  audioCast: boolean;
}

export interface PresetItem {
  index: number; // 1-based slot
  name: string | null; // null = empty slot
  hasArt: boolean;
}
