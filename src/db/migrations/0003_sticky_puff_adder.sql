ALTER TABLE "commandes" ADD COLUMN "mode" varchar(16) DEFAULT 'sur_place' NOT NULL;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "adresse_livraison" text;