ALTER TABLE "review" DROP CONSTRAINT "review_reviewed_boat_id_boat_id_fk";
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_reviewed_boat_id_boat_id_fk" FOREIGN KEY ("reviewed_boat_id") REFERENCES "public"."boat"("id") ON DELETE cascade ON UPDATE no action;