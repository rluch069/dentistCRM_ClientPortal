"use client";

import { Card, CardContent, Badge } from "@dentalos/ui";
import { formatMoney } from "@dentalos/core";
import type { BillingData } from "./types";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mcb_juice: "MCB Juice",
  maucas_qr: "MauCAS QR",
  myt_money: "my.t money",
  bank_transfer: "Bank transfer",
  other: "Other",
};

function hhmm(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** V2 — a simple cash-register day sheet: today's takings, totalled by method. */
export function DaySheet({ data }: { data: BillingData }) {
  const totalsByMethod: Record<string, number> = {};
  let total = 0;
  for (const p of data.payments) {
    totalsByMethod[p.method] = (totalsByMethod[p.method] ?? 0) + p.amountCents;
    total += p.amountCents;
  }
  const methods = Object.keys(totalsByMethod);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground shadow-lg">
        <div className="text-xs font-medium uppercase tracking-wide opacity-90">Today&apos;s takings</div>
        <div className="text-3xl font-bold tracking-tight">{formatMoney(total)}</div>
        <div className="text-sm opacity-90">
          {data.payments.length} payment{data.payments.length === 1 ? "" : "s"} · {data.today}
        </div>
      </div>

      {methods.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {methods.map((m) => (
            <div key={m} className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
              <div className="text-lg font-bold tracking-tight">{formatMoney(totalsByMethod[m]!)}</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{METHOD_LABEL[m] ?? m}</div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="divide-y divide-border/60 p-0">
          {data.payments.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No payments recorded today.</p>}
          {data.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.patientName}</div>
                <div className="text-xs text-muted-foreground">{hhmm(p.createdAt, data.timezone)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{METHOD_LABEL[p.method] ?? p.method}</Badge>
                <span className="font-semibold tabular-nums">{formatMoney(p.amountCents)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
