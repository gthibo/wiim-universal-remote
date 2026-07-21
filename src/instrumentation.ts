/**
 * Next.js instrumentation — runs once when the server process starts.
 * Used to kick off the background Last.fm scrobbler (Node runtime only).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info("[scrobbler] instrumentation register() (nodejs)");
    const { startScrobblePoller } = await import("./lib/scrobble/poller");
    startScrobblePoller();
  }
}
