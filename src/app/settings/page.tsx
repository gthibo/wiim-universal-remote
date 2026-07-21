import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SubPage } from "@/components/sub-page";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <SubPage title="Settings">
      <SettingsView totpEnabled={user.totpEnabled} />
    </SubPage>
  );
}
