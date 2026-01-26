ALTER TABLE "cart_items" ADD COLUMN "customization_price_net" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "customization_price_with_tax" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "customization_price_details" jsonb;