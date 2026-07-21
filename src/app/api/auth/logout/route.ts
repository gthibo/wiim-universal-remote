import { NextResponse } from "next/server";
import { guard, json } from "@/lib/api";
import { endSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  await endSession();
  return json({ ok: true });
}
