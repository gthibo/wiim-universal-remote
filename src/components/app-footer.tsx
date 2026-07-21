import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION, RELEASE_URL, UPSTREAM_URL } from "@/lib/version";

/**
 * Subtle credit footer shown across the app. Was "Vibe coding by illiano"
 * linking to illianoaoi/Wiim-Dashboard — that's upstream, not this fork, so
 * the version link 404'd (this fork's version tags don't exist over there).
 * Now credits illiano as the origin while the version link points at this
 * fork's own release.
 */
export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex items-center justify-center gap-1.5 py-6 text-center text-xs text-muted-foreground/60",
        className,
      )}
    >
      <Sparkles className="size-3.5 text-primary/60" />
      <span>
        Forked from{" "}
        <a
          href={UPSTREAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          illiano&apos;s WiiM Dashboard
        </a>
        <span className="px-1 text-muted-foreground/40">·</span>
        <a
          href={RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium tabular-nums transition-colors hover:text-foreground"
        >
          v{APP_VERSION}
        </a>
      </span>
    </footer>
  );
}
