CREATE TABLE "comptes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employe_id" varchar(16) NOT NULL,
	"email" varchar(255) NOT NULL,
	"mot_de_passe_hash" varchar(255) NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"dernier_acces" timestamp with time zone,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_employe_id_employes_id_fk" FOREIGN KEY ("employe_id") REFERENCES "public"."employes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comptes_email_idx" ON "comptes" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS employe_id_seq START WITH 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS commande_id_seq START WITH 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS shift_id_seq START WITH 1;