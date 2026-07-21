"use client";

import { Cpu, Wifi, Cable, Globe, Tag, Usb } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeviceInfo } from "@/lib/wiim/types";

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

/** Wi-Fi strength bars from an RSSI value (dBm). */
function SignalBars({ rssi }: { rssi: number }) {
  const level = rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -72 ? 2 : rssi >= -82 ? 1 : 0;
  return (
    <span className="inline-flex items-end gap-[2px] align-middle" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("w-1 rounded-sm", i < level ? "bg-foreground" : "bg-muted-foreground/25")}
          style={{ height: `${5 + i * 3}px` }}
        />
      ))}
    </span>
  );
}

export function DeviceInfoCard({ info, usbDac }: { info: DeviceInfo; usbDac?: string | null }) {
  const wired = info.network === "ethernet";
  return (
    <Card className="pb-5">
      <CardHeader icon={<Cpu className="size-4" />} title="Device" />
      <div className="divide-y divide-border/60 px-5 pt-2">
        <Row icon={<Tag className="size-4" />} label="Model" value={info.model || "—"} />
        <Row icon={<Cpu className="size-4" />} label="Firmware" value={info.firmware || "—"} />
        <Row icon={<Globe className="size-4" />} label="IP" value={info.ip || "—"} />
        <Row
          icon={wired ? <Cable className="size-4" /> : <Wifi className="size-4" />}
          label={wired ? "Connection" : "Wi-Fi signal"}
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
        {usbDac && <Row icon={<Usb className="size-4" />} label="USB DAC" value={usbDac} />}
      </div>
    </Card>
  );
}
