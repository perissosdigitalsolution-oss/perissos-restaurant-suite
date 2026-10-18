CREATE TABLE "site_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"theme_fichier_id" uuid,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites_restaurant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"theme_id" varchar(64),
	"slug" varchar(64) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"statut" varchar(16) DEFAULT 'brouillon' NOT NULL,
	"url_publique" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theme_fichiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" varchar(64) NOT NULL,
	"chemin" varchar(255) NOT NULL,
	"contenu" text DEFAULT '' NOT NULL,
	"type" varchar(16) DEFAULT 'html' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"auteur" varchar(128) DEFAULT 'Perissos' NOT NULL,
	"version" varchar(16) DEFAULT '1.0.0' NOT NULL,
	"categorie" varchar(32) DEFAULT 'restaurant' NOT NULL,
	"preview_url" text,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_site_id_sites_restaurant_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites_restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_theme_fichier_id_theme_fichiers_id_fk" FOREIGN KEY ("theme_fichier_id") REFERENCES "public"."theme_fichiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites_restaurant" ADD CONSTRAINT "sites_restaurant_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_fichiers" ADD CONSTRAINT "theme_fichiers_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_pages_site_idx" ON "site_pages" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_restaurant_slug_idx" ON "sites_restaurant" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sites_restaurant_tenant_idx" ON "sites_restaurant" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "theme_fichiers_theme_idx" ON "theme_fichiers" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "themes_categorie_idx" ON "themes" USING btree ("categorie");