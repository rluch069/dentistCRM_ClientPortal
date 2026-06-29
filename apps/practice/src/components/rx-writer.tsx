"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@dentalos/ui";
import { formatDate } from "@dentalos/core";
import { Plus, Printer, Trash2 } from "lucide-react";
import { createRxAction } from "@/app/patients/[id]/actions";

interface Favorite { id: string; name: string; sig: string; form: string | null }
interface Rx { id: string; items: Array<{ name: string; sig: string; quantity?: string }>; note: string | null; createdAt: string }
interface Item { name: string; sig: string; quantity?: string }

export function RxWriter({
  patientId,
  favorites,
  prescriptions,
  timezone,
}: {
  patientId: string;
  favorites: Favorite[];
  prescriptions: Rx[];
  timezone: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<Item[]>([{ name: "", sig: "" }]);
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function addFavorite(f: Favorite) {
    setItems((cur) => {
      const next = cur.filter((i) => i.name || i.sig);
      return [...next, { name: f.name, sig: f.sig }];
    });
  }
  function update(i: number, patch: Partial<Item>) {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remove(i: number) {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  }
  function save() {
    const clean = items.filter((i) => i.name.trim() && i.sig.trim());
    if (clean.length === 0) return;
    startTransition(async () => {
      const res = await createRxAction({ patientId, items: clean, note: note || undefined });
      if (!res.error) {
        setItems([{ name: "", sig: "" }]);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Write prescription</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {favorites.map((f) => (
              <button key={f.id} className="rounded-full border px-2 py-0.5 text-xs hover:bg-secondary" onClick={() => addFavorite(f)}>
                + {f.name}
              </button>
            ))}
          </div>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Medication" value={it.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1" />
              <Input placeholder="Directions (sig)" value={it.sig} onChange={(e) => update(i, { sig: e.target.value })} className="flex-[2]" />
              <Input placeholder="Qty" value={it.quantity ?? ""} onChange={(e) => update(i, { quantity: e.target.value })} className="w-20" />
              <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((c) => [...c, { name: "", sig: "" }])}>
            <Plus className="h-4 w-4" /> Add line
          </Button>
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save prescription"}</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {prescriptions.map((rx) => (
          <div key={rx.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">{rx.items.map((i) => i.name).join(", ")}</div>
              <div className="text-xs text-muted-foreground">{formatDate(new Date(rx.createdAt), timezone)}</div>
            </div>
            <Link href={`/print/rx/${rx.id}`} target="_blank">
              <Button variant="outline" size="sm"><Printer className="h-4 w-4" /> Print</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
