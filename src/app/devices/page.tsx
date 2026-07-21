import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listDevices } from "@/lib/db/devices";
import { SubPage } from "@/components/sub-page";
import { DeviceManager } from "@/components/devices/device-manager";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const devices = listDevices().map((d) => ({
    id: d.id,
    name: d.name,
    host: d.host,
    port: d.port,
    capabilities: d.capabilities,
    info: d.info,
    sortOrder: d.sortOrder,
  }));
  return (
    <SubPage title="Devices">
      <DeviceManager initialDevices={devices} />
    </SubPage>
  );
}
