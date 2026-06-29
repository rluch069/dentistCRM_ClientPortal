/**
 * Seed catalogs used to provision a new clinic with sensible defaults.
 * Procedure codes are an INTERNAL scheme (not ADA CDT — avoids licensing) suited
 * to Mauritius private-pay practice. Clinics can edit fees/codes after onboarding.
 * Fees are in MUR cents (integer).
 */

export interface ProcedureCatalogItem {
  code: string;
  name: string;
  category: "diagnostic" | "preventive" | "restorative" | "endodontic" | "surgical" | "prosthetic" | "periodontic" | "orthodontic" | "cosmetic";
  defaultFeeCents: number;
  toothScoped: boolean;
  surfaceScoped: boolean;
}

export const DEFAULT_PROCEDURE_CATALOG: ProcedureCatalogItem[] = [
  { code: "EXAM", name: "Consultation / Examination", category: "diagnostic", defaultFeeCents: 80000, toothScoped: false, surfaceScoped: false },
  { code: "XRAY-PA", name: "Periapical X-ray", category: "diagnostic", defaultFeeCents: 50000, toothScoped: true, surfaceScoped: false },
  { code: "XRAY-OPG", name: "Panoramic X-ray (OPG)", category: "diagnostic", defaultFeeCents: 150000, toothScoped: false, surfaceScoped: false },
  { code: "SCALE", name: "Scaling & Polishing", category: "preventive", defaultFeeCents: 120000, toothScoped: false, surfaceScoped: false },
  { code: "FLUORIDE", name: "Fluoride Application", category: "preventive", defaultFeeCents: 60000, toothScoped: false, surfaceScoped: false },
  { code: "SEALANT", name: "Fissure Sealant", category: "preventive", defaultFeeCents: 70000, toothScoped: true, surfaceScoped: false },
  { code: "FILL-COMP", name: "Composite Filling", category: "restorative", defaultFeeCents: 180000, toothScoped: true, surfaceScoped: true },
  { code: "FILL-GIC", name: "Glass Ionomer Filling", category: "restorative", defaultFeeCents: 150000, toothScoped: true, surfaceScoped: true },
  { code: "RCT-ANT", name: "Root Canal Treatment — Anterior", category: "endodontic", defaultFeeCents: 600000, toothScoped: true, surfaceScoped: false },
  { code: "RCT-MOL", name: "Root Canal Treatment — Molar", category: "endodontic", defaultFeeCents: 950000, toothScoped: true, surfaceScoped: false },
  { code: "EXTRACT", name: "Simple Extraction", category: "surgical", defaultFeeCents: 200000, toothScoped: true, surfaceScoped: false },
  { code: "EXTRACT-SURG", name: "Surgical Extraction", category: "surgical", defaultFeeCents: 450000, toothScoped: true, surfaceScoped: false },
  { code: "CROWN-PFM", name: "Crown — Porcelain Fused to Metal", category: "prosthetic", defaultFeeCents: 850000, toothScoped: true, surfaceScoped: false },
  { code: "CROWN-ZIR", name: "Crown — Zirconia", category: "prosthetic", defaultFeeCents: 1200000, toothScoped: true, surfaceScoped: false },
  { code: "DENTURE-FULL", name: "Complete Denture (per arch)", category: "prosthetic", defaultFeeCents: 1500000, toothScoped: false, surfaceScoped: false },
  { code: "IMPLANT", name: "Dental Implant", category: "surgical", defaultFeeCents: 3500000, toothScoped: true, surfaceScoped: false },
  { code: "WHITEN", name: "Teeth Whitening", category: "cosmetic", defaultFeeCents: 800000, toothScoped: false, surfaceScoped: false },
  { code: "PERIO-SRP", name: "Scaling & Root Planing (per quadrant)", category: "periodontic", defaultFeeCents: 250000, toothScoped: false, surfaceScoped: false },
];

export interface AppointmentTypeSeed {
  name: string;
  durationMinutes: number;
  scope: "new" | "existing" | "all";
  color: string;
  recallIntervalMonths: number | null;
}

export const DEFAULT_APPOINTMENT_TYPES: AppointmentTypeSeed[] = [
  { name: "New Patient Exam", durationMinutes: 45, scope: "new", color: "#2563eb", recallIntervalMonths: 6 },
  { name: "Check-up & Clean", durationMinutes: 30, scope: "existing", color: "#0ea5e9", recallIntervalMonths: 6 },
  { name: "Filling", durationMinutes: 45, scope: "existing", color: "#10b981", recallIntervalMonths: null },
  { name: "Root Canal", durationMinutes: 90, scope: "existing", color: "#f59e0b", recallIntervalMonths: null },
  { name: "Extraction", durationMinutes: 45, scope: "existing", color: "#ef4444", recallIntervalMonths: null },
  { name: "Emergency", durationMinutes: 30, scope: "all", color: "#dc2626", recallIntervalMonths: null },
  { name: "Consultation", durationMinutes: 30, scope: "all", color: "#8b5cf6", recallIntervalMonths: null },
];

/** Per-tooth conditions/findings (intrinsic state, distinct from procedures). */
export const TOOTH_CONDITIONS = [
  { code: "caries", label: "Caries" },
  { code: "missing", label: "Missing" },
  { code: "impacted", label: "Impacted" },
  { code: "fractured", label: "Fractured" },
  { code: "mobile", label: "Mobile" },
  { code: "rotated", label: "Rotated" },
  { code: "drifted", label: "Drifted" },
  { code: "discoloured", label: "Discoloured" },
  { code: "watch", label: "Watch" },
] as const;
export type ToothConditionCode = (typeof TOOTH_CONDITIONS)[number]["code"];

/** Curated starter diagnosis list (grows to SNODENT/ICD-10 later). */
export const DEFAULT_DIAGNOSES = [
  "Dental caries",
  "Pulpitis (reversible)",
  "Pulpitis (irreversible)",
  "Periapical abscess",
  "Gingivitis",
  "Chronic periodontitis",
  "Impacted tooth",
  "Tooth fracture",
  "Dentine hypersensitivity",
  "Malocclusion",
  "Edentulous (partial)",
  "Edentulous (complete)",
] as const;

/** Common dental prescription favourites (printable Rx; no e-transmission in v1). */
export const DEFAULT_PRESCRIPTION_FAVORITES = [
  { name: "Amoxicillin 500mg", sig: "1 capsule three times daily for 5 days", form: "capsule" },
  { name: "Amoxicillin + Clavulanic acid 625mg", sig: "1 tablet twice daily for 5 days", form: "tablet" },
  { name: "Metronidazole 400mg", sig: "1 tablet three times daily for 5 days", form: "tablet" },
  { name: "Ibuprofen 400mg", sig: "1 tablet three times daily after food for pain", form: "tablet" },
  { name: "Paracetamol 1g", sig: "1 tablet up to four times daily for pain", form: "tablet" },
  { name: "Chlorhexidine 0.2% mouthwash", sig: "Rinse twice daily for 1 minute", form: "mouthwash" },
] as const;
