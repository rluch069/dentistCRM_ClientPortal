"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label, Spinner, cn } from "@dentalos/ui";
import type { DayAvailability, SlotOption } from "@dentalos/api";
import { CheckCircle2 } from "lucide-react";
import { getAvailabilityAction, confirmBookingAction } from "@/app/book/actions";
import type { BookingProps } from "./types";

function parts(iso: string, tz: string) {
  return {
    time: new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)),
    day: new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "2-digit", month: "short" }).format(new Date(iso)),
  };
}

/** V2 — everything on one scrollable screen: service, dentist, then times appear inline. */
export function QuickBook(props: BookingProps) {
  const router = useRouter();
  const [typeId, setTypeId] = React.useState<string | null>(null);
  const [providerId, setProviderId] = React.useState<string | null>(null);
  const [avail, setAvail] = React.useState<DayAvailability[] | null>(null);
  const [slot, setSlot] = React.useState<SlotOption | null>(null);
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function load(tId: string, pId: string | null) {
    setLoading(true);
    setSlot(null);
    try {
      const d = await getAvailabilityAction(tId, pId, props.fromDate);
      setAvail(d.filter((x) => x.slots.length > 0));
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
        <CardContent className="space-y-3 pt-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h2 className="text-xl font-bold">You&apos;re booked!</h2>
          {slot && <p className="text-sm text-muted-foreground">{parts(slot.startAt, props.timezone).day} at {parts(slot.startAt, props.timezone).time}</p>}
          <Button className="w-full" onClick={() => router.push("/")}>Go to dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const chip = (active: boolean) =>
    cn("rounded-lg border px-3 py-2 text-sm transition", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/50");
  const canConfirm = !!slot && (!props.isNew || (Boolean(first) && Boolean(last)));

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-sm font-semibold">Service</div>
        <div className="flex flex-wrap gap-2">
          {props.types.map((t) => (
            <button key={t.id} onClick={() => { setTypeId(t.id); void load(t.id, providerId); }} className={chip(typeId === t.id)}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold">Dentist</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setProviderId(null); if (typeId) void load(typeId, null); }} className={chip(providerId === null)}>Any available</button>
          {props.providers.map((p) => (
            <button key={p.id} onClick={() => { setProviderId(p.id); if (typeId) void load(typeId, p.id); }} className={chip(providerId === p.id)}>
              {p.displayName}
            </button>
          ))}
        </div>
      </div>

      {typeId && (
        <div>
          <div className="mb-1.5 text-sm font-semibold">Time</div>
          {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Finding times…</p>}
          {!loading && avail?.length === 0 && <p className="text-sm text-muted-foreground">No availability in the next two weeks.</p>}
          <div className="space-y-3">
            {!loading &&
              avail?.slice(0, 6).map((day) => (
                <div key={day.date}>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{parts(day.slots[0]!.startAt, props.timezone).day}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {day.slots.slice(0, 12).map((s) => (
                      <button key={s.startAt} onClick={() => setSlot(s)} className={cn("rounded-lg border py-2 text-sm transition", slot?.startAt === s.startAt ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/50")}>
                        {parts(s.startAt, props.timezone).time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {props.isNew && slot && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="qf">First name</Label>
            <Input id="qf" value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ql">Last name</Label>
            <Input id="ql" value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="qe">Email (optional)</Label>
            <Input id="qe" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" size="lg" disabled={!canConfirm || loading} onClick={confirm}>
        {loading ? (
          <>
            <Spinner /> Booking…
          </>
        ) : slot ? (
          `Confirm ${parts(slot.startAt, props.timezone).day} · ${parts(slot.startAt, props.timezone).time}`
        ) : (
          "Pick a time"
        )}
      </Button>
    </div>
  );
}
