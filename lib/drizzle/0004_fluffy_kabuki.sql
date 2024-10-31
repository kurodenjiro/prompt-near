ALTER TABLE "Tool" ADD COLUMN "args" json;--> statement-breakpoint
ALTER TABLE "Tool" ADD COLUMN "typeMethod" varchar(64);--> statement-breakpoint
ALTER TABLE "Tool" ADD COLUMN "methods" varchar(256);--> statement-breakpoint
ALTER TABLE "Tool" ADD COLUMN "network" varchar(64);--> statement-breakpoint
ALTER TABLE "Tool" ADD COLUMN "chain" varchar(64);--> statement-breakpoint
ALTER TABLE "Tool" DROP COLUMN IF EXISTS "params";--> statement-breakpoint
ALTER TABLE "Tool" DROP COLUMN IF EXISTS "type_params";--> statement-breakpoint
ALTER TABLE "Tool" DROP COLUMN IF EXISTS "functions";--> statement-breakpoint
ALTER TABLE "Tool" DROP COLUMN IF EXISTS "typeFunction";