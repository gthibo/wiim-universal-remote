"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
interface PromptOpts {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
}

interface ModalApi {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
}

const ModalCtx = createContext<ModalApi>({
  confirm: async () => false,
  prompt: async () => null,
});

export const useConfirm = () => useContext(ModalCtx).confirm;
export const usePrompt = () => useContext(ModalCtx).prompt;

type State =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | null;

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState("");

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ kind: "confirm", opts, resolve })),
    [],
  );
  const prompt = useCallback((opts: PromptOpts) => {
    setValue(opts.defaultValue ?? "");
    return new Promise<string | null>((resolve) => setState({ kind: "prompt", opts, resolve }));
  }, []);

  useEffect(() => {
    if (state?.kind === "prompt") setValue(state.opts.defaultValue ?? "");
  }, [state]);

  function finish(result: boolean | string | null) {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(result as boolean);
    else state.resolve(result as string | null);
    setState(null);
  }

  const cancelValue = state?.kind === "prompt" ? null : false;

  return (
    <ModalCtx.Provider value={{ confirm, prompt }}>
      {children}
      <Dialog.Root open={!!state} onOpenChange={(o) => !o && finish(cancelValue)}>
        <AnimatePresence>
          {state && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                onOpenAutoFocus={(e) => {
                  if (state.kind !== "prompt") e.preventDefault();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="glass fixed left-1/2 top-1/2 z-[95] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6"
                >
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    {state.opts.title}
                  </Dialog.Title>
                  {state.opts.message && (
                    <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
                      {state.opts.message}
                    </Dialog.Description>
                  )}

                  {state.kind === "prompt" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        finish(value.trim() || null);
                      }}
                      className="mt-4"
                    >
                      <Input
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={state.opts.placeholder}
                        maxLength={64}
                      />
                    </form>
                  )}

                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => finish(cancelValue)}>
                      {state.kind === "confirm" ? state.opts.cancelText ?? "Cancel" : "Cancel"}
                    </Button>
                    <Button
                      variant={state.kind === "confirm" && state.opts.danger ? "destructive" : "primary"}
                      onClick={() =>
                        finish(state.kind === "prompt" ? value.trim() || null : true)
                      }
                    >
                      {state.opts.confirmText ?? (state.kind === "prompt" ? "Save" : "Confirm")}
                    </Button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </ModalCtx.Provider>
  );
}
