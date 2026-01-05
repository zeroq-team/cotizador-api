CREATE UNIQUE INDEX "uk_customers_org_phone" ON "customers" USING btree ("organization_id","phone_code","phone_number");--> statement-breakpoint
CREATE INDEX "idx_customers_phone_code" ON "customers" USING btree ("phone_code");--> statement-breakpoint
CREATE INDEX "idx_customers_phone_number" ON "customers" USING btree ("phone_number");--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN "phone";