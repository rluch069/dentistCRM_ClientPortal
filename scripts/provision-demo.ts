/**
 * Provision ready-to-explore demo clinics:
 *   • "demo"  — a 3-chair clinic (multi-operatory) for showing the full grid.
 *   • "solo"  — a single-chair solo practice (the typical Mauritius dentist),
 *               with appointments spread across the current week so the
 *               solo-day / agenda / week schedule variants all look populated.
 * Isolated DB + staff accounts + patients + appointments each. Idempotent —
 * skips a clinic if it already exists.
 */
import { loadRootEnv, ensureControlPlane, onboardClinic, openControlConnection, getTenantBySlug } from "@dentalos/tenancy";
import { createStaffAccount } from "@dentalos/auth";
import { createTenantClient } from "@dentalos/db";
import { createPatient, createAppointment, type ApiContext } from "@dentalos/api";
import { getProviders } from "@dentalos/providers";
import { clinicLocalToUtc, ymdInTz, addDaysYmd, dayOfWeekForYmd, type Locale } from "@dentalos/core";

interface StaffSeed {
  name: string;
  email: string;
  password: string;
  role: "owner" | "receptionist" | "dentist" | "hygienist" | "admin";
  /** Override whether a scheduling provider is created for this account. */
  asProvider?: boolean;
}
interface ClinicConfig {
  slug: string;
  name: string;
  locale: Locale;
  phone: string;
  staff: StaffSeed[];
  operatoryNames?: string[];
  providerNames?: string[];
  patients: { firstName: string; lastName: string; phone: string }[];
  /** Spread appointments across the current week (solo). Otherwise a few today. */
  seedWeek?: boolean;
}

const DEMO: ClinicConfig = {
  slug: "demo",
  name: "Demo Dental Clinic",
  locale: "en",
  phone: "+2305250000",
  staff: [
    { name: "Dr. Anita Sharma", email: "owner@demo.mu", password: "password123", role: "owner" },
    { name: "Reception Desk", email: "front@demo.mu", password: "password123", role: "receptionist" },
  ],
  patients: [
    { firstName: "Jean", lastName: "Baptiste", phone: "+2305700001" },
    { firstName: "Priya", lastName: "Ramdin", phone: "+2305700002" },
    { firstName: "Kevin", lastName: "Lim", phone: "+2305700003" },
  ],
};

const SOLO: ClinicConfig = {
  slug: "solo",
  name: "Clarel Dental Surgery",
  locale: "en",
  phone: "+2304251111",
  // The seeded provider below IS the dentist; don't also create one from the login.
  staff: [{ name: "Dr. Vikram Patel", email: "owner@solo.mu", password: "password123", role: "owner", asProvider: false }],
  operatoryNames: ["Dental Chair"],
  providerNames: ["Dr. Vikram Patel"],
  patients: [
    { firstName: "Rajesh", lastName: "Goolab", phone: "+2305800001" },
    { firstName: "Marie", lastName: "Laval", phone: "+2305800002" },
    { firstName: "Anil", lastName: "Bhola", phone: "+2305800003" },
    { firstName: "Sophie", lastName: "Azor", phone: "+2305800004" },
  ],
  seedWeek: true,
};

const TZ = "Indian/Mauritius";

async function clinicExists(slug: string): Promise<boolean> {
  const control = openControlConnection();
  try {
    return Boolean(await getTenantBySlug(control.db, slug));
  } finally {
    await control.close();
  }
}

/** Compute appointment slots (clinic-local ymd + minute-of-day). */
function planSlots(seedWeek: boolean, patientCount: number): { ymd: string; minute: number }[] {
  const today = ymdInTz(new Date(), TZ);
  if (!seedWeek) {
    // A few appointments today (09:00, 10:00, 11:00…), one per patient.
    return Array.from({ length: patientCount }, (_, i) => ({ ymd: today, minute: 9 * 60 + i * 60 }));
  }
  // Spread across the current week (Mon–Sat) at 09:00 / 11:00 / 14:00.
  const dow = dayOfWeekForYmd(today); // 0=Sun … 6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weekStart = addDaysYmd(today, mondayOffset);
  const slots: { ymd: string; minute: number }[] = [];
  for (let d = 0; d < 6; d++) {
    const ymd = addDaysYmd(weekStart, d);
    for (const minute of [9 * 60, 11 * 60, 14 * 60]) slots.push({ ymd, minute });
  }
  // If we happen to be demoing on a Sunday, make sure "today" isn't empty.
  if (dow === 0) for (const minute of [10 * 60, 11 * 60 + 30]) slots.push({ ymd: today, minute });
  return slots;
}

async function provisionClinic(cfg: ClinicConfig): Promise<void> {
  if (await clinicExists(cfg.slug)) {
    console.log(`✓ ${cfg.name} (${cfg.slug}) already exists.`);
    return;
  }
  console.log(`Provisioning ${cfg.name} (${cfg.slug})…`);
  const result = await onboardClinic(
    {
      slug: cfg.slug,
      name: cfg.name,
      locale: cfg.locale,
      phone: cfg.phone,
      operatoryNames: cfg.operatoryNames,
      providerNames: cfg.providerNames,
    },
    {
      afterSeed: async ({ tenantDb }) => {
        for (const s of cfg.staff) await createStaffAccount(tenantDb, s);
      },
    },
  );

  const conn = createTenantClient(result.connString);
  try {
    const ctx: ApiContext = {
      db: conn.db,
      tenant: { id: result.tenant.id, slug: cfg.slug, name: cfg.name, locale: cfg.locale, timezone: TZ },
      providers: getProviders(),
      actor: { kind: "system" },
    };
    const providerId = result.seed.providerIds[0]!;
    const operatoryId = result.seed.operatoryIds[0]!;
    const typeIds = result.seed.appointmentTypeIds;

    const patientIds: string[] = [];
    for (const p of cfg.patients) {
      patientIds.push(
        await createPatient(conn.db, { kind: "system" }, {
          firstName: p.firstName,
          lastName: p.lastName,
          gender: "unspecified",
          phone: p.phone,
          locale: cfg.locale,
          insurancePolicies: [],
        }),
      );
    }

    const slots = planSlots(Boolean(cfg.seedWeek), patientIds.length);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]!;
      const typeId = typeIds[1 + (i % Math.max(1, typeIds.length - 1))] ?? typeIds[0]!;
      await createAppointment(ctx, {
        patientId: patientIds[i % patientIds.length]!,
        providerId,
        operatoryId,
        appointmentTypeId: typeId,
        startAt: clinicLocalToUtc(s.ymd, s.minute, TZ),
        durationMinutes: 30,
        bookedVia: "staff",
        notify: false,
      });
    }
    console.log(`✓ ${cfg.slug}: ${patientIds.length} patients, ${slots.length} appointments.`);
  } finally {
    await conn.close();
  }
}

function printCreds(cfg: ClinicConfig) {
  console.log(`\n  ${cfg.name}  —  http://${cfg.slug}.localhost:3200  (staff)  ·  http://${cfg.slug}.localhost:3100  (patients)`);
  for (const s of cfg.staff) console.log(`     ${s.role.padEnd(12)} ${s.email} / ${s.password}`);
}

async function main() {
  loadRootEnv();
  await ensureControlPlane();
  await provisionClinic(DEMO);
  await provisionClinic(SOLO);

  console.log("\n────────────────────────────────────────────────");
  printCreds(DEMO);
  printCreds(SOLO);
  console.log("\n  Patients: sign in with any +230 number; OTP prints in the worker/app console.");
  console.log("  (Practice dev port is 3200 here because 3000 is in use.)");
  console.log("────────────────────────────────────────────────\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Demo provisioning failed:", err);
    process.exit(1);
  });
