"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Disc3, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiSend, ApiError } from "@/lib/client/api";

export function SetupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiSend("/api/auth/setup", "POST", { username, password });
      window.location.assign("/");
    } catch (err) {
      setError((err as ApiError).message || "Setup failed.");
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
        <h1 className="text-xl font-semibold">Welcome to Wiim Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your admin account to get started</p>
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
            minLength={3}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint="At least 10 characters with upper/lower case and a number."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : <UserPlus className="size-5" />}
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
    </motion.div>
  );
}
