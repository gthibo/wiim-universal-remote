import "server-only";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Wiim Dashboard";

// Allow ±1 time-step (30s) of clock drift.
authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpKeyUri(username: string, secret: string): string {
  return authenticator.keyuri(username, ISSUER, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  const t = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(t)) return false;
  try {
    return authenticator.verify({ token: t, secret });
  } catch {
    return false;
  }
}

export async function totpQrDataUrl(username: string, secret: string): Promise<string> {
  return QRCode.toDataURL(totpKeyUri(username, secret), {
    margin: 1,
    width: 220,
    color: { dark: "#0a0a12", light: "#ffffff" },
  });
}
