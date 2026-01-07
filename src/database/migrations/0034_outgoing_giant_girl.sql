ALTER TABLE "customization_field_groups" ADD COLUMN "minimum_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "customization_fields" DROP COLUMN "minimum_amount";