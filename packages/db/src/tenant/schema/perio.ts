import { pgTable, uuid, integer, boolean, text, timestamp, date, index } from "drizzle-orm/pg-core";
import { patients, staffUsers } from "./operational";

/** A periodontal examination (a set of per-site measurements). */
export const perioExams = pgTable(
  "perio_exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    examinedByStaffId: uuid("examined_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    examDate: date("exam_date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("perio_exams_patient_idx").on(t.patientId) }),
);

/** One measurement per tooth × site. CAL is computed (pocketDepth + recession), not stored. */
export const perioMeasures = pgTable(
  "perio_measures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => perioExams.id, { onDelete: "cascade" }),
    toothFdi: integer("tooth_fdi").notNull(),
    site: text("site").notNull(), // MB, B, DB, ML, L, DL
    pocketDepth: integer("pocket_depth"), // mm
    recession: integer("recession"), // mm (gingival margin)
    bleeding: boolean("bleeding").notNull().default(false),
    suppuration: boolean("suppuration").notNull().default(false),
  },
  (t) => ({ byExam: index("perio_measures_exam_idx").on(t.examId) }),
);
