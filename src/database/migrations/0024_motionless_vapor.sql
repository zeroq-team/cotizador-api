-- Create delivery_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS "delivery_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"street" text,
	"street_number" varchar(50),
	"apartment" varchar(50),
	"city" varchar(100),
	"region" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"office" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add columns if they don't exist
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_addresses' AND column_name = 'deleted_at') THEN
		ALTER TABLE "delivery_addresses" ADD COLUMN "deleted_at" timestamp;
	END IF;
END $$;
--> statement-breakpoint

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints 
		WHERE constraint_name = 'delivery_addresses_customer_id_customers_id_fk'
		AND table_name = 'delivery_addresses'
	) THEN
		ALTER TABLE "delivery_addresses" ADD CONSTRAINT "delivery_addresses_customer_id_customers_id_fk" 
		FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_delivery_addresses_customer_id" ON "delivery_addresses" USING btree ("customer_id");
--> statement-breakpoint

-- Create index on deleted_at if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_delivery_addresses_deleted_at" ON "delivery_addresses" USING btree ("deleted_at");
--> statement-breakpoint

-- Drop columns from customers table if they exist
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_street') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_street";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_street_number') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_street_number";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_apartment') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_apartment";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_city') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_city";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_region') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_region";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_postal_code') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_postal_code";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_country') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_country";
	END IF;
	
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_office') THEN
		ALTER TABLE "customers" DROP COLUMN "delivery_office";
	END IF;
END $$;