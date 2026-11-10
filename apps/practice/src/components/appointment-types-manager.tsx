"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Spinner } from "@dentalos/ui";
import type { AppointmentScope } from "@dentalos/core";
import { Plus, Trash2, RotateCcw, Check } from "lucide-react";
import {
  createAppointmentTypeAction,
  updateAppointmentTypeAction,
  setAppointmentTypeActiveAction,
  type AppointmentTypeActionState,
  type AppointmentTypeFormInput,
} from "@/app/settings/actions";

export interface AppointmentTypeRow {
  id: string;
  name: string;
  durationMinutes: number;
  scope: AppointmentScope;
  color: string;
  isActive: boolean;
}

const SCOPES: { value: AppointmentScope; label: string }[] = [
  { value: "all", label: "All patients" },
  { value: "new", label: "New patients" },
  { value: "existing", label: "Existing patients" },
];

export function AppointmentTypesManager({ types }: { types: AppointmentTypeRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const active = types.filter((t) => t.isActive);
  const inactive = types.filter((t) => !t.isActive);

  function run(fn: () => Promise<AppointmentTypeActionState>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        {active.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            No appointment types yet — add your first one below.
          </p>
        )}
        {active.map((t) => (
          <TypeRow
            key={t.id}
            type={t}
            pending={pending}
            onSave={(patch) => run(() => updateAppointmentTypeAction(t.id, patch))}
            onDeactivate={() => run(() => setAppointmentTypeActiveAction(t.id, false))}
          />
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inactive</p>
          {inactive.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                {t.name} · {t.durationMinutes}m
              </span>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAppointmentTypeActiveAction(t.id, true))}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            </div>
          ))}
        </div>
      )}

      <NewTypeForm pending={pending} onCreate={(input) => run(() => createAppointmentTypeAction(input))} />
    </div>
  );
}

function TypeRow({
  type,
  pending,
  onSave,
  onDeactivate,
}: {
  type: AppointmentTypeRow;
  pending: boolean;
  onSave: (patch: AppointmentTypeFormInput) => void;
  onDeactivate: () => void;
}) {
  const [name, setName] = React.useState(type.name);
  const [duration, setDuration] = React.useState(String(type.durationMinutes));
  const [scope, setScope] = React.useState<AppointmentScope>(type.scope);
  const [color, setColor] = React.useState(type.color);
  const dirty = name !== type.name || duration !== String(type.durationMinutes) || scope !== type.scope || color !== type.color;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card p-3 shadow-sm">
      <Input type="color" aria-label="Color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 shrink-0 p-1" />
      <Input value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
      <div className="flex items-center gap-1.5">
        <Input type="number" min={5} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-20" />
        <span className="text-xs text-muted-foreground">min</span>
      </div>
      <Select value={scope} onChange={(e) => setScope(e.target.value as AppointmentScope)} className="w-40">
        {SCOPES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </Select>
      <div className="ml-auto flex items-center gap-2">
        {dirty && (
          <Button
            size="sm"
            disabled={pending || !name.trim()}
            onClick={() => onSave({ name: name.trim(), durationMinutes: Number(duration) || type.durationMinutes, scope, color })}
          >
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={onDeactivate} aria-label={`Remove ${type.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NewTypeForm({ pending, onCreate }: { pending: boolean; onCreate: (input: AppointmentTypeFormInput) => void }) {
  const [name, setName] = React.useState("");
  const [duration, setDuration] = React.useState("30");
  const [scope, setScope] = React.useState<AppointmentScope>("all");
  const [color, setColor] = React.useState("#2563eb");

  function submit() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), durationMinutes: Number(duration) || 30, scope, color });
    setName("");
    setDuration("30");
    setScope("all");
    setColor("#2563eb");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/70 p-3">
      <Input type="color" aria-label="Color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 shrink-0 p-1" />
      <Input placeholder="e.g. Denture fitting" value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
      <div className="flex items-center gap-1.5">
        <Input type="number" min={5} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-20" />
        <span className="text-xs text-muted-foreground">min</span>
      </div>
      <Select value={scope} onChange={(e) => setScope(e.target.value as AppointmentScope)} className="w-40">
        {SCOPES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </Select>
      <Button size="sm" className="ml-auto" disabled={pending || !name.trim()} onClick={submit}>
        {pending ? <Spinner /> : <Plus className="h-3.5 w-3.5" />} Add type
      </Button>
    </div>
  );
}
