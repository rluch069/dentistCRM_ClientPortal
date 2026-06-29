"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dentalos/ui";
import { LayoutDashboard, Users, Stethoscope, Receipt, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Schedule", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/billing/reconciliation", label: "Billing", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 flex-col border-r border-border/60 bg-card">
      <div className="flex h-14 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="truncate">
          <div className="truncate text-sm font-bold leading-tight">{clinicName}</div>
          <div className="text-[11px] font-medium text-muted-foreground">DentalOS</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Menu</p>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
              <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 px-4 py-3">
        <p className="text-[10px] font-medium text-muted-foreground">DentalOS · Mauritius 🇲🇺</p>
      </div>
    </aside>
  );
}
