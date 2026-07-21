import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/db/users";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupForm } from "@/components/auth/setup-form";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (hasAnyUser()) redirect("/login");
  return (
    <AuthShell>
      <SetupForm />
    </AuthShell>
  );
}
