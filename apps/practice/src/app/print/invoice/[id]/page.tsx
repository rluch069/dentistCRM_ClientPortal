import { notFound, redirect } from "next/navigation";
import { getInvoice, getPatient, getPractice } from "@dentalos/api";
import { formatMoney, formatDate } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const result = await getInvoice(ctx.db, id);
  if (!result) notFound();
  const { invoice, lines } = result;
  const [patientData, practice] = await Promise.all([getPatient(ctx.db, invoice.patientId), getPractice(ctx.db)]);
  const patient = patientData?.patient;
  const tz = ctx.tenant.timezone;
  const balance = invoice.totalCents - invoice.paidCents;

  return (
    <div className="mx-auto max-w-2xl p-10 text-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{practice?.name ?? ctx.tenant.name}</h1>
          {practice?.address && <p className="text-muted-foreground">{practice.address}</p>}
          {practice?.phone && <p className="text-muted-foreground">{practice.phone}</p>}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{invoice.number ? `Invoice #${invoice.number}` : "Draft invoice"}</div>
          {invoice.issuedAt && <div className="text-muted-foreground">{formatDate(invoice.issuedAt, tz)}</div>}
          <PrintButton />
        </div>
      </div>

      <div className="mb-4 border-y py-3">
        <strong>Bill to:</strong> {patient ? `${patient.firstName} ${patient.lastName}` : "—"}
      </div>

      <table className="mb-4 w-full">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-1">Description</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b">
              <td className="py-1">{l.description}</td>
              <td className="py-1 text-right">{formatMoney(l.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-56 space-y-1">
        <Row label="Subtotal" value={formatMoney(invoice.subtotalCents)} />
        <Row label="Total" value={formatMoney(invoice.totalCents)} bold />
        <Row label="Paid" value={formatMoney(invoice.paidCents)} />
        <Row label="Balance due" value={formatMoney(balance)} bold />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">Thank you for choosing {practice?.name ?? ctx.tenant.name}.</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
