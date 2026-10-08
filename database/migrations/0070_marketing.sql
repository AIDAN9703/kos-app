CREATE TYPE "public"."MarketingCampaignStatus" AS ENUM('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "marketing_campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"preview_text" text DEFAULT '' NOT NULL,
	"heading" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"image_url" text,
	"button_label" text,
	"button_url" text,
	"audience" text DEFAULT 'ALL' NOT NULL,
	"status" "MarketingCampaignStatus" DEFAULT 'DRAFT' NOT NULL,
	"resend_broadcast_id" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"recipient_count" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"source" text NOT NULL,
	"user_id" uuid,
	"unsubscribed_at" timestamp with time zone,
	"resend_contact_id" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN "mailing_address" text;--> statement-breakpoint
ALTER TABLE "marketing_campaign" ADD CONSTRAINT "marketing_campaign_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_contact" ADD CONSTRAINT "marketing_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_contact_email_unique" ON "marketing_contact" USING btree ("email");--> statement-breakpoint
CREATE INDEX "marketing_contact_source_idx" ON "marketing_contact" USING btree ("source");--> statement-breakpoint
CREATE INDEX "marketing_contact_user_idx" ON "marketing_contact" USING btree ("user_id");