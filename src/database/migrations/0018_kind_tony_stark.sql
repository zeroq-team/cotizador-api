ALTER TABLE "organization_payment_methods" ADD COLUMN "bank_name" varchar(100);--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD COLUMN "account_type" varchar(20);--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD COLUMN "account_number" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD COLUMN "account_holder_name" varchar(200);--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD COLUMN "document_type" varchar(20);--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD COLUMN "document_number" varchar(50);