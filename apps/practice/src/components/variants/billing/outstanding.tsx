"use client";

import Link from "next/link";
import { Card, CardContent, Avatar, Badge } from "@dentalos/ui";
import { formatMoney } from "@dentalos/core";
import type { BillingData } from "./types";

/** V3 — accounts receivable: who owes what, biggest balances first. */
export function Outstanding({ data }: { data: BillingData }) {
  const total = data.outstanding.reduce((s, p) => s + p.balanceCents, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold tracking-tight text-warning-foreground">{formatMoney(total)}</div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total outstanding</div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold tracking-tight">{data.outstanding.length}</div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Patients with a balance</div>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-border/60 p-0">
          {data.outstanding.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No outstanding balances. 🎉</p>}
          {data.outstanding.map((p) => (
            <Link
              key={p.id}
              href={`/patients/${p.id}/billing`}
              className="flex items-center justify-between gap-3 p-4 transition hover:bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.name} />
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.phone ?? "No phone"}</div>
                </div>
              </div>
              <Badge variant="warning">{formatMoney(p.balanceCents)}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
