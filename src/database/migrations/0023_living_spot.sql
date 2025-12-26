CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" bigint NOT NULL,
	"full_name" text,
	"document_type" varchar(50),
	"document_number" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"delivery_street" text,
	"delivery_street_number" varchar(50),
	"delivery_apartment" varchar(50),
	"delivery_city" varchar(100),
	"delivery_region" varchar(100),
	"delivery_postal_code" varchar(20),
	"delivery_country" varchar(100),
	"delivery_office" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_organization_id" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_customers_email" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_customers_document_number" ON "customers" USING btree ("document_number");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "full_name";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "document_type";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "document_number";