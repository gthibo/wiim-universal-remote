"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Setup console for WiiM Universal Remote.
 *
 * DESIGN CONSTRAINTS -- read before changing:
 *  - Single file. No Tailwind, no CSS modules, no component library. All
 *    styles are inline objects. The headless strip removed the entire CSS
 *    pipeline; importing anything here resurrects it.
 *  - Mobile-first. The Sofabaton X1S has no desktop app, so users configure
 *    buttons on a phone. This page is read on that phone, next to the app.
 *  - Its real job is producing URLs to paste into X1S buttons. Controls exist
 *    to prove the device answers; the URL text is the deliverable.
 */

type Status = {
  host: string;
  state: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  volume: number;
  muted: boolean;
  sourceLabel: string;
  position: number;
  duration: number;
};

const POLL_MS = 2000;

const SOURCE_KEYS = [
  "wifi", "bluetooth", "line-in", "optical", "co-axial",
  "HDMI", "ARC", "phono", "RCA", "PCUSB",
];

const OUTPUT_KEYS = ["line-out", "optical", "coax", "headphone", "bluetooth"];

/** Plain-language messages for the error codes fail()/apiError() can emit. */
function humanError(code: string, ip: string): string {
  switch (code) {
    case "FORBIDDEN_HOST":
      return `"${ip}" is not a local network address. WiiM devices are usually 192.168.x.x -- check the WiiM app under Device Info > Network.`;
    case "UNKNOWN_DEVICE":
      return `"${ip}" is not a usable device address. Enter the WiiM IP, e.g. 192.168.1.102.`;
    case "TIMEOUT":
      return `No answer from ${ip}. Check the IP is right and the device is powered on and on this network.`;
    case "REMOTE_AUTH":
      return "Wrong or missing token. This server has REMOTE_TOKEN set, so the token below must match it.";
    case "UNSUPPORTED":
      return "This WiiM model does not support that command.";
    default:
      return `Could not reach ${ip}. Check the IP and that the device is on.`;
  }
}

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function Console() {
  const [ip, setIp] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [hostLabel, setHostLabel] = useState("");
  const [localhostWarn, setLocalhostWarn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const h = window.location.host;
    setOrigin(`${window.location.protocol}//${h}`);
    setHostLabel(h);
    // A URL pointing at localhost works in this browser but is useless in an
    // X1S button -- the remote is a different machine. Warn rather than
    // silently hand out a broken URL.
    setLocalhostWarn(/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(h));
  }, []);

  const urlFor = useCallback(
    (path: string) => {
      const base = `${origin}/api/remote/${ip.trim() || "<device-ip>"}${path}`;
      return token ? `${base}?token=${encodeURIComponent(token)}` : base;
    },
    [origin, ip, token],
  );

  /**
   * Single choke point for talking to the API. Handles all three response
   * shapes this service can emit: JSON status from okJson(), JSON {error,code}
   * from the auth guard's apiError(), and plain-text "error: CODE" from fail().
   */
  const call = useCallback(
    async (path: string, wantJson = false) => {
      const addr = ip.trim();
      if (!addr) {
        setError("Enter your WiiM IP address first.");
        return null;
      }
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      try {
        const res = await fetch(`/api/remote/${addr}${path}${qs}`, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("json") ? await res.json() : await res.text();

        if (!res.ok) {
          const code =
            typeof body === "object" && body !== null && "code" in body
              ? String((body as { code: unknown }).code)
              : String(body).replace(/^error:\s*/, "").trim();
          setError(humanError(code, addr));
          return null;
        }
        setError(null);
        return wantJson ? (body as Status) : true;
      } catch {
        setError(
          "Could not reach the server. If you are on a phone, make sure you opened this page by its IP address, not localhost.",
        );
        return null;
      }
    },
    [ip, token],
  );

  const poll = useCallback(async () => {
    const s = await call("/status", true);
    if (s) setStatus(s as Status);
  }, [call]);

  /** Fire a control, then immediately re-poll so the UI reflects it at once. */
  const send = useCallback(
    async (path: string) => {
      setBusy(true);
      const done = await call(path);
      if (done) await poll();
      setBusy(false);
    },
    [call, poll],
  );

  // Poll loop. Pauses while the tab is hidden so a forgotten tab does not
  // hammer the device all day.
  useEffect(() => {
    if (!ip.trim()) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") await poll();
      if (!cancelled) timer.current = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ip, poll]);

  /**
   * Copy with an insecure-context fallback.
   *
   * navigator.clipboard only exists in a secure context (https or localhost).
   * The primary use path here is a phone on plain http over a LAN IP, where it
   * is undefined -- so the deprecated execCommand path is the one that actually
   * runs for most users, not an edge case. If both fail we say so rather than
   * failing silently; the URL text is user-selectable as a manual fallback.
   */
  const copy = async (text: string, label: string) => {
    const flash = (v: string) => {
      setCopied(v);
      setTimeout(() => setCopied(null), 1500);
    };
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        flash(label);
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const done = document.execCommand("copy");
      document.body.removeChild(ta);
      flash(done ? label : "select it");
    } catch {
      flash("select it");
    }
  };
  const PLAYBACK: [string, string][] = [
    ["Play", "/media/play"],
    ["Pause", "/media/pause"],
    ["Play/Pause", "/media/toggle"],
    ["Stop", "/media/stop"],
    ["Previous", "/media/prev"],
    ["Next", "/media/next"],
  ];
  const VOLUME: [string, string][] = [
    ["Vol +", "/vol/++"],
    ["Vol -", "/vol/--"],
    ["Up 5", "/vol/up/5"],
    ["Down 5", "/vol/down/5"],
    ["Mute on", "/mute/on"],
    ["Mute off", "/mute/off"],
    ["Mute toggle", "/mute/toggle"],
  ];
  const OTHER: [string, string][] = [
    ["LED on", "/led/on"],
    ["LED off", "/led/off"],
    ["Display on", "/display/on"],
    ["Display off", "/display/off"],
    ["Seek +30", "/media/seek/+30"],
    ["Seek -10", "/media/seek/-10"],
  ];

  const btn = (label: string, path: string) => (
    <Btn
      key={path + label}
      label={label}
      path={path}
      url={urlFor(path)}
      send={send}
      busy={busy}
      copy={copy}
      copied={copied}
    />
  );

  return (
    <main style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>WiiM Universal Remote</h1>
        <p style={S.sub}>Test your WiiM, then copy button URLs into your remote app.</p>
      </header>

      <section style={S.card}>
        <label style={S.label} htmlFor="ip">WiiM IP address</label>
        <input
          id="ip"
          style={S.input}
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <p style={S.hint}>Find this in the WiiM Home app: Device Info &rsaquo; Network.</p>

        <label style={S.label} htmlFor="token">
          Token <span style={S.optional}>(usually blank)</span>
        </label>
        <input
          id="token"
          style={S.input}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p style={S.hint}>
          Leave this blank unless you set <code style={S.code}>REMOTE_TOKEN</code> when
          starting the server. If you did, every URL below needs it -- that is what stops
          anyone else on your Wi-Fi from controlling this device.{" "}
          <a
            style={S.link}
            href="https://github.com/gthibo/wiim-universal-remote#remote-token"
            target="_blank"
            rel="noreferrer"
          >
            More about tokens
          </a>
        </p>
      </section>

      {localhostWarn && (
        <p style={S.warn}>
          You opened this page as <code>{hostLabel}</code>. The URLs below will only
          work from this computer. To get URLs your remote can use, reopen this page
          using the server IP address, for example <code>http://192.168.1.50:39447</code>.
        </p>
      )}

      {error && <p style={S.error}>{error}</p>}

      <section style={S.card}>
        <div style={S.rowBetween}>
          <h2 style={S.h2}>Now playing</h2>
          <span style={S.dot(!!status && !error)}>
            {status && !error ? "connected" : "no data"}
          </span>
        </div>
        {status ? (
          <div>
            <p style={S.track}>{status.title || "(nothing playing)"}</p>
            <p style={S.meta}>
              {[status.artist, status.album].filter(Boolean).join(" -- ") || "\u00a0"}
            </p>
            <p style={S.meta}>
              {status.state} &middot; {status.sourceLabel} &middot; vol {status.volume}
              {status.muted ? " (muted)" : ""}
              {status.duration > 0
                ? ` \u00b7 ${fmtTime(status.position)} / ${fmtTime(status.duration)}`
                : ""}
            </p>
          </div>
        ) : (
          <p style={S.meta}>Enter an IP above to see live status.</p>
        )}
      </section>

      <Group title="Playback">{PLAYBACK.map(([l, p]) => btn(l, p))}</Group>
      <Group title="Volume">{VOLUME.map(([l, p]) => btn(l, p))}</Group>

      <Group title="Inputs">
        {btn("Next input", "/input/next-input")}
        {SOURCE_KEYS.map((k) => btn(k, `/input/${k}`))}
      </Group>

      <Group title="Outputs">{OUTPUT_KEYS.map((k) => btn(k, `/output/${k}`))}</Group>

      <Group title="Presets">
        {[1, 2, 3, 4, 5, 6].map((n) => btn(`Preset ${n}`, `/preset/${n}`))}
      </Group>

      <Group title="Other">{OTHER.map(([l, p]) => btn(l, p))}</Group>

      <footer style={S.footer}>
        <p style={S.hint}>
          <strong>Display</strong> works on the WiiM Ultra only. Inputs and outputs
          vary by model -- a button that does nothing is likely a feature your device
          does not have.
        </p>
        <p style={S.hint}>
          Anyone on your network can use these URLs. That is usually fine at home.
          Do not forward this port to the internet.
        </p>
      </footer>
    </main>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.card}>
      <h2 style={S.h2}>{title}</h2>
      <div style={S.list}>{children}</div>
    </section>
  );
}

function Btn({
  label,
  path,
  url,
  send,
  busy,
  copy,
  copied,
}: {
  label: string;
  path: string;
  url: string;
  send: (p: string) => void;
  busy: boolean;
  copy: (t: string, l: string) => void;
  copied: string | null;
}) {
  return (
    <div style={S.item}>
      <div style={S.itemTop}>
        <button style={S.go} onClick={() => send(path)} disabled={busy}>
          {label}
        </button>
        <button style={S.copyBtn} onClick={() => copy(url, path + label)}>
          {copied === path + label ? "copied" : "copy URL"}
        </button>
      </div>
      <code style={S.url}>{url}</code>
    </div>
  );
}

const BORDER = "1px solid #2a2f3a";

const S = {
  page: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    background: "#14171d",
    color: "#e6e8ec",
    minHeight: "100vh",
    padding: "16px 14px 48px",
    maxWidth: 620,
    marginLeft: "auto",
    marginRight: "auto",
    boxSizing: "border-box" as const,
  },
  header: { marginBottom: 16 },
  h1: { fontSize: 20, margin: "0 0 4px" },
  h2: {
    fontSize: 13,
    margin: "0 0 10px",
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    color: "#93a0b4",
  },
  sub: { margin: 0, fontSize: 14, color: "#93a0b4" },
  card: {
    border: BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    background: "#191d25",
  },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  label: { display: "block", fontSize: 13, marginBottom: 6, color: "#c3cad6" },
  optional: { color: "#7b8798", fontWeight: 400 },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    fontSize: 16,
    padding: "11px 12px",
    borderRadius: 8,
    border: BORDER,
    background: "#0f1218",
    color: "#e6e8ec",
    marginBottom: 6,
  },
  hint: { fontSize: 12.5, color: "#8b95a5", margin: "4px 0 12px", lineHeight: 1.5 },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    background: "#0f1218",
    border: BORDER,
    borderRadius: 4,
    padding: "1px 4px",
  },
  link: { color: "#8fb6e8", textDecoration: "underline" },
  warn: {
    fontSize: 13,
    lineHeight: 1.55,
    background: "#3a2f16",
    border: "1px solid #6b571f",
    color: "#f0dfae",
    padding: "10px 12px",
    borderRadius: 8,
    marginBottom: 12,
  },
  error: {
    fontSize: 13,
    lineHeight: 1.55,
    background: "#3a1f22",
    border: "1px solid #7a3239",
    color: "#f3c9cd",
    padding: "10px 12px",
    borderRadius: 8,
    marginBottom: 12,
  },
  track: { fontSize: 16, margin: "0 0 2px", fontWeight: 600 },
  meta: { fontSize: 13, color: "#93a0b4", margin: "0 0 2px" },
  dot: (online: boolean) => ({
    fontSize: 11,
    color: online ? "#7fd6a4" : "#7b8798",
    border: online ? "1px solid #2f5f47" : "1px solid #333a47",
    borderRadius: 999,
    padding: "2px 8px",
  }),
  list: { display: "flex", flexDirection: "column" as const, gap: 10 },
  item: { borderTop: BORDER, paddingTop: 10 },
  itemTop: { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 },
  go: {
    flex: "1 1 auto",
    fontSize: 15,
    padding: "10px 12px",
    borderRadius: 8,
    border: BORDER,
    background: "#232936",
    color: "#e6e8ec",
    cursor: "pointer",
    minHeight: 44,
    textAlign: "left" as const,
  },
  copyBtn: {
    flex: "0 0 auto",
    fontSize: 13,
    padding: "10px 12px",
    borderRadius: 8,
    border: BORDER,
    background: "#0f1218",
    color: "#9fb0c6",
    cursor: "pointer",
    minHeight: 44,
  },
  url: {
    display: "block",
    fontSize: 11.5,
    color: "#7f8b9d",
    wordBreak: "break-all" as const,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    lineHeight: 1.45,
    userSelect: "all" as const,
  },
  footer: { marginTop: 4 },
} as const;