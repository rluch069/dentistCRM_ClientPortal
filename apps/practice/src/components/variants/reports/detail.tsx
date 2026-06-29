"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@dentalos/ui";
import { formatMoney } from "@dentalos/core";
import type { ReportsData } from "./types";

/** V3 — data tables: a daily ledger of production/collections + appointment breakdown. */
export function ReportsDetail({ data }: { data: ReportsData }) {
  const { summary, daily } = data;
  const totalProd = daily.reduce((s, d) => s + d.productionCents, 0);
  const totalColl = daily.reduce((s, d) => s + d.collectionsCents, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily production &amp; collections</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border/60 bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 text-right font-semibold">Production</th>
                <th className="px-4 py-2 text-right font-semibold">Collections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {daily.map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2">{d.date}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(d.productionCents)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(d.collectionsCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border/60 font-semibold">
              <tr>
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(totalProd)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(totalColl)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Appointments" value={summary.appointments.total} />
        <Stat label="Completed" value={summary.appointments.completed} />
        <Stat label="No-shows" value={summary.appointments.noShow} />
        <Stat label="Cancelled" value={summary.appointments.cancelled} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 text-center shadow-sm">
      <div className="text-xl font-bold tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
