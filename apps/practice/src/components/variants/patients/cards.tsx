"use client";

import Link from "next/link";
import { Card, CardContent, Avatar, Badge } from "@dentalos/ui";
import { formatMoney, formatDate } from "@dentalos/core";
import { Phone, CalendarClock } from "lucide-react";
import type { PatientsData } from "./types";

/** V2 — an avatar card grid with balance + last-visit at a glance. */
export function PatientsCards({ data }: { data: PatientsData }) {
  if (data.patients.length === 0) {
    return <p className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">No patients found.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.patients.map((p) => (
        <Link key={p.id} href={`/patients/${p.id}`}>
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={`${p.firstName} ${p.lastName}`} className="h-11 w-11 text-base" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {p.phone ?? "No phone"}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" /> {p.lastVisitAt ? formatDate(new Date(p.lastVisitAt), data.timezone) : "No visits"}
                </span>
                {p.balanceCents > 0 ? <Badge variant="warning">{formatMoney(p.balanceCents)}</Badge> : <Badge variant="success">Paid</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
