import * as React from "react";
import { cn } from "../lib/cn";

/** Dashed "Explore the demo" box shown under sign-in forms. Hidden when NEXT_PUBLIC_DEV_MODE=false. */
export function DemoPanel({ footnote, children, className }: { footnote?: React.ReactNode; children: React.ReactNode; className?: string }) {
  if (process.env.NEXT_PUBLIC_DEV_MODE === "false") return null;
  return (
    <div className={cn("rounded-xl border border-dashed border-border bg-secondary/50 p-4", className)}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Explore the demo — one click signs you in</p>
      <div className="flex flex-wrap gap-2">{children}</div>
      {footnote && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{footnote}</p>}
    </div>
  );
}

/** Classes for a DemoPanel entry — works on a submit <button> or an <a>. */
export const demoButtonClass =
  "inline-flex h-9 items-center rounded-lg border border-border/70 bg-card px-3.5 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50";
