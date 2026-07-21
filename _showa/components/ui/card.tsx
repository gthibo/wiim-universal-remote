import { cn } from "@/lib/utils";

/**
 * SHOWA RE-SKIN: hardware panels are rectilinear by default (per the locked
 * design language) — the original `rounded-3xl` bypassed the --radius token
 * entirely with a literal Tailwind class, so the card kept showing heavily
 * rounded corners in the first preview even though globals.css set
 * --radius: 0.125rem. Switched to `rounded-lg`, which Tailwind resolves to
 * `var(--radius)` (see tailwind.config.ts borderRadius.lg) — so this now
 * actually tracks the token instead of silently overriding it.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-lg", className)} {...props} />;
}

export function CardHeader({
  icon,
  title,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}
