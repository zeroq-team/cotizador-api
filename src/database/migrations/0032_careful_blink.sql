ALTER TABLE "carts" DROP CONSTRAINT "carts_delivery_address_id_delivery_addresses_id_fk";
--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_delivery_address_id_delivery_addresses_id_fk" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."delivery_addresses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "valid_until";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "price_validated_at";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "price_change_approved";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "price_change_approved_at";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "original_total_price";