"use client";

import Link from "next/link";
import { Card, CardContent } from "@dentalos/ui";
import { CalendarPlus, CalendarCheck } from "lucide-react";
import { formatDateTime } from "@dentalos/core";
import type { HomeData } from "./types";

/** Gradient "next visit" hero, shared by the hub + timeline layouts. */
export function Hero({ data }: { data: HomeData }) {
  return (
    <Card className="relative mb-4 overflow-hidden border-0 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/5" />
      <CardContent className="relative pt-5">
        <div className="mb-1 flex items-center gap-2 text-sm opacity-90">
          <CalendarCheck className="h-4 w-4" /> Next visit
        </div>
        {data.next ? (
          <>
            <div className="text-lg font-bold">{formatDateTime(new Date(data.next.startAt), data.timezone)}</div>
            <div className="text-sm opacity-90">
              {data.next.typeName} · {data.next.providerName}
            </div>
          </>
        ) : (
          <>
            <div className="text-base font-semibold">No upcoming visits yet</div>
            <Link
              href="/book"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
            >
              <CalendarPlus className="h-4 w-4" /> Book an appointment
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex flex-col items-center gap-2 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            {icon}
          </span>
          <span className="text-sm font-semibold">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon} {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm">{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">{children}</p>;
}
