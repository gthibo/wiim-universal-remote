"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Disc3, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TurnstileWidget } from "./turnstile-widget";
import { apiSend, ApiError } from "@/lib/client/api";

export function LoginForm({
  turnstile,
}: {
  turnstile: { enabled: boolean; siteKey: string };
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsToken = turnstile.enabled && !token;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiSend("/api/auth/login", "POST", {
        username,
        password,
        turnstileToken: token ?? undefined,
        totp: showTotp && totp ? totp : undefined,
      });
      // Only allow same-site absolute paths — reject protocol-relative (//evil)
      // and backslash tricks to prevent open redirects.
      const next = new URLSearchParams(window.location.search).get("next");
      const safe = next && /^\/(?![/\\])/.test(next) ? next : "/";
      window.location.assign(safe);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === "TOTP_REQUIRED") {
        setShowTotp(true);
        setError("Enter your two-factor code to continue.");
      } else {
        setError(e.message || "Login failed.");
      }
      // Turnstile tokens are single-use — force a fresh challenge.
      if (turnstile.enabled) {
        setToken(null);
        setResetKey((k) => k + 1);
      }
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass w-full max-w-sm rounded-3xl p-7"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
          <Disc3 className="size-7 text-white" />
        </div>
        <h1 className="text-xl font-semibold">Wiim Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to control your devices</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Username" htmlFor="username">
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {showTotp && (
          <Field label="Two-factor code" htmlFor="totp">
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </Field>
        )}

        {turnstile.enabled && (
          <TurnstileWidget siteKey={turnstile.siteKey} onToken={setToken} resetKey={resetKey} />
        )}

        {error && (
          <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || needsToken}>
          {loading ? <Spinner /> : showTotp ? <KeyRound className="size-5" /> : <ShieldCheck className="size-5" />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </motion.div>
  );
}
