"use client";

import { useActionState } from "react";
import { Button, Input, Label, Textarea } from "@dentalos/ui";
import { saveIntakeAction, type IntakeState } from "@/app/intake/actions";

interface Props {
  defaults: { medicalHistory: string; allergies: string };
  consents: Record<string, boolean>;
}

const CONSENTS = [
  { key: "privacy", label: "I consent to the clinic storing my health data (Data Protection Act 2017).", required: true },
  { key: "treatment", label: "I consent to receiving dental treatment.", required: true },
  { key: "sms", label: "Send me SMS appointment reminders.", required: false },
  { key: "email", label: "Send me email reminders and receipts.", required: false },
];

export function IntakeForm({ defaults, consents }: Props) {
  const [state, formAction, pending] = useActionState<IntakeState, FormData>(saveIntakeAction, {});
  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="medicalHistory">Medical history</Label>
        <Textarea id="medicalHistory" name="medicalHistory" rows={4} defaultValue={defaults.medicalHistory} placeholder="Conditions, medications, past surgeries…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="allergies">Allergies</Label>
        <Input id="allergies" name="allergies" defaultValue={defaults.allergies} placeholder="e.g. Penicillin, latex" />
      </div>

      <fieldset className="space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Consents</legend>
        {CONSENTS.map((c) => (
          <label key={c.key} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={`consent_${c.key}`} defaultChecked={consents[c.key] ?? c.required} required={c.required} className="mt-1" />
            <span>{c.label}{c.required && <span className="text-destructive"> *</span>}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="signature">Sign (type your full name)</Label>
        <Input id="signature" name="signature" required placeholder="Your full name" />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Submit"}
      </Button>
    </form>
  );
}
