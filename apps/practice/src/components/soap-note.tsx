"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Label, Textarea } from "@dentalos/ui";
import { formatDateTime } from "@dentalos/core";
import { CheckCircle2, Plus } from "lucide-react";
import { createNoteAction, signNoteAction } from "@/app/patients/[id]/actions";

interface Note {
  id: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  signedAt: string | null;
  createdAt: string;
}

const SMART_PHRASES = ["NAD", "Caries noted", "Reviewed medical history", "Advised OHI", "LA administered", "Tolerated well"];

export function SoapNotes({ patientId, notes, timezone }: { patientId: string; notes: Note[]; timezone: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [s, setS] = React.useState("");
  const [o, setO] = React.useState("");
  const [a, setA] = React.useState("");
  const [p, setP] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const res = await createNoteAction({ patientId, subjective: s, objective: o, assessment: a, plan: p });
      if (!res.error) {
        setS(""); setO(""); setA(""); setP(""); setOpen(false);
        router.refresh();
      }
    });
  }
  function sign(id: string) {
    startTransition(async () => { await signNoteAction(id); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4" /> New note</Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">New clinical note (SOAP)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {SMART_PHRASES.map((ph) => (
                <button key={ph} className="rounded-full border px-2 py-0.5 text-xs hover:bg-secondary" onClick={() => setO((cur) => (cur ? `${cur}; ${ph}` : ph))}>
                  + {ph}
                </button>
              ))}
            </div>
            <Field label="Subjective"><Textarea rows={2} value={s} onChange={(e) => setS(e.target.value)} /></Field>
            <Field label="Objective"><Textarea rows={2} value={o} onChange={(e) => setO(e.target.value)} /></Field>
            <Field label="Assessment"><Textarea rows={2} value={a} onChange={(e) => setA(e.target.value)} /></Field>
            <Field label="Plan"><Textarea rows={2} value={p} onChange={(e) => setP(e.target.value)} /></Field>
            <Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save note"}</Button>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 && !open && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No clinical notes yet.</p>
      )}

      {notes.map((n) => (
        <Card key={n.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">{formatDateTime(new Date(n.createdAt), timezone)}</CardTitle>
            {n.signedAt ? (
              <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Signed</Badge>
            ) : (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => sign(n.id)}>Sign</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <SoapLine label="S" value={n.subjective} />
            <SoapLine label="O" value={n.objective} />
            <SoapLine label="A" value={n.assessment} />
            <SoapLine label="P" value={n.plan} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
function SoapLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <p><span className="mr-2 font-semibold text-muted-foreground">{label}:</span>{value}</p>;
}
