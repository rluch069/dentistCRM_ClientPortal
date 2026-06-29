"use client";

import Link from "next/link";
import { Card, CardContent, Badge } from "@dentalos/ui";
import { CalendarPlus, Clock, Wallet, Bell, CalendarCheck, FileText, ClipboardList } from "lucide-react";
import { formatMoney, formatDateTime } from "@dentalos/core";
import { Hero, QuickAction, Section, Row, Empty } from "./shared";
import type { HomeData } from "./types";

/** V1 — the action hub: hero + 2×2 quick actions + upcoming / notifications / past. */
export function HomeHub({ data }: { data: HomeData }) {
  return (
    <div>
      <Hero data={data} />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <QuickAction href="/book" icon={<CalendarPlus className="h-5 w-5" />} label="Book now" />
        <QuickAction href="/records" icon={<FileText className="h-5 w-5" />} label="My records" />
        <QuickAction href="/intake" icon={<ClipboardList className="h-5 w-5" />} label="Forms" />
        <Link href="/pay" className="group">
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardContent className="flex flex-col items-center gap-2 py-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Wallet className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold">{formatMoney(data.balanceCents)}</span>
              <span className="text-[11px] text-muted-foreground">{data.balanceCents > 0 ? "Pay now" : "Balance"}</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Section title="Upcoming" icon={<Clock className="h-4 w-4" />}>
        {data.upcoming.length === 0 && <Empty>No upcoming appointments.</Empty>}
        {data.upcoming.map((a) => (
          <Row key={a.id}>
            <div>
              <div className="font-medium">{a.typeName}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(new Date(a.startAt), data.timezone)} · {a.providerName}
              </div>
            </div>
            <Badge variant="secondary">{a.status}</Badge>
          </Row>
        ))}
      </Section>

      {data.notifications.length > 0 && (
        <Section title="Notifications" icon={<Bell className="h-4 w-4" />}>
          {data.notifications.map((n) => (
            <Row key={n.id}>
              <div className="min-w-0">
                <div className="truncate font-medium">{n.subject}</div>
                <div className="truncate text-xs text-muted-foreground">{n.body}</div>
              </div>
            </Row>
          ))}
        </Section>
      )}

      <Section title="Past visits" icon={<CalendarCheck className="h-4 w-4" />}>
        {data.past.length === 0 && <Empty>No past visits yet.</Empty>}
        {data.past.slice(0, 10).map((a) => (
          <Row key={a.id}>
            <div>
              <div className="font-medium">{a.typeName}</div>
              <div className="text-xs text-muted-foreground">{formatDateTime(new Date(a.startAt), data.timezone)}</div>
            </div>
            <Badge variant="outline">{a.status}</Badge>
          </Row>
        ))}
      </Section>
    </div>
  );
}
