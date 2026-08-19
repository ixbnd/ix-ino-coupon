CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_pk" integer NOT NULL,
	"claim_date" date NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bill_total_cents" integer NOT NULL,
	"cap_cents" integer NOT NULL,
	"voided" boolean DEFAULT false NOT NULL,
	"amended_by" integer,
	"amended_at" timestamp with time zone,
	"voided_by" integer,
	"voided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employee_id_format" CHECK ("employees"."employee_id" ~ '^[A-Z]{3}-[0-9]{4}$')
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_employee_pk_employees_id_fk" FOREIGN KEY ("employee_pk") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_amended_by_employees_id_fk" FOREIGN KEY ("amended_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_voided_by_employees_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "claims_one_per_thursday" ON "claims" USING btree ("employee_pk","claim_date") WHERE NOT voided;