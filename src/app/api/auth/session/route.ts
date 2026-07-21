import { json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicTurnstile } from "@/lib/auth/turnstile";
import { hasAnyUser } from "@/lib/db/users";

export const dynamic = "force-dynamic";

/** Bootstrap info for the client: who am I, do we need setup, Turnstile key. */
export async function GET() {
  const user = await getCurrentUser();
  return json({
    user,
    needsSetup: !hasAnyUser(),
    turnstile: getPublicTurnstile(),
  });
}
