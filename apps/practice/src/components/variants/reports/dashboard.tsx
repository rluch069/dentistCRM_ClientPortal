"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@dentalos/ui";
import { formatMoney } from "@dentalos/core";
import type { ReportsData } from "./types";

/** V1 — the original KPI grid + production-vs-collections bar chart. */
export function ReportsDashboard({ data }: { data: ReportsData }) {
  const { summary, daily } = data;
  const maxBar = Math.max(1, ...daily.map((d) => Math.max(d.productionCents, d.collectionsCents)));

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="Production" value={formatMoney(summary.productionCents)} />
        <Kpi label="Collections" value={formatMoney(summary.collectionsCents)} />
        <Kpi label="Outstanding" value={formatMoney(summary.outstandingCents)} />
        <Kpi label="No-show rate" value={`${(summary.noShowRate * 100).toFixed(1)}%`} />
        <Kpi label="New patients" value={String(summary.newPatients)} />
        <Kpi label="Recall due" value={String(summary.recallDue)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Production vs collections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 160 }}>
            {daily.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center justify-end gap-0.5"
                style={{ minWidth: 14 }}
                title={`${d.date}: prod ${formatMoney(d.productionCents)}, coll ${formatMoney(d.collectionsCents)}`}
              >
                <div className="flex items-end gap-px" style={{ height: 130 }}>
                  <div className="w-1.5 rounded-t bg-primary" style={{ height: `${(d.productionCents / maxBar) * 130}px` }} />
                  <div className="w-1.5 rounded-t bg-success" style={{ height: `${(d.collectionsCents / maxBar) * 130}px` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Production</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Collections</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-4 gap-3 text-center">
        <Kpi label="Appointments" value={String(summary.appointments.total)} small />
        <Kpi label="Completed" value={String(summary.appointments.completed)} small />
        <Kpi label="No-shows" value={String(summary.appointments.noShow)} small />
        <Kpi label="Cancelled" value={String(summary.appointments.cancelled)} small />
      </div>
    </div>
  );
}

function Kpi({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className={`font-bold tracking-tight ${small ? "text-xl" : "text-2xl"}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
