"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dentalos/ui";

export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/patients/${patientId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/chart`, label: "Chart" },
    { href: `${base}/perio`, label: "Perio" },
    { href: `${base}/treatment`, label: "Treatment" },
    { href: `${base}/notes`, label: "Notes" },
    { href: `${base}/rx`, label: "Prescriptions" },
    { href: `${base}/billing`, label: "Billing" },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border/60">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative -mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
