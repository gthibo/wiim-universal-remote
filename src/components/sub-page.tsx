import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppFooter } from "@/components/app-footer";

export function SubPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link
            href="/"
            aria-label="Back"
            className="focus-ring grid size-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <AppFooter />
    </>
  );
}
