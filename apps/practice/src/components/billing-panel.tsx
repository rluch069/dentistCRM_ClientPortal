"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Select } from "@dentalos/ui";
import { formatMoney, formatDate, PAYMENT_METHODS, type PaymentMethod } from "@dentalos/core";
import { Printer } from "lucide-react";
import {
  recordPaymentAction,
  createInvoiceFromProceduresAction,
  issueInvoiceAction,
  addChargeAction,
} from "@/app/patients/[id]/actions";

interface Ledger { id: string; type: string; amountCents: number; description: string; createdAt: string }
interface Invoice { id: string; number: number | null; status: string; totalCents: number; paidCents: number }
interface CompletedProc { id: string; name: string; toothFdi: number | null; feeCents: number }

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mcb_juice: "MCB Juice",
  myt_money: "my.t money",
  maucas_qr: "MauCAS QR",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function BillingPanel({
  patientId,
  balanceCents,
  ledger,
  invoices,
  completedProcedures,
  timezone,
}: {
  patientId: string;
  balanceCents: number;
  ledger: Ledger[];
  invoices: Invoice[];
  completedProcedures: CompletedProc[];
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); router.refresh(); });

  const [payAmount, setPayAmount] = React.useState((balanceCents > 0 ? balanceCents / 100 : 0).toFixed(2));
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [chargeDesc, setChargeDesc] = React.useState("");
  const [chargeAmount, setChargeAmount] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Record payment */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Record payment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Balance: <span className={balanceCents > 0 ? "font-semibold text-warning-foreground" : "font-semibold"}>{formatMoney(balanceCents)}</span>
            </div>
            <div className="flex gap-2">
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-32" />
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{METHOD_LABEL[m]}</option>))}
              </Select>
            </div>
            <Button
              disabled={pending || Number(payAmount) <= 0}
              onClick={() => run(() => recordPaymentAction({ patientId, amountCents: Math.round(Number(payAmount) * 100), method }))}
            >
              Take payment
            </Button>
          </CardContent>
        </Card>

        {/* Add charge */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Add charge</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Description" value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} />
            <div className="flex gap-2">
              <Input type="number" step="0.01" placeholder="Amount" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} className="w-32" />
              <Button
                disabled={pending || !chargeDesc || Number(chargeAmount) <= 0}
                onClick={() => run(async () => { await addChargeAction(patientId, chargeDesc, Math.round(Number(chargeAmount) * 100)); setChargeDesc(""); setChargeAmount(""); })}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create invoice from completed procedures */}
      {completedProcedures.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Create invoice from completed work</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedProcedures.map((p) => (
              <label key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={!!selected[p.id]} onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))} />
                  {p.name}{p.toothFdi ? ` (tooth ${p.toothFdi})` : ""}
                </span>
                <span>{formatMoney(p.feeCents)}</span>
              </label>
            ))}
            <Button disabled={pending || selectedIds.length === 0} onClick={() => run(async () => { await createInvoiceFromProceduresAction(patientId, selectedIds); setSelected({}); })}>
              Create draft invoice ({selectedIds.length})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <div>
                <span className="font-medium">{inv.number ? `Invoice #${inv.number}` : "Draft invoice"}</span>
                <span className="ml-2 text-muted-foreground">{formatMoney(inv.totalCents)} · paid {formatMoney(inv.paidCents)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inv.status === "paid" ? "success" : inv.status === "draft" ? "secondary" : "warning"}>{inv.status}</Badge>
                {inv.status === "draft" && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => issueInvoiceAction(inv.id))}>Issue</Button>
                )}
                {inv.number && (
                  <Link href={`/print/invoice/${inv.id}`} target="_blank"><Button size="sm" variant="ghost"><Printer className="h-4 w-4" /></Button></Link>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Ledger</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {ledger.length === 0 && <p className="text-muted-foreground">No transactions.</p>}
          {ledger.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b py-1">
              <span>{formatDate(new Date(l.createdAt), timezone)} · {l.description}</span>
              <span className={l.amountCents < 0 ? "text-success" : ""}>{formatMoney(l.amountCents)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
