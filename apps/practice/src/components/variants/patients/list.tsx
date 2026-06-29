"use client";

import Link from "next/link";
import { Card, CardContent, Avatar, Badge } from "@dentalos/ui";
import { formatMoney, formatDate } from "@dentalos/core";
import type { PatientsData } from "./types";

/** V1 — the original single-column list of patient rows. */
export function PatientsList({ data }: { data: PatientsData }) {
  return (
    <Card>
      <CardContent className="divide-y divide-border/60 p-0">
        {data.patients.length === 0 && <p className="p-6 text-sm text-muted-foreground">No patients found.</p>}
        {data.patients.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="flex items-center justify-between gap-3 p-4 transition hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <Avatar name={`${p.firstName} ${p.lastName}`} />
              <div>
                <div className="font-medium">
                  {p.firstName} {p.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.phone ?? "No phone"}
                  {p.lastVisitAt ? ` · Last visit ${formatDate(new Date(p.lastVisitAt), data.timezone)}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {p.balanceCents > 0 && <Badge variant="warning">{formatMoney(p.balanceCents)}</Badge>}
              <span className="text-xs uppercase text-muted-foreground">{p.locale}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
