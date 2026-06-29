"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@dentalos/ui";
import { formatMoney, formatDate } from "@dentalos/core";
import type { PatientsData } from "./types";

/** V3 — a dense, scannable data table (clickable rows). */
export function PatientsTable({ data }: { data: PatientsData }) {
  const router = useRouter();
  if (data.patients.length === 0) {
    return <p className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">No patients found.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-border/60 bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Name</th>
            <th className="px-4 py-2.5 font-semibold">Phone</th>
            <th className="px-4 py-2.5 font-semibold">Last visit</th>
            <th className="px-4 py-2.5 font-semibold">Recall due</th>
            <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.patients.map((p) => (
            <tr
              key={p.id}
              onClick={() => router.push(`/patients/${p.id}`)}
              className="cursor-pointer transition-colors hover:bg-secondary/40"
            >
              <td className="px-4 py-2.5 font-medium">
                {p.firstName} {p.lastName}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{p.phone ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{p.lastVisitAt ? formatDate(new Date(p.lastVisitAt), data.timezone) : "—"}</td>
              <td className="px-4 py-2.5">
                {p.nextRecallAt ? <Badge variant="secondary">{formatDate(new Date(p.nextRecallAt), data.timezone)}</Badge> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-2.5 text-right">
                {p.balanceCents > 0 ? <Badge variant="warning">{formatMoney(p.balanceCents)}</Badge> : <span className="text-muted-foreground">{formatMoney(0)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
