CREATE TABLE "stripe_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"livemode" boolean NOT NULL,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "refunded_payment_id" uuid;--> statement-breakpoint
CREATE INDEX "stripe_event_type_idx" ON "stripe_event" USING btree ("type");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_refunded_payment_id_payment_id_fk" FOREIGN KEY ("refunded_payment_id") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_stripe_session_idx" ON "payment" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_stripe_checkout_session_unique" UNIQUE("stripe_checkout_session_id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_stripe_refund_unique" UNIQUE("stripe_refund_id","refunded_payment_id");