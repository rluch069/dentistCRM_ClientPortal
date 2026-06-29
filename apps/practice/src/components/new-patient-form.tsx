"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select, Textarea } from "@dentalos/ui";
import { createPatientAction, type NewPatientState } from "@/app/patients/actions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function NewPatientForm() {
  const [state, formAction, pending] = useActionState<NewPatientState, FormData>(createPatientAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input name="firstName" required />
        </Field>
        <Field label="Last name">
          <Input name="lastName" required />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date of birth">
          <Input name="dateOfBirth" type="date" />
        </Field>
        <Field label="Gender">
          <Select name="gender" defaultValue="unspecified">
            <option value="unspecified">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Language">
          <Select name="locale" defaultValue="en">
            <option value="en">English</option>
            <option value="fr">Français</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mobile">
          <Input name="phone" placeholder="5xxx xxxx" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" />
        </Field>
      </div>
      <Field label="Address">
        <Input name="address" />
      </Field>
      <Field label="Medical history">
        <Textarea name="medicalHistory" rows={3} placeholder="Conditions, medications…" />
      </Field>
      <Field label="Allergies">
        <Input name="allergies" placeholder="e.g. Penicillin" />
      </Field>

      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Insurance (optional)</legend>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Insurer">
            <Input name="insurerName" placeholder="Swan, SICOM…" />
          </Field>
          <Field label="Policy no.">
            <Input name="policyNumber" />
          </Field>
          <Field label="Coverage %">
            <Input name="coverage" type="number" min={0} max={100} />
          </Field>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save patient"}
      </Button>
    </form>
  );
}
