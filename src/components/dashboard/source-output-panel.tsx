"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Radio,
  Speaker,
  Settings as SettingsIcon,
  ChevronDown,
  Plus,
  LogOut,
  Check,
  Tag,
  Cpu,
  Globe,
  Wifi,
  Cable,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { KeycapButton } from "./keycap-button";
import { useToast } from "@/components/toast";
import { apiSend, ApiError } from "@/lib/client/api";
import { SOURCES, OUTPUTS } from "@/lib/wiim/constants";
import { cn } from "@/lib/utils";
import type { DeviceListItem } from "@/lib/client/hooks";
import type { DeviceInfo } from "@/lib/wiim/types";

/**
 * SHOWA RE-SKIN: Source + Output + Device merged into ONE rectilinear panel
 * (mockup: a single bordered panel split into a left half — SOURCE row over
 * OUTPUT row, divided by a horizontal engraved seam — and a right-hand DEVICE
 * column, divided from the left half by a vertical engraved seam).
 *
 * Round 25: the DEVICE column is new. It absorbs functionality that used to
 * live in two now-orphaned components:
 *   - app-header.tsx      → device switcher dropdown, Add Device, Settings,
 *                            Logout, and the online/offline indicator dot.
 *   - device-info-card.tsx → Model / Firmware / IP / Wi-Fi Signal (or
 *                            Connection: Ethernet) / USB DAC info rows.
 * Per Greg: the header is gone entirely (this panel is now the only place
 * for device switching + add/settings/logout), and the standalone
 * DeviceInfoCard at the bottom of the dashboard is gone too (this panel is
 * now the only place for device info). Both orphaned files are left on disk,
 * unreferenced — same convention as source-card.tsx/output-card.tsx from
 * Round 21.
 *
 * 2026-07-13: multiroom-card.tsx absorbed too, same convention (left on disk,
 * unreferenced). All three multiroom states (solo/slave/master) now render
 * inside DeviceSection, between the Add/Settings/Logout tiles and the
 * Model/Firmware/IP info rows — see MultiroomSection below.
 *
 * Round 25 Pass 3 (screenshot fixes):
 *   - Rows restacked VERTICALLY: SOURCE/OUTPUT label sits ABOVE its keycap
 *     run now (mockup), instead of the old left-margin label gutter beside a
 *     right-aligned keycap run. The 96px label block is gone.
 *   - KEYCAP_WIDTH 150px → 100px (Greg's value).
 *   - DEVICE column 320px → 460px → 600px (Greg's values across passes).
 *   - DEVICE column l/r padding bumped to 4rem (px-16) in Pass 4.
 *   - Dropdown trigger + the three action tiles use a raised control face.
 *     Pass 3 used `.glass`, but at button scale its wide highlight + deep
 *     two-stop shadow read as a pillowed/rounded bevel — replaced in Pass 4
 *     with a new, flatter `.control-tile` class (subtle 1px inset highlight/
 *     shade + crisp edge ring) that matches the mockup's flat-faced look.
 *     Dropdown keeps its split name/chevron compartments.
 *
 * Pass 2 (prior) fixed the keycap-sizing bug: keycaps are a FIXED width in a
 * left-aligned flex row, so button size never depends on how many options a
 * row has (a device with fewer outputs no longer balloons its buttons).
 *
 * The device-binding/selection logic that lived in source-card.tsx and
 * output-card.tsx is folded in here too (pre-existing, Round 21). Reason: the
 * mockup's horizontal divider runs the full width of the LEFT half only, so
 * the seam has to be a sibling of the two rows within that half — which means
 * the panel must know whether each row is non-empty (to draw the seam only
 * between two real rows, and to self-hide that half if neither exists).
 */

interface RowOption {
  id: string;
  label: string;
  icon: string;
}

// Same engraved-glyph shadow used across now-playing-card / keycap-button, so
// the DEVICE column's icons read as the same material as everything else.
const ICON_SHADOW = { filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" };

// Fixed keycap width, shared by SOURCE and OUTPUT rows, so button size never
// depends on how many options a row has (Pass 2 fix). Greg's value: 100px.
const KEYCAP_WIDTH = "w-[100px] shrink-0";

export function SourceOutputPanel({
  deviceId,
  sourceKeys,
  currentSourceKey,
  sourceLabels,
  autoSourceLabels,
  disabledSources,
  outputIds,
  currentOutput,
  onChanged,
  devices,
  selectedId,
  onSelectDevice,
  online,
  info,
  usbDac,
}: {
  deviceId: string;
  sourceKeys: string[];
  currentSourceKey: string | null;
  sourceLabels?: Record<string, string>;
  autoSourceLabels?: Record<string, string>;
  disabledSources?: string[];
  outputIds: number[];
  currentOutput: number | null;
  onChanged: () => void;
  devices: DeviceListItem[];
  selectedId: string | null;
  onSelectDevice: (id: string) => void;
  online: boolean;
  info: DeviceInfo | null;
  usbDac?: string | null;
}) {
  const toast = useToast();
  const [busySource, setBusySource] = useState<string | null>(null);
  const [busyOutput, setBusyOutput] = useState<string | null>(null);
  // Accordion: whole panel (Source/Output/Device) collapsed by default,
  // per-session only (resets on reload) — plain state + CSS grid-rows trick,
  // no new dependency.
  const [open, setOpen] = useState(false);

  // ── Source options (mirrors the old SourceCard filter) ──────────────────
  // Always show the active source even if plm_support didn't flag it (USB) or
  // the WiiM app marked it disabled, so you can always switch back to it.
  const sourceOptions: RowOption[] = SOURCES.filter(
    (s) =>
      (sourceKeys.includes(s.key) || s.key === currentSourceKey) &&
      (!disabledSources?.includes(s.key) || s.key === currentSourceKey),
  ).map((s) => ({
    id: s.value,
    label: sourceLabels?.[s.key]?.trim() || autoSourceLabels?.[s.key]?.trim() || s.label,
    icon: s.icon,
  }));
  const currentSourceValue = SOURCES.find((s) => s.key === currentSourceKey)?.value ?? null;

  // ── Output options (mirrors the old OutputCard filter) ──────────────────
  const outputOptions: RowOption[] = OUTPUTS.filter((o) => outputIds.includes(o.id)).map((o) => ({
    id: String(o.id),
    label: o.label,
    icon: o.icon,
  }));
  const currentOutputId = currentOutput != null ? String(currentOutput) : null;

  const hasSource = sourceOptions.length > 0;
  const hasOutput = outputOptions.length > 0;
  const hasLeft = hasSource || hasOutput;
  const hasDevice = devices.length > 0;
  if (!hasLeft && !hasDevice) return null;

  async function selectSource(value: string) {
    setBusySource(value);
    try {
      await apiSend(`/api/devices/${deviceId}/source`, "POST", { value });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Could not switch source", "error");
    } finally {
      setBusySource(null);
    }
  }

  async function selectOutput(id: string) {
    setBusyOutput(id);
    try {
      await apiSend(`/api/devices/${deviceId}/output`, "POST", { mode: Number(id) });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Could not switch output", "error");
    } finally {
      setBusyOutput(null);
    }
  }

  return (
    // p-0: the rows/columns pad themselves so the seams can run edge-to-edge.
    // !mt-[60px]: forced past the dashboard's space-y-4 rhythm (its `> * + *`
    // margin rule out-specifies a plain mt-*) to seat the panel ~60px below the
    // now-playing card.
    <Card className="!mt-[60px] overflow-hidden p-0">
      {/* Accordion trigger — first row inside the Card, so the collapsed
          panel still reads as one bordered block, just short. Closed by
          default; per-session only (plain useState, no persistence). Styled
          as a `.control-tile` bar, same flat-bevel control face as the
          device switcher, rather than `.glass` (reserved for panel faces). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="control-tile focus-ring flex w-full items-center justify-between px-6 py-4"
      >
        <span className="flex items-center gap-3 font-sans text-sm font-semibold uppercase tracking-wide text-[hsl(var(--faceplate)/0.7)]">
          <span className="flex items-center gap-2">
            <span style={ICON_SHADOW}>
              <Radio className="size-4" />
            </span>
            Source
          </span>
          <span className="text-[hsl(var(--faceplate)/0.3)]">|</span>
          <span className="flex items-center gap-2">
            <span style={ICON_SHADOW}>
              <Speaker className="size-4" />
            </span>
            Output
          </span>
          <span className="text-[hsl(var(--faceplate)/0.3)]">|</span>
          <span className="flex items-center gap-2">
            <span style={ICON_SHADOW}>
              <SettingsIcon className="size-4" />
            </span>
            Device
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[hsl(var(--faceplate)/0.6)] transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      {/* CSS grid-rows accordion trick: animating 0fr → 1fr on the row track
          animates height without a JS measurement step. Inner div needs its
          own overflow-hidden — the grid row can be a fraction of a row that's
          taller than 0, so content has to be clipped independently. */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 300ms ease",
        }}
      >
        <div className="overflow-hidden">
          <Seam />
          <div className="flex items-stretch">
            {hasLeft && (
              <div className="flex min-w-0 flex-1 flex-col">
                {hasSource && (
                  <Row
                    icon={<Radio className="size-4" />}
                    title="Source"
                    options={sourceOptions}
                    currentId={currentSourceValue}
                    busyId={busySource}
                    onSelect={selectSource}
                  />
                )}

                {hasSource && hasOutput && <Seam />}

                {hasOutput && (
                  <Row
                    icon={<Speaker className="size-4" />}
                    title="Output"
                    options={outputOptions}
                    currentId={currentOutputId}
                    busyId={busyOutput}
                    onSelect={selectOutput}
                  />
                )}
              </div>
            )}

            {hasLeft && hasDevice && <VSeam />}

            {hasDevice && (
              <div className="w-[600px] shrink-0">
                <DeviceSection
                  deviceId={deviceId}
                  devices={devices}
                  selectedId={selectedId}
                  onSelect={onSelectDevice}
                  online={online}
                  info={info}
                  usbDac={usbDac}
                  onChanged={onChanged}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** One labelled row: label ABOVE, then a left-aligned run of fixed-width
 *  keycaps beneath it (mockup: SOURCE/OUTPUT label sits over its buttons). */
function Row({
  icon,
  title,
  options,
  currentId,
  busyId,
  onSelect,
}: {
  icon: ReactNode;
  title: string;
  options: RowOption[];
  currentId: string | null;
  busyId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative z-10 flex flex-col gap-4 px-6 py-6">
      {/* label block, above the keycap run */}
      <div className="flex items-center gap-2 text-[hsl(var(--faceplate)/0.7)]">
        <span className="shrink-0" style={ICON_SHADOW}>
          {icon}
        </span>
        <span className="font-sans text-sm font-semibold uppercase tracking-wide">{title}</span>
      </div>

      {/* keycap run — fixed-width buttons, left-aligned, wrapping only if a
          device has more options than fit on one line. */}
      <div className="flex flex-wrap gap-x-5 gap-y-4">
        {options.map((o) => (
          <KeycapButton
            key={o.id}
            icon={o.icon}
            label={o.label}
            active={o.id === currentId}
            busy={o.id === busyId}
            onClick={() => onSelect(o.id)}
            className={KEYCAP_WIDTH}
          />
        ))}
      </div>
    </div>
  );
}

/** Engraved seam — same recipe as the now-playing card's transport divider:
 *  a near-black groove with a faint highlight directly beneath it, full-bleed
 *  horizontally, used between the SOURCE and OUTPUT rows. */
function Seam() {
  return (
    <div
      aria-hidden
      className="relative z-10 h-px shrink-0"
      style={{
        background: "hsl(0 0% 0% / 0.55)",
        boxShadow: "0 1px 0 0 hsl(var(--faceplate) / 0.04)",
      }}
    />
  );
}

/** Same engraved-groove recipe as Seam, rotated: a vertical full-bleed divider
 *  between the SOURCE/OUTPUT half and the DEVICE column. */
function VSeam() {
  return (
    <div
      aria-hidden
      className="relative z-10 w-px shrink-0"
      style={{
        background: "hsl(0 0% 0% / 0.55)",
        boxShadow: "1px 0 0 0 hsl(var(--faceplate) / 0.04)",
      }}
    />
  );
}

/**
 * DEVICE column: header, device switcher, Add Device / Settings / Logout,
 * a multiroom subsection (solo/slave/master — hidden below 2 devices), then
 * a Model/Firmware/IP/Wi-Fi (or Ethernet)/USB-DAC info list — absorbing
 * app-header.tsx + device-info-card.tsx + multiroom-card.tsx, restyled to the
 * panel's faceplate palette instead of the app's default theme tokens.
 */
function DeviceSection({
  deviceId,
  devices,
  selectedId,
  onSelect,
  online,
  info,
  usbDac,
  onChanged,
}: {
  deviceId: string;
  devices: DeviceListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  online: boolean;
  info: DeviceInfo | null;
  usbDac?: string | null;
  onChanged: () => void;
}) {
  const selected = devices.find((d) => d.id === selectedId) ?? null;
  const wired = info?.network === "ethernet";

  async function logout() {
    try {
      await apiSend("/api/auth/logout", "POST");
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="flex flex-col px-16 py-6">
      {/* header — same icon+label typographic recipe as the SOURCE/OUTPUT
          row labels, but as a standalone header line rather than a
          left-margin block, per the mockup. */}
      <div className="mb-4 flex items-center gap-2 text-[hsl(var(--faceplate)/0.7)]">
        <span className="shrink-0" style={ICON_SHADOW}>
          <SettingsIcon className="size-4" />
        </span>
        <span className="font-sans text-sm font-semibold uppercase tracking-wide">Device</span>
      </div>

      {/* device switcher — a split control: name trigger + chevron. Each
          compartment is a RAISED `.glass` surface (borrowing the card bevel)
          rather than a flat inset trough (Pass 3), matching the mockup's
          dimensionality. No online/offline dot (Pass 2: Greg dropped it) —
          the device name just dims slightly when offline instead. */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="focus-ring flex items-stretch gap-2 text-left">
            <span className="control-tile flex min-w-0 flex-1 items-center px-4 py-3">
              <span
                className={cn(
                  "truncate font-sans text-base font-medium transition-opacity",
                  online ? "text-[hsl(var(--faceplate))]" : "text-[hsl(var(--faceplate)/0.5)]",
                )}
              >
                {selected?.name ?? "Select device"}
              </span>
            </span>
            <span className="control-tile flex shrink-0 items-center px-4">
              <ChevronDown className="size-4 text-[hsl(var(--faceplate)/0.6)]" />
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="glass z-50 min-w-[280px] rounded-lg p-1.5 shadow-2xl"
          >
            {devices.map((d) => (
              <DropdownMenu.Item
                key={d.id}
                onSelect={() => onSelect(d.id)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm outline-none transition data-[highlighted]:bg-white/8"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-[hsl(var(--faceplate))]">{d.name}</span>
                  <span className="text-xs text-[hsl(var(--faceplate)/0.5)]">
                    {d.info?.model ?? d.host}
                  </span>
                </span>
                {d.id === selectedId && <Check className="size-4 text-[hsl(var(--primary))]" />}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* action row — Add Device / Settings / Logout, replacing the header's
          icon-button trio. Each is a raised `.glass` tile (Pass 3). Title
          case (not uppercase) per the mockup. */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <DeviceAction href="/devices" icon={<Plus className="size-5" />} label="Add Device" />
        <DeviceAction href="/settings" icon={<SettingsIcon className="size-5" />} label="Settings" />
        <DeviceAction onClick={logout} icon={<LogOut className="size-5" />} label="Logout" />
      </div>

      {info && devices.length >= 2 && (
        <>
          <ColumnDivider />
          <MultiroomSection
            deviceId={deviceId}
            devices={devices}
            role={info.multiroomRole}
            masterIp={info.multiroomMasterIp}
            slaves={info.multiroomSlaves}
            onChanged={onChanged}
          />
        </>
      )}

      {info && (
        <>
          <ColumnDivider />
          <div className="divide-y divide-[hsl(0_0%_0%/0.4)]">
            <InfoRow icon={<Tag className="size-4" />} label="Model" value={info.model || "—"} />
            <InfoRow icon={<Cpu className="size-4" />} label="Firmware" value={info.firmware || "—"} />
            <InfoRow icon={<Globe className="size-4" />} label="IP" value={info.ip || "—"} />
            <InfoRow
              icon={wired ? <Cable className="size-4" /> : <Wifi className="size-4" />}
              label={wired ? "Connection" : "Wi-Fi Signal"}
              value={
                wired ? (
                  "Ethernet"
                ) : info.rssi != null ? (
                  <span className="inline-flex items-center gap-2">
                    <SignalBars rssi={info.rssi} />
                    <span className="tabular-nums">{info.rssi} dBm</span>
                  </span>
                ) : info.internet ? (
                  "Online"
                ) : (
                  "—"
                )
              }
            />
            {usbDac && <InfoRow icon={<Cable className="size-4" />} label="USB DAC" value={usbDac} />}
          </div>
        </>
      )}
    </div>
  );
}

/** One Add Device / Settings / Logout action — a raised `.glass` tile, icon
 *  above label, either a nav link (href) or a click handler (onClick). Title
 *  case, not uppercase — matches the mockup. */
function DeviceAction({
  href,
  onClick,
  icon,
  label,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
}) {
  const className =
    "control-tile focus-ring flex flex-col items-center justify-center gap-2 px-2 py-4 text-[hsl(var(--faceplate)/0.6)] transition-colors hover:text-[hsl(var(--faceplate)/0.9)]";
  const inner = (
    <>
      <span style={ICON_SHADOW}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/** One Model/Firmware/IP/Wi-Fi info line — icon+label left, value right. */
function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="flex shrink-0 items-center gap-2 text-[hsl(var(--faceplate)/0.55)]">
        <span style={ICON_SHADOW}>{icon}</span>
        {label}
      </span>
      <span className="truncate text-right font-medium text-[hsl(var(--faceplate)/0.9)]">{value}</span>
    </div>
  );
}

/** Wi-Fi strength bars from an RSSI value (dBm) — same thresholds as the old
 *  device-info-card.tsx, recolored to the faceplate palette. */
function SignalBars({ rssi }: { rssi: number }) {
  const level = rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -72 ? 2 : rssi >= -82 ? 1 : 0;
  return (
    <span className="inline-flex items-end gap-[2px] align-middle" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-sm",
            i < level ? "bg-[hsl(var(--faceplate))]" : "bg-[hsl(var(--faceplate)/0.25)]",
          )}
          style={{ height: `${5 + i * 3}px` }}
        />
      ))}
    </span>
  );
}

/** Horizontal engraved divider, scoped to the DEVICE column's width — same
 *  recipe used both above and below the multiroom subsection. */
function ColumnDivider() {
  return (
    <div
      aria-hidden
      className="mt-5 h-px shrink-0"
      style={{
        background: "hsl(0 0% 0% / 0.55)",
        boxShadow: "0 1px 0 0 hsl(var(--faceplate) / 0.04)",
      }}
    />
  );
}

/** Resolve a LAN IP to a friendly device name from the devices list. */
function resolveMultiroomName(ip: string | null, devices: DeviceListItem[]): string {
  if (!ip) return "Unknown";
  const match = devices.find((d) => d.info?.ip === ip || d.host === ip);
  return match?.name ?? ip;
}

/**
 * Multiroom subsection (absorbed from multiroom-card.tsx, 2026-07-13) — no
 * dedicated header, since this is a Device subsection rather than a new
 * top-level section like Source/Output. Renders solo/slave/master content
 * depending on this device's current role; caller already gates on
 * `devices.length >= 2`.
 */
function MultiroomSection({
  deviceId,
  devices,
  role,
  masterIp,
  slaves,
  onChanged,
}: {
  deviceId: string;
  devices: DeviceListItem[];
  role: "solo" | "master" | "slave";
  masterIp: string | null;
  slaves: { ip: string; uuid: string; volume: number; mute: boolean }[];
  onChanged: () => void;
}) {
  return (
    <div className="py-4">
      {role === "solo" && (
        <MultiroomSolo deviceId={deviceId} devices={devices} onChanged={onChanged} />
      )}
      {role === "slave" && (
        <MultiroomSlave
          deviceId={deviceId}
          masterIp={masterIp}
          devices={devices}
          onChanged={onChanged}
        />
      )}
      {role === "master" && (
        <MultiroomMaster
          deviceId={deviceId}
          slaves={slaves}
          devices={devices}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function MultiroomSolo({
  deviceId,
  devices,
  onChanged,
}: {
  deviceId: string;
  devices: DeviceListItem[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const others = devices.filter((d) => d.id !== deviceId);

  async function join(masterDeviceId: string) {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "join",
        masterDeviceId,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't join group", "error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[hsl(var(--faceplate)/0.55)]">Standalone</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="control-tile focus-ring rounded-md px-3 py-1.5 text-xs font-medium text-[hsl(var(--faceplate)/0.85)]"
          >
            Join group…
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="glass z-50 min-w-40 rounded-lg p-1.5 shadow-2xl"
          >
            <DropdownMenu.Label className="px-3 py-1.5 text-xs text-[hsl(var(--faceplate)/0.5)]">
              Follow…
            </DropdownMenu.Label>
            {others.map((d) => (
              <DropdownMenu.Item
                key={d.id}
                onSelect={() => void join(d.id)}
                className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-[hsl(var(--faceplate)/0.9)] outline-none transition data-[highlighted]:bg-white/8"
              >
                {d.name}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function MultiroomSlave({
  deviceId,
  masterIp,
  devices,
  onChanged,
}: {
  deviceId: string;
  masterIp: string | null;
  devices: DeviceListItem[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const masterName = resolveMultiroomName(masterIp, devices);

  async function leave() {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", { action: "leave" });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't leave group", "error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-[hsl(var(--faceplate)/0.55)]">
        Following:
        <span className="font-medium text-[hsl(var(--faceplate)/0.9)]">{masterName}</span>
      </span>
      <button
        type="button"
        onClick={() => void leave()}
        className="focus-ring text-xs font-medium text-[hsl(var(--primary))] transition hover:text-[hsl(var(--primary)/0.8)]"
      >
        Leave
      </button>
    </div>
  );
}

function MultiroomMaster({
  deviceId,
  slaves,
  devices,
  onChanged,
}: {
  deviceId: string;
  slaves: { ip: string; uuid: string; volume: number; mute: boolean }[];
  devices: DeviceListItem[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [volume, setVolume] = useState(slaves[0]?.volume ?? 50);
  const [muted, setMuted] = useState(slaves[0]?.mute ?? false);
  const [draggingVol, setDraggingVol] = useState(false);

  // Sync from the group's actual reported state (getSlaveList) unless the
  // user is mid-drag — otherwise a page reload always showed 50 regardless
  // of the real volume, since local state had no live source before this.
  useEffect(() => {
    if (draggingVol || !slaves[0]) return;
    setVolume(slaves[0].volume);
    setMuted(slaves[0].mute);
  }, [slaves, draggingVol]);

  async function kick(slaveIp: string) {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", { action: "kick", slaveIp });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't kick slave", "error");
    }
  }

  async function commitVolume(v: number) {
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "groupVolume",
        value: v,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't set group volume", "error");
    }
  }

  async function commitMute(next: boolean) {
    setMuted(next);
    try {
      await apiSend(`/api/devices/${deviceId}/multiroom`, "POST", {
        action: "groupMute",
        muted: next,
      });
      onChanged();
    } catch (e) {
      toast((e as ApiError).message || "Couldn't set group mute", "error");
      setMuted(!next);
    }
  }

  return (
    <div className="space-y-3">
      {slaves.length === 0 && (
        <p className="text-sm text-[hsl(var(--faceplate)/0.5)]">No slaves connected.</p>
      )}
      {slaves.map((s) => (
        <div key={s.ip || s.uuid} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-[hsl(var(--faceplate)/0.55)]">
            Connected:
            <span className="truncate font-medium text-[hsl(var(--faceplate)/0.9)]">
              {resolveMultiroomName(s.ip, devices)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void kick(s.ip)}
            className="focus-ring shrink-0 text-xs font-medium text-[hsl(var(--primary))] transition hover:text-[hsl(var(--primary)/0.8)]"
          >
            Kick
          </button>
        </div>
      ))}

      {/* Combined mute + volume row — mirrors the now-playing card's
          transport-row layout (icon-button | slider | numeric value), with
          the reduced (1.5rem) power-graphic button standing in for the
          lucide mute icon there. Labeled (unlike the now-playing icon
          button) since this one has no surrounding transport row for
          context, and separated from the slider by a short vertical seam.
          mt-8 (2rem) rather than the space-y-3 (0.75rem) the slave rows
          above use — needs the `!` to win over that space-y utility. */}
      <div className="!mt-8 flex items-center gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-[hsl(var(--faceplate)/0.5)]">
            Mute
          </span>
          <MultiroomMuteButton muted={muted} onToggle={() => void commitMute(!muted)} />
        </div>
        <div
          aria-hidden
          className="h-8 w-px shrink-0"
          style={{
            background: "hsl(0 0% 0% / 0.55)",
            boxShadow: "1px 0 0 0 hsl(var(--faceplate) / 0.04)",
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-3">
            <Slider
              value={volume}
              min={0}
              max={100}
              variant="volume"
              onChange={(v) => {
                setDraggingVol(true);
                setVolume(v);
              }}
              onCommit={(v) => {
                setDraggingVol(false);
                void commitVolume(v);
              }}
              aria-label="Group volume"
              className="min-w-0 flex-1"
            />
            <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-[hsl(var(--faceplate)/0.6)]">
              {muted ? "—" : volume}
            </span>
          </div>
          <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-[hsl(var(--faceplate)/0.5)]">
            Group Volume
          </span>
        </div>
      </div>
    </div>
  );
}

/** Group-mute toggle — same power-btn.png/power-off-overlay.png recipe as
 *  sub-card.tsx's PowerKnob, at a reduced 1.5rem (size-6) instead of 2.75rem,
 *  and driven by mute state instead of enable state: muted shows the
 *  off-overlay (matches PowerKnob's off-look), unmuted shows the plain
 *  power-on graphic. */
function MultiroomMuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? "Unmute group" : "Mute group"}
      className="focus-ring relative block size-6 shrink-0 rounded-full"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/power-btn.png" alt="" draggable={false} className="size-full select-none" />
      {muted && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/power-off-overlay.png"
          alt=""
          draggable={false}
          className="absolute inset-0 size-full select-none"
        />
      )}
    </button>
  );
}
