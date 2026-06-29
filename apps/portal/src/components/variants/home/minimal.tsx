"use client";

import Link from "next/link";
import { Card, CardContent, Button } from "@dentalos/ui";
import { CalendarPlus, CalendarCheck, Wallet } from "lucide-react";
import { formatMoney, formatDateTime } from "@dentalos/core";
import type { HomeData } from "./types";

/** V3 — minimal: a big next-visit card + two primary actions. Low cognitive load. */
export function HomeMinimal({ data }: { data: HomeData }) {
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <CardContent className="relative py-8 text-center">
          <div className="mb-1 flex items-center justify-center gap-2 text-sm opacity-90">
            <CalendarCheck className="h-4 w-4" /> Next visit
          </div>
          {data.next ? (
            <>
              <div className="text-2xl font-bold">{formatDateTime(new Date(data.next.startAt), data.timezone)}</div>
              <div className="text-sm opacity-90">
                {data.next.typeName} · {data.next.providerName}
              </div>
            </>
          ) : (
            <div className="text-lg font-semibold">No upcoming visits</div>
          )}
        </CardContent>
      </Card>

      <Link href="/book" className="block">
        <Button size="lg" className="w-full">
          <CalendarPlus className="h-5 w-5" /> Book an appointment
        </Button>
      </Link>
      <Link href="/pay" className="block">
        <Button size="lg" variant={data.balanceCents > 0 ? "default" : "outline"} className="w-full">
          <Wallet className="h-5 w-5" /> {data.balanceCents > 0 ? `Pay ${formatMoney(data.balanceCents)}` : "No balance due"}
        </Button>
      </Link>

      <div className="flex justify-center gap-5 pt-1 text-sm">
        <Link href="/records" className="text-muted-foreground hover:text-foreground">My records</Link>
        <Link href="/intake" className="text-muted-foreground hover:text-foreground">Forms</Link>
      </div>
    </div>
  );
}
