"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@dentalos/ui";
import { formatMoney } from "@dentalos/core";
import { runReconciliationAction, type ReconResult } from "@/app/billing/reconciliation/actions";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mcb_juice: "MCB Juice",
  myt_money: "my.t money",
  maucas_qr: "MauCAS QR",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function ReconciliationTool({ today }: { today: string }) {
  const [date, setDate] = React.useState(today);
  const [result, setResult] = React.useState<ReconResult | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">End-of-day reconciliation</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Business date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <Button disabled={pending} onClick={() => startTransition(async () => setResult(await runReconciliationAction(date)))}>
            {pending ? "Calculating…" : "Close day"}
          </Button>
        </div>

        {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
        {result?.data && (
          <div className="rounded-lg border">
            {Object.entries(result.data.totalsByMethod).length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No payments recorded on this date.</p>
            )}
            {Object.entries(result.data.totalsByMethod).map(([method, cents]) => (
              <div key={method} className="flex justify-between border-b p-3 text-sm last:border-b-0">
                <span>{METHOD_LABEL[method] ?? method}</span>
                <span className="font-medium">{formatMoney(cents)}</span>
              </div>
            ))}
            <div className="flex justify-between bg-secondary p-3 font-semibold">
              <span>Total collected</span>
              <span>{formatMoney(result.data.totalCents)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
