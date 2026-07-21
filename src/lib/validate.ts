import "server-only";
import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";

/** Parse + validate a JSON request body against a Zod schema. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, res: apiError(400, "Invalid JSON body", "BAD_JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, res: apiError(400, msg || "Validation failed", "VALIDATION") };
  }
  return { ok: true, data: parsed.data };
}
