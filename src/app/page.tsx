import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyUser } from "@/lib/db/users";
import { listDevices } from "@/lib/db/devices";
import { getSourceLabels } from "@/lib/db/settings";
import { Dashboard } from "@/components/dashboard/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!hasAnyUser()) redirect("/setup");
  if (!(await getCurrentUser())) redirect("/login");

  const devices = listDevices().map((d) => ({
    id: d.id,
    name: d.name,
    host: d.host,
    port: d.port,
    capabilities: d.capabilities,
    info: d.info,
    sortOrder: d.sortOrder,
    sourceLabels: getSourceLabels(d.id),
  }));

  return <Dashboard initialDevices={devices} />;
}
