import { AppFooter } from "@/components/app-footer";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col p-4">
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <AppFooter />
    </main>
  );
}
