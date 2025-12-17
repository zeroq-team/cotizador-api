CREATE TABLE IF NOT EXISTS "tax_class" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_list" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"pricing_tax_mode" varchar(20),
	"tax_class_id" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_list_condition" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"price_list_id" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"condition_type" varchar(50) NOT NULL,
	"operator" varchar(20) DEFAULT 'equals' NOT NULL,
	"condition_value" jsonb NOT NULL,
	"config" jsonb,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_price" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"price_list_id" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"tax_included" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_product_price_amount_positive" CHECK ("product_price"."amount" > 0),
	CONSTRAINT "ck_product_price_valid_dates" CHECK ("product_price"."valid_from" IS NULL OR "product_price"."valid_to" IS NULL OR "product_price"."valid_from" <= "product_price"."valid_to")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"sku" varchar(255) NOT NULL,
	"external_sku" varchar(255),
	"external_name" varchar(500),
	"name" varchar(500) NOT NULL,
	"description" text,
	"product_type" varchar(50) DEFAULT 'simple' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"unit_of_measure" varchar(50),
	"brand" varchar(255),
	"model" varchar(255),
	"tax_class_id" bigint,
	"weight" varchar(50),
	"height" varchar(50),
	"width" varchar(50),
	"length" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"type" varchar(20) NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"alt_text" text,
	"title" text,
	"description" text,
	"file_size" bigint,
	"mime_type" varchar(100),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_type_check" CHECK ("product_media"."type" = ANY (ARRAY['image', 'pdf', 'video', 'audio', 'document']))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_relations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"related_product_id" bigint NOT NULL,
	"relation_type" varchar(20) NOT NULL,
	"quantity" numeric(18, 3),
	"position" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_no_self_relation" CHECK ("product_relations"."product_id" <> "product_relations"."related_product_id"),
	CONSTRAINT "product_relations_relation_type_check" CHECK ("product_relations"."relation_type" = ANY (ARRAY['related', 'upsell', 'crosssell', 'bundle_item', 'substitute', 'complement']))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_location" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"address" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_location_type_check" CHECK ("inventory_location"."type" = ANY (ARRAY['warehouse', 'store', 'virtual']))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_level" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"location_id" bigint NOT NULL,
	"on_hand" numeric(18, 3) DEFAULT '0' NOT NULL,
	"reserved" numeric(18, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customization_groups" DROP CONSTRAINT IF EXISTS "customization_groups_name_unique";--> statement-breakpoint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_id' AND data_type = 'integer') THEN
    ALTER TABLE "cart_items" ALTER COLUMN "product_id" SET DATA TYPE integer USING product_id::integer;
  END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customization_groups' AND column_name = 'organization_id') THEN
    ALTER TABLE "customization_groups" ADD COLUMN "organization_id" integer NOT NULL DEFAULT 1;
  END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customization_fields' AND column_name = 'organization_id') THEN
    ALTER TABLE "customization_fields" ADD COLUMN "organization_id" integer NOT NULL DEFAULT 1;
  END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customization_field_groups' AND column_name = 'organization_id') THEN
    ALTER TABLE "customization_field_groups" ADD COLUMN "organization_id" integer NOT NULL DEFAULT 1;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tax_class" ADD CONSTRAINT "tax_class_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "price_list" ADD CONSTRAINT "price_list_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "price_list" ADD CONSTRAINT "price_list_tax_class_id_tax_class_id_fk" FOREIGN KEY ("tax_class_id") REFERENCES "public"."tax_class"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "price_list_condition" ADD CONSTRAINT "price_list_condition_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "price_list_condition" ADD CONSTRAINT "price_list_condition_price_list_id_price_list_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price" ADD CONSTRAINT "product_price_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price" ADD CONSTRAINT "product_price_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price" ADD CONSTRAINT "product_price_price_list_id_price_list_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_media" ADD CONSTRAINT "product_media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_location" ADD CONSTRAINT "inventory_location_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_level" ADD CONSTRAINT "inventory_level_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_level" ADD CONSTRAINT "inventory_level_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_level" ADD CONSTRAINT "inventory_level_location_id_inventory_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_location"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_class_org_id" ON "tax_class" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_class_org_code" ON "tax_class" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_class_org_default" ON "tax_class" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_class_status" ON "tax_class" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_class_created_at" ON "tax_class" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_class_updated_at" ON "tax_class" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uk_tax_class_org_code" ON "tax_class" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_org_id" ON "price_list" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_org_default" ON "price_list" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_org_status" ON "price_list" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_currency" ON "price_list" USING btree ("currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_is_default" ON "price_list" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_status" ON "price_list" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_tax_class" ON "price_list" USING btree ("tax_class_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_created_at" ON "price_list" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_updated_at" ON "price_list" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_price_list_org_name_unique" ON "price_list" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_org" ON "price_list_condition" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_price_list" ON "price_list_condition" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_list_org" ON "price_list_condition" USING btree ("price_list_id","organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_type" ON "price_list_condition" USING btree ("condition_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_status" ON "price_list_condition" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_valid_dates" ON "price_list_condition" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_created_at" ON "price_list_condition" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_list_cond_updated_at" ON "price_list_condition" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uk_product_price_org_list_product" ON "product_price" USING btree ("organization_id","price_list_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_active_prices" ON "product_price" USING btree ("organization_id","price_list_id","product_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_created" ON "product_price" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_created_at" ON "product_price" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_currency" ON "product_price" USING btree ("currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_date_range" ON "product_price" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_default_list" ON "product_price" USING btree ("organization_id","price_list_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_expiring" ON "product_price" USING btree ("organization_id","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_items_covering" ON "product_price" USING btree ("organization_id","price_list_id","id","product_id","currency","amount","tax_included","valid_from","valid_to","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_org_currency" ON "product_price" USING btree ("organization_id","currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_org_id" ON "product_price" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_org_list" ON "product_price" USING btree ("organization_id","price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_org_pricelist" ON "product_price" USING btree ("organization_id","price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_org_product" ON "product_price" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_organization_id" ON "product_price" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_pricelist_id" ON "product_price" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_product_id" ON "product_price" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_product_list" ON "product_price" USING btree ("product_id","price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_product_org" ON "product_price" USING btree ("product_id","organization_id","price_list_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_price_unique" ON "product_price" USING btree ("organization_id","product_id","price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_updated_at" ON "product_price" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_valid_from" ON "product_price" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_valid_to" ON "product_price" USING btree ("valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_validity" ON "product_price" USING btree ("organization_id","product_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_price_with_dates" ON "product_price" USING btree ("organization_id","price_list_id","product_id","valid_from","valid_to");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uk_product_org_sku" ON "products" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_org_id" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_sku" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_status" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_type" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_brand" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_created_at" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_updated_at" ON "products" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_org_status" ON "products" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_created_at" ON "product_media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_organization" ON "product_media" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_position" ON "product_media" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_primary" ON "product_media" USING btree ("product_id","is_primary");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_product" ON "product_media" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_product_position" ON "product_media" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_type" ON "product_media" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_media_updated_at" ON "product_media" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_relations_organization_id_product_id_related_produc_key" ON "product_relations" USING btree ("organization_id","product_id","related_product_id","relation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_active" ON "product_relations" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_created_at" ON "product_relations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_organization" ON "product_relations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_position" ON "product_relations" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_product" ON "product_relations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_product_type" ON "product_relations" USING btree ("product_id","relation_type","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_related" ON "product_relations" USING btree ("related_product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_type" ON "product_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_relations_updated_at" ON "product_relations" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uk_inventory_location_org_code" ON "inventory_location" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_location_org_id" ON "inventory_location" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_location_type" ON "inventory_location" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_location_created_at" ON "inventory_location" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_location_updated_at" ON "inventory_location" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uk_inventory_level_org_product_location" ON "inventory_level" USING btree ("organization_id","product_id","location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_level_org_product" ON "inventory_level" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_level_location" ON "inventory_level" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_level_product" ON "inventory_level" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_level_created_at" ON "inventory_level" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_level_updated_at" ON "inventory_level" USING btree ("updated_at");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customization_groups" ADD CONSTRAINT "customization_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customization_fields" ADD CONSTRAINT "customization_fields_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customization_field_groups" ADD CONSTRAINT "customization_field_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;