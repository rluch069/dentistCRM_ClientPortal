"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Select, Label, cn } from "@dentalos/ui";
import {
  PERMANENT_TEETH_FDI,
  renderToothLabel,
  surfacesForTooth,
  TOOTH_CONDITIONS,
  DEFAULT_PROCEDURE_CATALOG,
  formatMoney,
  type ToothSurface,
} from "@dentalos/core";
import type { ProcedureStatus } from "@dentalos/core/constants";
import { Drawer } from "./drawer";
import {
  addConditionAction,
  resolveConditionAction,
  chartProcedureAction,
  setProcedureStatusAction,
  deleteProcedureAction,
} from "@/app/patients/[id]/actions";
import { CHART_STATUS_COLOR as STATUS_COLOR } from "@/lib/status-colors";

interface Condition { id: string; toothFdi: number; conditionCode: string; note: string | null }
interface Procedure { id: string; toothFdi: number | null; code: string; name: string; surfaces: string[]; status: ProcedureStatus; feeCents: number }

interface Props {
  patientId: string;
  conditions: Condition[];
  procedures: Procedure[];
}

const UPPER = PERMANENT_TEETH_FDI.slice(0, 16);
const LOWER = PERMANENT_TEETH_FDI.slice(16);

export function Odontogram(props: Props) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [pending, startTransition] = React.useTransition();

  const byTooth = (fdi: number) => ({
    conditions: props.conditions.filter((c) => c.toothFdi === fdi),
    procedures: props.procedures.filter((p) => p.toothFdi === fdi),
  });

  function refresh() {
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Legend color={STATUS_COLOR.condition!} label="Condition" />
        <Legend color={STATUS_COLOR.planned!} label="Planned" />
        <Legend color={STATUS_COLOR.completed!} label="Completed" />
        <Legend color={STATUS_COLOR.existing!} label="Existing" />
        <span className="ml-auto">FDI numbering · click a tooth to chart</span>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <ToothRow teeth={UPPER} byTooth={byTooth} onSelect={setSelected} />
        <div className="border-t border-border/60" />
        <ToothRow teeth={LOWER} byTooth={byTooth} onSelect={setSelected} />
      </div>

      {selected !== null && (
        <ToothDrawer
          fdi={selected}
          patientId={props.patientId}
          data={byTooth(selected)}
          pending={pending}
          onClose={() => setSelected(null)}
          run={(fn) => startTransition(async () => { await fn(); refresh(); })}
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

function ToothRow({
  teeth,
  byTooth,
  onSelect,
}: {
  teeth: readonly number[];
  byTooth: (fdi: number) => { conditions: Condition[]; procedures: Procedure[] };
  onSelect: (fdi: number) => void;
}) {
  return (
    <div className="flex justify-center gap-1">
      {teeth.map((fdi) => {
        const { conditions, procedures } = byTooth(fdi);
        const hasCondition = conditions.length > 0;
        const planned = procedures.some((p) => p.status === "planned");
        const completed = procedures.some((p) => p.status === "completed");
        const existing = procedures.some((p) => p.status === "existing");
        const accent = hasCondition ? STATUS_COLOR.condition : completed ? STATUS_COLOR.completed : planned ? STATUS_COLOR.planned : existing ? STATUS_COLOR.existing : undefined;
        return (
          <button
            key={fdi}
            onClick={() => onSelect(fdi)}
            className={cn("flex w-9 shrink-0 flex-col items-center rounded-md border p-1 text-[10px] transition hover:border-primary hover:bg-secondary")}
            title={`Tooth ${fdi}`}
          >
            <span className="font-mono text-muted-foreground">{renderToothLabel(fdi, "fdi")}</span>
            <span
              className="mt-1 h-6 w-6 rounded-sm border"
              style={{ background: accent ? `${accent}22` : "transparent", borderColor: accent ?? "var(--border)" }}
            />
            <span className="mt-0.5 h-1 w-full rounded-full" style={{ background: accent ?? "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

function ToothDrawer({
  fdi,
  patientId,
  data,
  pending,
  onClose,
  run,
}: {
  fdi: number;
  patientId: string;
  data: { conditions: Condition[]; procedures: Procedure[] };
  pending: boolean;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const validSurfaces = surfacesForTooth(fdi);
  const [conditionCode, setConditionCode] = React.useState<string>(TOOTH_CONDITIONS[0]!.code);
  const [procCode, setProcCode] = React.useState<string>(DEFAULT_PROCEDURE_CATALOG[0]!.code);
  const [surfaces, setSurfaces] = React.useState<ToothSurface[]>([]);
  const [status, setStatus] = React.useState<ProcedureStatus>("planned");
  const proc = DEFAULT_PROCEDURE_CATALOG.find((p) => p.code === procCode)!;

  function toggleSurface(s: ToothSurface) {
    setSurfaces((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  return (
    <Drawer title={`Tooth ${fdi}`} onClose={onClose}>
      <div className="space-y-5 text-sm">
        {/* Existing on this tooth */}
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">On this tooth</div>
          {data.conditions.length === 0 && data.procedures.length === 0 && (
            <p className="text-muted-foreground">Nothing charted yet.</p>
          )}
          {data.conditions.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border p-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.condition }} />
                {TOOTH_CONDITIONS.find((t) => t.code === c.conditionCode)?.label ?? c.conditionCode}
              </span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveConditionAction(c.id))}>
                Resolve
              </Button>
            </div>
          ))}
          {data.procedures.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.surfaces.join("")} {p.surfaces.length ? "· " : ""}{formatMoney(p.feeCents)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={p.status === "completed" ? "success" : p.status === "planned" ? "default" : "secondary"}>{p.status}</Badge>
                {p.status === "planned" && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setProcedureStatusAction(p.id, "completed"))}>
                    Done
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteProcedureAction(p.id))}>
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </section>

        {/* Add condition */}
        <section className="space-y-2">
          <Label>Add condition</Label>
          <div className="flex gap-2">
            <Select value={conditionCode} onChange={(e) => setConditionCode(e.target.value)}>
              {TOOTH_CONDITIONS.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </Select>
            <Button disabled={pending} onClick={() => run(() => addConditionAction({ patientId, toothFdi: fdi, conditionCode }))}>
              Add
            </Button>
          </div>
        </section>

        {/* Chart procedure */}
        <section className="space-y-2">
          <Label>Chart procedure</Label>
          <Select value={procCode} onChange={(e) => { setProcCode(e.target.value); setSurfaces([]); }}>
            {DEFAULT_PROCEDURE_CATALOG.map((p) => (
              <option key={p.code} value={p.code}>{p.name} — {formatMoney(p.defaultFeeCents)}</option>
            ))}
          </Select>
          {proc.surfaceScoped && (
            <div className="flex flex-wrap gap-1">
              {validSurfaces.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSurface(s)}
                  className={cn("h-8 w-8 rounded-md border text-xs font-medium", surfaces.includes(s) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProcedureStatus)}>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
            <option value="existing">Existing work</option>
          </Select>
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(() =>
                chartProcedureAction({
                  patientId,
                  code: proc.code,
                  name: proc.name,
                  toothFdi: proc.toothScoped ? fdi : undefined,
                  surfaces: proc.surfaceScoped ? surfaces : [],
                  status,
                  feeCents: proc.defaultFeeCents,
                }),
              )
            }
          >
            Chart {proc.name}
          </Button>
        </section>
      </div>
    </Drawer>
  );
}
