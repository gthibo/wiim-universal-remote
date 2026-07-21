// Client-side fetch helpers. Reads the wiim_csrf cookie and sends it as the
// x-csrf-token header on mutations (double-submit CSRF).

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

async function parse(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const data = await parse(res);
  if (!res.ok) {
    const d = data as { error?: string; code?: string };
    throw new ApiError(d?.error || res.statusText, res.status, d?.code ?? null);
  }
  return data as T;
}

export async function apiSend<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  const csrf = readCookie("wiim_csrf");
  if (csrf) headers["x-csrf-token"] = csrf;
  if (body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await parse(res);
  if (!res.ok) {
    const d = data as { error?: string; code?: string };
    throw new ApiError(d?.error || res.statusText, res.status, d?.code ?? null);
  }
  return data as T;
}
