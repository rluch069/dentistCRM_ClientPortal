"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select, Input } from "@dentalos/ui";
import { DEFAULT_PROCEDURE_CATALOG, formatMoney } from "@dentalos/core";
import type { ProcedureStatus, TreatmentPlanStatus } from "@dentalos/core/constants";
import { Plus, Send } from "lucide-react";
import {
  createPlanAction,
  chartProcedureAction,
  deleteProcedureAction,
  setProcedureStatusAction,
  acceptPlanAction,
  sharePlanAction,
} from "@/app/patients/[id]/actions";

interface Proc { id: string; code: string; name: string; toothFdi: number | null; feeCents: number; status: ProcedureStatus }
interface Plan { id: string; title: string; status: TreatmentPlanStatus; totalCents: number; procedures: Proc[] }

export function TreatmentPlans({ patientId, plans }: { patientId: string; plans: Plan[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); router.refresh(); });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled={pending} onClick={() => run(() => createPlanAction(patientId))}>
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      {plans.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No treatment plans yet.</p>
      )}

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {plan.title}
              <Badge variant={plan.status === "accepted" ? "success" : plan.status === "proposed" ? "default" : "secondary"}>{plan.status}</Badge>
            </CardTitle>
            <div className="text-right">
              <div className="text-xs uppercase text-muted-foreground">Total</div>
              <div className="font-semibold">{formatMoney(plan.totalCents)}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              {plan.procedures.length === 0 && <p className="text-sm text-muted-foreground">No procedures yet.</p>}
              {plan.procedures.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{p.name}</span>
                    {p.toothFdi ? <span className="ml-2 text-xs text-muted-foreground">tooth {p.toothFdi}</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatMoney(p.feeCents)}</span>
                    <Badge variant={p.status === "completed" ? "success" : "secondary"}>{p.status}</Badge>
                    {p.status === "planned" && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setProcedureStatusAction(p.id, "completed"))}>
                        Done
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteProcedureAction(p.id))}>✕</Button>
                  </div>
                </div>
              ))}
            </div>

            <AddProcedureRow patientId={patientId} planId={plan.id} pending={pending} run={run} />

            <div className="flex justify-end gap-2 pt-1">
              {plan.status !== "accepted" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => sharePlanAction(plan.id))}>
                  <Send className="h-3.5 w-3.5" /> Share with patient
                </Button>
              )}
              {plan.status !== "accepted" && (
                <Button size="sm" disabled={pending} onClick={() => run(() => acceptPlanAction(plan.id, "Accepted in clinic"))}>
                  Mark accepted
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AddProcedureRow({
  patientId,
  planId,
  pending,
  run,
}: {
  patientId: string;
  planId: string;
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [code, setCode] = React.useState(DEFAULT_PROCEDURE_CATALOG[0]!.code);
  const [tooth, setTooth] = React.useState("");
  const item = DEFAULT_PROCEDURE_CATALOG.find((p) => p.code === code)!;
  return (
    <div className="flex items-end gap-2 rounded-lg bg-secondary/40 p-2">
      <div className="flex-1">
        <Select value={code} onChange={(e) => setCode(e.target.value)}>
          {DEFAULT_PROCEDURE_CATALOG.map((p) => (
            <option key={p.code} value={p.code}>{p.name} — {formatMoney(p.defaultFeeCents)}</option>
          ))}
        </Select>
      </div>
      {item.toothScoped && <Input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="Tooth" className="w-20" inputMode="numeric" />}
      <Button
        disabled={pending}
        onClick={() =>
          run(() =>
            chartProcedureAction({
              patientId,
              treatmentPlanId: planId,
              code: item.code,
              name: item.name,
              toothFdi: item.toothScoped && tooth ? Number(tooth) : undefined,
              feeCents: item.defaultFeeCents,
              status: "planned",
            }),
          )
        }
      >
        Add
      </Button>
    </div>
  );
}
