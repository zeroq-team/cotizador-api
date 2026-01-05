CREATE TABLE "communes" (
	"id" integer PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"roman_number" varchar(10),
	"code" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_addresses" ADD COLUMN "commune" varchar(100);--> statement-breakpoint
ALTER TABLE "communes" ADD CONSTRAINT "communes_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_communes_region_id" ON "communes" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_communes_name" ON "communes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_communes_code" ON "communes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_regions_name" ON "regions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_regions_code" ON "regions" USING btree ("code");--> statement-breakpoint
ALTER TABLE "delivery_addresses" DROP COLUMN "city";