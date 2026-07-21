"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import {
  useDevices,
  useSettings,
  useSnapshot,
  type DeviceListItem,
  type CardVisibility,
} from "@/lib/client/hooks";
import { EmptyState } from "./empty-state";
import { NowPlayingCard } from "./now-playing-card";
import { SourceOutputPanel } from "./source-output-panel";
import { EqCard } from "./eq-card";
import { SubCard } from "./sub-card";
import { TempCard } from "./temp-card";
import { PresetCard } from "./preset-card";
import { LastfmStatsCard } from "./lastfm-stats-card";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AppFooter } from "@/components/app-footer";
import { SOURCES } from "@/lib/wiim/constants";

const STORAGE_KEY = "wiim:selectedDevice";

export function Dashboard({ initialDevices }: { initialDevices: DeviceListItem[] }) {
  const { devices } = useDevices(initialDevices);
  const { settings } = useSettings();
  const interval = settings?.app.pollIntervalMs ?? 3000;

  const [selectedId, setSelectedId] = useState<string | null>(initialDevices[0]?.id ?? null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && initialDevices.some((d) => d.id === saved)) setSelectedId(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (devices.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !devices.some((d) => d.id === selectedId)) {
      setSelectedId(devices[0]!.id);
    }
  }, [devices, selectedId]);

  function select(id: string) {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  const { snapshot, mutate, isLoading } = useSnapshot(selectedId, interval);
  const refresh = () => void mutate();

  // Last-tapped preset memory (radio/DLNA-name fix) — lifted here from
  // PresetCard so NowPlayingCard can also read it: the WiiM API gives no
  // durable "currently active preset" field, and for generic internet-radio
  // streams (mode 12/13) it gives no station name AT ALL — vendor is just
  // "CustomRadio", the aggregator app, not the station. The last-tapped
  // preset name is the only source of truth we have for that case, so the
  // now-playing stream-info band substitutes it in place of the generic
  // "Network" label. Same accepted limitation as before: a preset switched
  // from outside this dashboard (the WiiM app, another control point) won't
  // be reflected here.
  const [activePreset, setActivePreset] = useState<{ index: number; name: string | null } | null>(
    null,
  );
  const [activePresetSourceKey, setActivePresetSourceKey] = useState<string | null>(null);

  // Reflect the selected device's current track in the browser tab title:
  // "<Track> - <Artist> | Wiim Dashboard", falling back to the app name.
  const titlePlayer = snapshot?.id === selectedId ? snapshot?.player : null;
  useEffect(() => {
    const base = "Wiim Dashboard";
    const t = titlePlayer?.title?.trim();
    const a = titlePlayer?.artist?.trim();
    document.title =
      t && titlePlayer?.state !== "stopped"
        ? a
          ? `${t} - ${a} | ${base}`
          : `${t} | ${base}`
        : base;
  }, [titlePlayer?.title, titlePlayer?.artist, titlePlayer?.state]);

  // Clear the remembered active preset if the source changes away from
  // whatever it was when the preset was activated, or playback stops —
  // same clearing rule PresetCard used to run locally, now here since the
  // memory itself lives here.
  useEffect(() => {
    if (activePreset === null) return;
    if (titlePlayer?.state === "stopped") {
      setActivePreset(null);
      return;
    }
    if (titlePlayer?.sourceKey !== undefined && titlePlayer.sourceKey !== activePresetSourceKey) {
      setActivePreset(null);
    }
  }, [titlePlayer?.state, titlePlayer?.sourceKey, activePreset, activePresetSourceKey]);

  if (devices.length === 0) {
    return (
      <>
        <EmptyState />
        <AppFooter />
      </>
    );
  }

  const selectedDevice = devices.find((d) => d.id === selectedId) ?? null;
  const matches = snapshot?.id === selectedId;
  const snap = matches ? snapshot : null;
  const caps = snap?.capabilities ?? selectedDevice?.capabilities ?? null;
  const player = snap?.player ?? null;
  const online = snap ? snap.online : true;
  const did = selectedId!;
  const eqSource =
    player?.sourceKey === "wifi"
      ? snap?.info?.network ?? "wifi"
      : player?.sourceKey
        ? SOURCES.find((s) => s.key === player.sourceKey)?.value ?? null
        : null;
  // Card visibility (Settings). Defaults to visible while settings load.
  const vis = (k: keyof CardVisibility) => settings?.cards?.[k] ?? true;

  function handlePresetActivated(index: number, name: string | null) {
    setActivePreset({ index, name });
    setActivePresetSourceKey(player?.sourceKey ?? null);
  }
  // Only trust the remembered name when it still corresponds to the current
  // source (belt-and-suspenders alongside the clearing effect above).
  const activePresetName =
    activePreset && activePresetSourceKey === (player?.sourceKey ?? null) ? activePreset.name : null;

  return (
    <>
      {/* SHOWA RE-SKIN: widened the page shell from Tailwind's max-w-5xl
          (64rem) to a custom max-w-[78rem] per Greg's explicit request —
          78rem has no matching named Tailwind scale step, so this has to be
          an arbitrary-value class rather than a different preset name. */}
      <main className="mx-auto max-w-[78rem] px-4 py-20">
        {!snap && isLoading && (
          <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
            <Spinner className="size-7 text-primary" />
          </div>
        )}

        {snap && (
          <div className="animate-fade-in space-y-4">
            {online && vis("nowPlaying") && player && (
              <NowPlayingCard
                deviceId={did}
                player={player}
                sourceLabels={selectedDevice?.sourceLabels}
                autoSourceLabels={snap.sourceNames}
                activePresetName={activePresetName}
                canLove={!!settings?.lastfm?.connected}
                sleepExpiresAt={snap.sleepExpiresAt}
                onChanged={refresh}
              />
            )}

            {!online && (
              <Card className="flex items-center gap-3 p-5 text-sm">
                <WifiOff className="size-5 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">Device offline</p>
                  <p className="text-muted-foreground">
                    Can&apos;t reach {selectedDevice?.name} at {selectedDevice?.host}. Retrying…
                  </p>
                </div>
              </Card>
            )}

            {/* SHOWA RE-SKIN: Source + Output + Device merged into one rectilinear
                panel (keycap selectors with indicator lamps on the left, device
                switcher/add/settings/logout/info on the right), lifted OUT of
                the small-cards grid to sit directly under the now-playing card
                per the mockup. Rendered whenever the left half has something to
                show OR devices exist for the right half, and — unlike the old
                header it replaces — NOT gated on `online`: this is now the only
                place to switch away from an offline device, so it has to stay
                reachable while offline too. */}
            <SourceOutputPanel
              deviceId={did}
              sourceKeys={online && vis("source") && player ? caps?.sources ?? [] : []}
              currentSourceKey={player?.sourceKey ?? null}
              sourceLabels={selectedDevice?.sourceLabels}
              autoSourceLabels={snap.sourceNames}
              disabledSources={snap.disabledSources}
              outputIds={
                online && vis("output") && caps?.outputSwitch && snap.output ? caps?.outputs ?? [] : []
              }
              currentOutput={snap.output?.hardware ?? null}
              onChanged={refresh}
              devices={devices}
              selectedId={selectedId}
              onSelectDevice={select}
              online={online}
              info={snap.info}
              usbDac={snap.usbDac}
            />

            {online && (
              <>
                {vis("presets") && snap.presets && snap.presets.length > 0 && (
                  <PresetCard
                    deviceId={did}
                    presets={snap.presets}
                    activeIndex={activePreset?.index ?? null}
                    onActivate={handlePresetActivated}
                    onChanged={refresh}
                  />
                )}

                {/* Full per-source Graphic + Parametric EQ (self-hides if unsupported) */}
                {vis("eq") && <EqCard deviceId={did} initialSource={eqSource} />}

                {settings?.lastfm?.connected && <LastfmStatsCard />}

                <div className="grid grid-cols-1 gap-4">
                  {vis("sub") && caps?.subwoofer && snap.sub && (
                    <SubCard deviceId={did} sub={snap.sub} onChanged={refresh} />
                  )}
                  {vis("temperature") && caps?.temperature && snap.info && (
                    <TempCard cpu={snap.info.temperatureCpu} board={snap.info.temperatureBoard} />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <AppFooter />
    </>
  );
}
