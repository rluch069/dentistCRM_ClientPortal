CREATE TABLE "perio_exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"examined_by_staff_id" uuid,
	"exam_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perio_measures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"tooth_fdi" integer NOT NULL,
	"site" text NOT NULL,
	"pocket_depth" integer,
	"recession" integer,
	"bleeding" boolean DEFAULT false NOT NULL,
	"suppuration" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "perio_exams" ADD CONSTRAINT "perio_exams_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perio_exams" ADD CONSTRAINT "perio_exams_examined_by_staff_id_staff_users_id_fk" FOREIGN KEY ("examined_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perio_measures" ADD CONSTRAINT "perio_measures_exam_id_perio_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."perio_exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "perio_exams_patient_idx" ON "perio_exams" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "perio_measures_exam_idx" ON "perio_measures" USING btree ("exam_id");