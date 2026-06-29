"use client";

import * as React from "react";
import { Card, CardContent, cn } from "@dentalos/ui";
import { formatMoney } from "@dentalos/core";
import { TrendingUp, Wallet, AlertCircle } from "lucide-react";
import type { ReportsData } from "./types";

/** V2 — a big-number executive snapshot with a sparkline + plain-language summary. */
export function ReportsExecutive({ data }: { data: ReportsData }) {
  const { summary, daily } = data;
  const collectionRate = summary.productionCents > 0 ? Math.round((summary.collectionsCents / summary.productionCents) * 100) : 0;
  const max = Math.max(1, ...daily.map((d) => d.productionCents));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <BigStat icon={<TrendingUp className="h-5 w-5" />} label="Production" value={formatMoney(summary.productionCents)} sub={`${summary.appointments.completed} completed visits`} accent="text-primary" />
        <BigStat icon={<Wallet className="h-5 w-5" />} label="Collections" value={formatMoney(summary.collectionsCents)} sub={`${collectionRate}% of production`} accent="text-success" />
        <BigStat icon={<AlertCircle className="h-5 w-5" />} label="Outstanding" value={formatMoney(summary.outstandingCents)} sub="across all patients" accent="text-warning" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-2 text-sm font-semibold">Production trend</div>
          <div className="flex items-end gap-0.5" style={{ height: 80 }}>
            {daily.map((d) => (
              <div key={d.date} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(d.productionCents / max) * 80}px` }} title={`${d.date}: ${formatMoney(d.productionCents)}`} />
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Over <b className="text-foreground">{data.from}</b> → <b className="text-foreground">{data.to}</b>, you produced{" "}
            <b className="text-foreground">{formatMoney(summary.productionCents)}</b> and collected{" "}
            <b className="text-foreground">{formatMoney(summary.collectionsCents)}</b>. {summary.newPatients} new patient
            {summary.newPatients === 1 ? "" : "s"} joined and {summary.recallDue} {summary.recallDue === 1 ? "is" : "are"} due for recall. No-show
            rate was {(summary.noShowRate * 100).toFixed(1)}%.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function BigStat({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className={cn("mb-2 flex items-center gap-2 text-sm font-medium", accent)}>
          {icon} {label}
        </div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
