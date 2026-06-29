"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@dentalos/ui";
import type { DayAvailability, SlotOption } from "@dentalos/api";
import { Clock, ChevronLeft, CheckCircle2, Stethoscope } from "lucide-react";
import { getAvailabilityAction, confirmBookingAction } from "@/app/book/actions";

interface ApptType { id: string; name: string; durationMinutes: number; color: string }
interface Provider { id: string; displayName: string }

interface Props {
  isNew: boolean;
  timezone: string;
  fromDate: string;
  types: ApptType[];
  providers: Provider[];
}

function localParts(iso: string, tz: string) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "2-digit", month: "short" }).format(new Date(iso));
  return { time, day };
}

export function BookingWizard(props: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [typeId, setTypeId] = React.useState<string | null>(null);
  const [providerId, setProviderId] = React.useState<string | null>(null);
  const [availability, setAvailability] = React.useState<DayAvailability[] | null>(null);
  const [slot, setSlot] = React.useState<SlotOption | null>(null);
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const selectedType = props.types.find((t) => t.id === typeId);

  async function loadAvailability(tId: string, pId: string | null) {
    setLoading(true);
    setError(null);
    try {
      const data = await getAvailabilityAction(tId, pId, props.fromDate);
      setAvailability(data.filter((d) => d.slots.length > 0));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!typeId || !slot) return;
    setLoading(true);
    setError(null);
    const res = await confirmBookingAction({
      appointmentTypeId: typeId,
      providerId,
      operatoryId: slot.operatoryId,
      startAt: slot.startAt,
      newPatient: props.isNew ? { firstName: first, lastName: last, email: email || undefined } : undefined,
    });
    setLoading(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h2 className="text-xl font-semibold">You&apos;re booked!</h2>
          {slot && (
            <p className="text-sm text-muted-foreground">
              {localParts(slot.startAt, props.timezone).day} at {localParts(slot.startAt, props.timezone).time} for {selectedType?.name}.
            </p>
          )}
          <p className="text-xs text-muted-foreground">We&apos;ve sent a confirmation. You&apos;ll get reminders before your visit.</p>
          <Button className="w-full" onClick={() => router.push("/")}>
            Go to my dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Stepper step={step} labels={props.isNew ? ["Service", "Dentist", "Time", "Details"] : ["Service", "Dentist", "Time"]} />

      {step === 0 && (
        <div className="space-y-2">
          <h2 className="px-1 font-medium">Choose a service</h2>
          {props.types.map((t) => (
            <button
              key={t.id}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary"
              onClick={() => {
                setTypeId(t.id);
                setStep(1);
              }}
            >
              <span className="h-9 w-1.5 rounded-full" style={{ background: t.color }} />
              <div className="flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.durationMinutes} min</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <BackBtn onClick={() => setStep(0)} />
          <h2 className="px-1 font-medium">Choose a dentist</h2>
          <button
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary"
            onClick={() => {
              setProviderId(null);
              void loadAvailability(typeId!, null);
              setStep(2);
            }}
          >
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-medium">Any available dentist</span>
          </button>
          {props.providers.map((p) => (
            <button
              key={p.id}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary"
              onClick={() => {
                setProviderId(p.id);
                void loadAvailability(typeId!, p.id);
                setStep(2);
              }}
            >
              <span className="font-medium">{p.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <BackBtn onClick={() => setStep(1)} />
          <h2 className="px-1 font-medium">Choose a time</h2>
          {loading && <p className="px-1 text-sm text-muted-foreground">Finding available times…</p>}
          {!loading && availability?.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">No availability in the next two weeks.</p>
          )}
          {!loading &&
            availability?.map((day) => (
              <div key={day.date}>
                <div className="mb-1 px-1 text-xs font-semibold uppercase text-muted-foreground">
                  {localParts(day.slots[0]!.startAt, props.timezone).day}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {day.slots.slice(0, 16).map((s) => (
                    <button
                      key={s.startAt}
                      className="rounded-lg border bg-card py-2 text-sm transition hover:border-primary hover:bg-primary/5"
                      onClick={() => {
                        setSlot(s);
                        setStep(props.isNew ? 3 : 99);
                      }}
                    >
                      {localParts(s.startAt, props.timezone).time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <BackBtn onClick={() => setStep(2)} />
          <h2 className="px-1 font-medium">Your details</h2>
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!first || !last || loading} onClick={() => setStep(99)}>
            Review
          </Button>
        </div>
      )}

      {step === 99 && slot && (
        <div className="space-y-3">
          <BackBtn onClick={() => setStep(props.isNew ? 3 : 2)} />
          <Card>
            <CardContent className="space-y-3 pt-5">
              <h2 className="font-medium">Confirm your appointment</h2>
              <Summary icon={<Stethoscope className="h-4 w-4" />} label={selectedType?.name ?? ""} />
              <Summary
                icon={<Clock className="h-4 w-4" />}
                label={`${localParts(slot.startAt, props.timezone).day} at ${localParts(slot.startAt, props.timezone).time}`}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" size="lg" disabled={loading} onClick={confirm}>
                {loading ? "Booking…" : "Confirm booking"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  const active = step === 99 ? labels.length - 1 : step;
  return (
    <div className="flex items-center gap-1">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 flex-col items-center gap-1">
          <div className={`h-1 w-full rounded-full ${i <= active ? "bg-primary" : "bg-border"}`} />
          <span className={`text-[10px] ${i <= active ? "text-primary" : "text-muted-foreground"}`}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="h-4 w-4" /> Back
    </button>
  );
}

function Summary({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
