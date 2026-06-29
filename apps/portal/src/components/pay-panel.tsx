"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Select, Spinner } from "@dentalos/ui";
import { formatMoney, type PaymentMethod } from "@dentalos/core";
import { CheckCircle2 } from "lucide-react";
import { payBalanceAction } from "@/app/pay/actions";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "mcb_juice", label: "MCB Juice" },
  { value: "maucas_qr", label: "MauCAS QR" },
  { value: "myt_money", label: "my.t money" },
];

export function PayPanel({ balanceCents }: { balanceCents: number }) {
  const router = useRouter();
  const [method, setMethod] = React.useState<PaymentMethod>("card");
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h2 className="text-lg font-semibold">Payment received</h2>
          <p className="text-sm text-muted-foreground">A receipt has been sent to you.</p>
          <Button className="w-full" onClick={() => router.push("/")}>Back to home</Button>
        </CardContent>
      </Card>
    );
  }

  if (balanceCents <= 0) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">You have no outstanding balance. 🎉</p>;
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="rounded-xl bg-secondary/60 py-4 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount due</div>
          <div className="text-3xl font-bold tracking-tight">{formatMoney(balanceCents)}</div>
        </div>
        <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await payBalanceAction(balanceCents, method);
              if (res.error) setError(res.error);
              else { setDone(true); router.refresh(); }
            })
          }
        >
          {pending ? (
            <>
              <Spinner /> Processing…
            </>
          ) : (
            `Pay ${formatMoney(balanceCents)}`
          )}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">Secure payment · processed in MUR</p>
      </CardContent>
    </Card>
  );
}
