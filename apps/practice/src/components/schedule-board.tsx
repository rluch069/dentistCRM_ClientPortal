"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Input, Label, Select, Spinner, cn } from "@dentalos/ui";
import { APPOINTMENT_TRANSITIONS, type AppointmentStatus } from "@dentalos/core";
import type { DayAppointment } from "@dentalos/api";
import { X, Plus } from "lucide-react";
import { setStatusAction, createAppointmentAction } from "@/app/dashboard/actions";
import { APPT_STATUS_META as STATUS_META } from "@/lib/status-colors";

interface Operatory { id: string; name: string; color: string }
interface Provider { id: string; displayName: string; color: string }
interface ApptType { id: string; name: string; durationMinutes: number; color: string }
interface PatientLite { id: string; name: string }

export interface ScheduleBoardProps {
  date: string;
  timezone: string;
  isToday: boolean;
  operatories: Operatory[];
  providers: Provider[];
  appointmentTypes: ApptType[];
  patients: PatientLite[];
  appointments: DayAppointment[];
}

const DAY_START = 480; // 08:00
const DAY_END = 1080; // 18:00
const PX_PER_MIN = 1.4;

function localMinute(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}
function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ScheduleBoard(props: ScheduleBoardProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<DayAppointment | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [dialog, setDialog] = React.useState<{ operatoryId: string; startMinute: number } | null>(null);
  const [nowMin, setNowMin] = React.useState<number>(() => (props.isToday ? localMinute(new Date().toISOString(), props.timezone) : -1));

  React.useEffect(() => {
    if (!props.isToday) return;
    const t = setInterval(() => setNowMin(localMinute(new Date().toISOString(), props.timezone)), 60_000);
    return () => clearInterval(t);
  }, [props.isToday, props.timezone]);

  const hours: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);
  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  function changeStatus(id: string, status: AppointmentStatus) {
    startTransition(async () => {
      await setStatusAction(id, status);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Operatory column headers */}
      <div className="flex border-b bg-card">
        <div className="w-14 shrink-0" />
        {props.operatories.map((op) => (
          <div key={op.id} className="flex-1 border-l px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: op.color }} />
              {op.name}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative flex" style={{ height: gridHeight }}>
          {/* time gutter */}
          <div className="w-14 shrink-0">
            {hours.map((m) => (
              <div key={m} className="relative" style={{ height: 60 * PX_PER_MIN }}>
                <span className="absolute -top-2 right-2 text-[11px] text-muted-foreground">{fmtTime(m)}</span>
              </div>
            ))}
          </div>

          {/* operatory columns */}
          {props.operatories.map((op) => {
            const appts = props.appointments.filter((a) => a.operatoryId === op.id);
            return (
              <div key={op.id} className="relative flex-1 border-l">
                {/* hour gridlines + clickable empty slots */}
                {hours.map((m) => (
                  <div
                    key={m}
                    className="border-b border-dashed border-border/60 hover:bg-secondary/40"
                    style={{ height: 60 * PX_PER_MIN }}
                    onClick={() => setDialog({ operatoryId: op.id, startMinute: m })}
                  />
                ))}
                {/* appointment cards */}
                {appts.map((a) => {
                  const start = localMinute(a.startAt, props.timezone);
                  const end = localMinute(a.endAt, props.timezone);
                  const top = (start - DAY_START) * PX_PER_MIN;
                  const height = Math.max((end - start) * PX_PER_MIN, 22);
                  const meta = STATUS_META[a.status];
                  const dim = a.status === "cancelled" || a.status === "no_show";
                  return (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(a);
                      }}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm transition hover:-translate-y-px hover:shadow-md",
                        dim && "opacity-50",
                      )}
                      style={{ top, height, background: `${a.typeColor}1a`, borderColor: meta.stripe }}
                    >
                      <div className="font-semibold leading-tight">{fmtTime(start)} {a.patientName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{a.typeName}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* now line */}
          {props.isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
            <div className="pointer-events-none absolute left-14 right-0 z-10 flex items-center" style={{ top: (nowMin - DAY_START) * PX_PER_MIN }}>
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <div className="h-px flex-1 bg-destructive" />
            </div>
          )}
        </div>
      </div>

      {/* Status drawer */}
      {selected && (
        <Drawer onClose={() => setSelected(null)} title={selected.patientName}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_META[selected.status].badge}>{STATUS_META[selected.status].label}</Badge>
              {selected.bookedVia === "portal" && <Badge variant="outline">Online booking</Badge>}
            </div>
            <Row label="When" value={`${fmtTime(localMinute(selected.startAt, props.timezone))}–${fmtTime(localMinute(selected.endAt, props.timezone))}`} />
            <Row label="Type" value={selected.typeName} />
            <Row label="Provider" value={selected.providerName} />
            {selected.note && <Row label="Note" value={selected.note} />}
            <div className="pt-2">
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Update status</div>
              <div className="flex flex-wrap gap-2">
                {APPOINTMENT_TRANSITIONS[selected.status].map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={pending} onClick={() => changeStatus(selected.id, s)}>
                    {STATUS_META[s].label}
                  </Button>
                ))}
                {APPOINTMENT_TRANSITIONS[selected.status].length === 0 && (
                  <span className="text-xs text-muted-foreground">No further changes.</span>
                )}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* New appointment dialog */}
      {dialog && (
        <NewAppointmentDialog
          {...props}
          prefill={dialog}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}

      {/* Floating add button */}
      <button
        onClick={() => setDialog({ operatoryId: props.operatories[0]?.id ?? "", startMinute: 540 })}
        className="absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:brightness-105 active:scale-95"
        aria-label="New appointment"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 animate-fade-in bg-foreground/20 backdrop-blur-sm" />
      <div className="relative h-full w-80 animate-slide-in-right overflow-auto border-l border-border/60 bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const OTHER_TYPE = "__other__";

export function NewAppointmentDialog(
  props: ScheduleBoardProps & { prefill: { operatoryId: string; startMinute: number }; onClose: () => void; onCreated: () => void },
) {
  const [patientMode, setPatientMode] = React.useState<"existing" | "new">("existing");
  const [patientId, setPatientId] = React.useState(props.patients[0]?.id ?? "");
  const [newFirst, setNewFirst] = React.useState("");
  const [newLast, setNewLast] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");

  const [typeId, setTypeId] = React.useState(props.appointmentTypes[0]?.id ?? "");
  const [customTypeName, setCustomTypeName] = React.useState("");
  const [customDuration, setCustomDuration] = React.useState("30");

  const [providerId, setProviderId] = React.useState(props.providers[0]?.id ?? "");
  const [operatoryId, setOperatoryId] = React.useState(props.prefill.operatoryId || props.operatories[0]?.id || "");
  const [time, setTime] = React.useState(
    `${String(Math.floor(props.prefill.startMinute / 60)).padStart(2, "0")}:${String(props.prefill.startMinute % 60).padStart(2, "0")}`,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const type = props.appointmentTypes.find((t) => t.id === typeId);
  const isOtherType = typeId === OTHER_TYPE;

  const patientValid = patientMode === "existing" ? Boolean(patientId) : Boolean(newFirst.trim() && newLast.trim());
  const typeValid = isOtherType ? Boolean(customTypeName.trim() && Number(customDuration) > 0) : Boolean(typeId);

  function submit() {
    setError(null);
    const [h, m] = time.split(":").map(Number);
    startTransition(async () => {
      const res = await createAppointmentAction({
        providerId,
        operatoryId,
        date: props.date,
        startMinute: (h ?? 0) * 60 + (m ?? 0),
        durationMinutes: isOtherType ? Number(customDuration) || 30 : (type?.durationMinutes ?? 30),
        ...(patientMode === "new"
          ? { newPatient: { firstName: newFirst.trim(), lastName: newLast.trim(), phone: newPhone.trim() || undefined, email: newEmail.trim() || undefined } }
          : { patientId }),
        ...(isOtherType
          ? { customType: { name: customTypeName.trim(), durationMinutes: Number(customDuration) || 30 } }
          : { appointmentTypeId: typeId }),
      });
      if (res.error) setError(res.error);
      else props.onCreated();
    });
  }

  return (
    <Drawer title="New appointment" onClose={props.onClose}>
      <div className="space-y-3">
        <Field label="Patient">
          {patientMode === "existing" ? (
            <div className="space-y-1.5">
              <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                {props.patients.length === 0 && <option value="">No patients yet</option>}
                {props.patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <button type="button" onClick={() => setPatientMode("new")} className="text-xs font-medium text-primary hover:underline">
                + New patient
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
                <Input placeholder="Last name" value={newLast} onChange={(e) => setNewLast(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <Input placeholder="Email (optional)" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <button type="button" onClick={() => setPatientMode("existing")} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                ← Use existing patient
              </button>
            </div>
          )}
        </Field>
        <Field label="Type">
          <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {props.appointmentTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.durationMinutes}m)</option>
            ))}
            <option value={OTHER_TYPE}>Other…</option>
          </Select>
          {isOtherType && (
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <Input placeholder="Custom type name" value={customTypeName} onChange={(e) => setCustomTypeName(e.target.value)} />
              <Input type="number" min={5} max={480} value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} className="w-20" />
            </div>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Provider">
            <Select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {props.providers.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Chair">
            <Select value={operatoryId} onChange={(e) => setOperatoryId(e.target.value)}>
              {props.operatories.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={`Time (${props.date})`}>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={pending || !patientValid || !typeValid} onClick={submit}>
          {pending ? (
            <>
              <Spinner /> Booking…
            </>
          ) : (
            "Book appointment"
          )}
        </Button>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
