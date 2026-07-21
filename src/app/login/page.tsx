import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyUser } from "@/lib/db/users";
import { getPublicTurnstile } from "@/lib/auth/turnstile";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!hasAnyUser()) redirect("/setup");
  if (await getCurrentUser()) redirect("/");
  const turnstile = getPublicTurnstile();
  return (
    <AuthShell>
      <LoginForm turnstile={turnstile} />
    </AuthShell>
  );
}
