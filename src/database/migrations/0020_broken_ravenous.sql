ALTER TABLE "cart_suggestions" ADD COLUMN "interaction_id" varchar(255);--> statement-breakpoint
CREATE INDEX "idx_cart_suggestions_cart_id" ON "cart_suggestions" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "idx_cart_suggestions_interaction_id" ON "cart_suggestions" USING btree ("interaction_id");--> statement-breakpoint
CREATE INDEX "idx_cart_suggestions_cart_interaction" ON "cart_suggestions" USING btree ("cart_id","interaction_id");