CREATE TABLE "affectations" (
	"date" varchar(10) NOT NULL,
	"reservation_code" varchar(16) NOT NULL,
	"serveur_id" varchar(16) NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affectations_date_reservation_code_pk" PRIMARY KEY("date","reservation_code")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"telephone" varchar(32) NOT NULL,
	"email" text,
	"passages" integer DEFAULT 0 NOT NULL,
	"points_fidelite" integer DEFAULT 0 NOT NULL,
	"derniere_date" varchar(10),
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commande_lignes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_id" varchar(16) NOT NULL,
	"plat" text NOT NULL,
	"quantite" integer NOT NULL,
	"prix_unitaire" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commandes" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"heure" varchar(5) NOT NULL,
	"table_id" varchar(16),
	"reservation_code" varchar(16),
	"serveur_id" varchar(16),
	"cuisinier_id" varchar(16),
	"statut" varchar(16) DEFAULT 'EN_ATTENTE' NOT NULL,
	"montant_total" integer DEFAULT 0 NOT NULL,
	"idempotency_key" varchar(128),
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employes" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"fonction" varchar(16) NOT NULL,
	"telephone" varchar(32) NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"montant_total" integer NOT NULL,
	"statut" varchar(16) DEFAULT 'payee' NOT NULL,
	"lignes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evergauzy_id" varchar(64),
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"categorie" varchar(24) NOT NULL,
	"prix" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"niveau_piment" integer DEFAULT 0 NOT NULL,
	"allergenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"disponible" boolean DEFAULT true NOT NULL,
	"stock_portions" integer,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entite" varchar(32) NOT NULL,
	"entite_id" varchar(64) NOT NULL,
	"operation" varchar(16) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"statut" varchar(16) DEFAULT 'pending' NOT NULL,
	"tentatives" integer DEFAULT 0 NOT NULL,
	"erreur" text,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"code" varchar(16) PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"heure" varchar(5) NOT NULL,
	"nombre_personnes" integer NOT NULL,
	"nom_client" text NOT NULL,
	"telephone" varchar(32) NOT NULL,
	"table_id" varchar(16),
	"statut" varchar(16) DEFAULT 'CONFIRMEE' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"evergauzy_id" varchar(64),
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"employe_id" varchar(16) NOT NULL,
	"debut" varchar(5) NOT NULL,
	"fin" varchar(5) NOT NULL,
	"poste" varchar(16) NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL,
	"sync_status" varchar(16) DEFAULT 'synced' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entite" varchar(32) NOT NULL,
	"entite_id" varchar(64) NOT NULL,
	"operation" varchar(16) NOT NULL,
	"sens" varchar(16) NOT NULL,
	"statut" varchar(16) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"capacite" integer NOT NULL,
	"emplacement" varchar(16) NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'tenant-perissos' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commande_lignes" ADD CONSTRAINT "commande_lignes_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affectations_serveur_idx" ON "affectations" USING btree ("date","serveur_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_telephone_idx" ON "clients" USING btree ("tenant_id","telephone");--> statement-breakpoint
CREATE INDEX "commande_lignes_commande_idx" ON "commande_lignes" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "commandes_date_idx" ON "commandes" USING btree ("date","statut");--> statement-breakpoint
CREATE INDEX "commandes_serveur_idx" ON "commandes" USING btree ("serveur_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commandes_idempotency_idx" ON "commandes" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "employes_fonction_idx" ON "employes" USING btree ("fonction");--> statement-breakpoint
CREATE INDEX "factures_date_idx" ON "factures" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idempotency_idx" ON "outbox_sync" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_statut_idx" ON "outbox_sync" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "reservations_date_idx" ON "reservations" USING btree ("date","statut");--> statement-breakpoint
CREATE INDEX "shifts_date_idx" ON "shifts" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sync_log_entite_idx" ON "sync_log" USING btree ("entite","entite_id");