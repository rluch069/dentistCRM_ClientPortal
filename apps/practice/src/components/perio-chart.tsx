"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, cn } from "@dentalos/ui";
import { PERMANENT_TEETH_FDI } from "@dentalos/core";
import { createPerioExamAction, savePerioMeasuresAction } from "@/app/patients/[id]/actions";

const SITES = ["MB", "B", "DB", "ML", "L", "DL"] as const;
const UPPER = PERMANENT_TEETH_FDI.slice(0, 16);
const LOWER = PERMANENT_TEETH_FDI.slice(16);

interface Measure { toothFdi: number; site: string; pocketDepth: number | null; recession: number | null }
interface Cell { pd: string; rec: string }

export function PerioChart({
  patientId,
  examId,
  today,
  measures,
}: {
  patientId: string;
  examId: string | null;
  today: string;
  measures: Measure[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [mode, setMode] = React.useState<"pd" | "rec">("pd");
  const [cells, setCells] = React.useState<Record<string, Cell>>(() => {
    const init: Record<string, Cell> = {};
    for (const m of measures) init[`${m.toothFdi}:${m.site}`] = { pd: m.pocketDepth?.toString() ?? "", rec: m.recession?.toString() ?? "" };
    return init;
  });

  if (!examId) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">No periodontal exam yet.</p>
        <Button
          disabled={pending}
          onClick={() => startTransition(async () => { await createPerioExamAction(patientId, today); router.refresh(); })}
        >
          Start perio exam
        </Button>
      </div>
    );
  }

  function set(fdi: number, site: string, value: string) {
    const key = `${fdi}:${site}`;
    setCells((c) => ({ ...c, [key]: { pd: c[key]?.pd ?? "", rec: c[key]?.rec ?? "", [mode]: value } }));
  }

  function save() {
    if (!examId) return;
    const out: { toothFdi: number; site: string; pocketDepth?: number; recession?: number }[] = [];
    for (const fdi of PERMANENT_TEETH_FDI) {
      for (const site of SITES) {
        const cell = cells[`${fdi}:${site}`];
        if (!cell) continue;
        const pd = cell.pd ? Number(cell.pd) : undefined;
        const rec = cell.rec ? Number(cell.rec) : undefined;
        if (pd != null || rec != null) out.push({ toothFdi: fdi, site, pocketDepth: pd, recession: rec });
      }
    }
    startTransition(async () => { await savePerioMeasuresAction(examId, out); router.refresh(); });
  }

  // Live summary
  let probed = 0, deep = 0, calSum = 0, calCount = 0;
  for (const c of Object.values(cells)) {
    if (c.pd) { probed++; const pd = Number(c.pd); if (pd >= 4) deep++; calSum += pd + (c.rec ? Number(c.rec) : 0); calCount++; }
  }
  const meanCal = calCount ? (calSum / calCount).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-0.5 text-sm">
          <button onClick={() => setMode("pd")} className={cn("rounded-md px-3 py-1", mode === "pd" && "bg-primary text-primary-foreground")}>Pocket depth</button>
          <button onClick={() => setMode("rec")} className={cn("rounded-md px-3 py-1", mode === "rec" && "bg-primary text-primary-foreground")}>Recession</button>
        </div>
        <Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save exam"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Sites probed" value={String(probed)} />
        <Stat label="Deep sites (≥4mm)" value={String(deep)} accent={deep > 0} />
        <Stat label="Mean CAL" value={`${meanCal} mm`} />
      </div>

      <Card>
        <CardContent className="space-y-4 overflow-x-auto pt-4">
          <Arch teeth={UPPER} cells={cells} mode={mode} onSet={set} />
          <div className="border-t" />
          <Arch teeth={LOWER} cells={cells} mode={mode} onSet={set} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Entering {mode === "pd" ? "pocket depths" : "recession"} (mm) per site. CAL = pocket depth + recession.</p>
    </div>
  );
}

function Arch({ teeth, cells, mode, onSet }: { teeth: readonly number[]; cells: Record<string, Cell>; mode: "pd" | "rec"; onSet: (fdi: number, site: string, v: string) => void }) {
  return (
    <div className="flex gap-1">
      {teeth.map((fdi) => (
        <div key={fdi} className="flex flex-col items-center gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">{fdi}</span>
          <div className="grid grid-cols-3 gap-px">
            {SITES.map((site) => {
              const v = cells[`${fdi}:${site}`]?.[mode] ?? "";
              const pd = cells[`${fdi}:${site}`]?.pd;
              const deep = mode === "pd" && pd && Number(pd) >= 4;
              return (
                <input
                  key={site}
                  value={v}
                  onChange={(e) => onSet(fdi, site, e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                  inputMode="numeric"
                  className={cn("h-6 w-6 rounded border text-center text-[11px]", deep && "border-destructive bg-destructive/10 text-destructive")}
                  title={`${fdi} ${site}`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className={cn("text-xl font-bold", accent && "text-destructive")}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
