"use client";

import Link from "next/link";
import { Badge, Button } from "@dentalos/ui";
import { CalendarPlus, Wallet, FileText } from "lucide-react";
import { formatDateTime } from "@dentalos/core";
import { Hero } from "./shared";
import type { HomeData } from "./types";

/** V2 — timeline-first: hero + compact action row + a single chronological visit timeline. */
export function HomeTimeline({ data }: { data: HomeData }) {
  const items = [
    ...data.upcoming.map((a) => ({ ...a, upcoming: true })),
    ...data.past.slice(0, 8).map((a) => ({ ...a, upcoming: false })),
  ];

  return (
    <div className="space-y-4">
      <Hero data={data} />

      <div className="grid grid-cols-3 gap-2">
        <Link href="/book">
          <Button variant="outline" className="w-full"><CalendarPlus className="h-4 w-4" /> Book</Button>
        </Link>
        <Link href="/records">
          <Button variant="outline" className="w-full"><FileText className="h-4 w-4" /> Records</Button>
        </Link>
        <Link href="/pay">
          <Button variant="outline" className="w-full"><Wallet className="h-4 w-4" /> Pay</Button>
        </Link>
      </div>

      <div className="relative ml-2 border-l border-border pl-5">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No visits yet.</p>}
        {items.map((a) => (
          <div key={a.id} className="relative mb-4 last:mb-0">
            <span
              className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-background ${a.upcoming ? "bg-primary" : "bg-muted-foreground/40"}`}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{a.typeName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatDateTime(new Date(a.startAt), data.timezone)} · {a.providerName}
                </div>
              </div>
              <Badge variant={a.upcoming ? "secondary" : "outline"}>{a.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
