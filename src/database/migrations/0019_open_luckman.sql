ALTER TYPE "public"."payment_type" ADD VALUE 'purchase_order' BEFORE 'webpay';--> statement-breakpoint
CREATE TABLE "cart_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"product_name" text NOT NULL,
	"sku" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD COLUMN "is_purchase_order_active" boolean DEFAULT false NOT NULL;