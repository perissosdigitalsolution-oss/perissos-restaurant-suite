import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tenantId = varchar("tenant_id", { length: 64 }).notNull().default("tenant-perissos");
export const syncStatus = varchar("sync_status", { length: 16 }).notNull().default("synced");
export const creeLe = timestamp("cree_le", { withTimezone: true }).notNull().defaultNow();
export const majLe = timestamp("maj_le", { withTimezone: true }).notNull().defaultNow();

export const tables = pgTable("tables", {
  id: varchar("id", { length: 16 }).primaryKey(),
  nom: text("nom").notNull(),
  capacite: integer("capacite").notNull(),
  emplacement: varchar("emplacement", { length: 16 }).notNull(),
  tenantId,
});

export const menu = pgTable("menu", {
  id: varchar("id", { length: 16 }).primaryKey(),
  nom: text("nom").notNull(),
  categorie: varchar("categorie", { length: 24 }).notNull(),
  prix: integer("prix").notNull(),
  description: text("description").notNull().default(""),
  niveauPiment: integer("niveau_piment").notNull().default(0),
  allergenes: jsonb("allergenes").$type<string[]>().notNull().default([]),
  disponible: boolean("disponible").notNull().default(true),
  stockPortions: integer("stock_portions"),
  tenantId,
  majLe,
});

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nom: text("nom").notNull(),
    telephone: varchar("telephone", { length: 32 }).notNull(),
    email: text("email"),
    passages: integer("passages").notNull().default(0),
    pointsFidelite: integer("points_fidelite").notNull().default(0),
    derniereDate: varchar("derniere_date", { length: 10 }),
    tenantId,
    majLe,
  },
  (table) => [uniqueIndex("clients_telephone_idx").on(table.tenantId, table.telephone)]
);

export const reservations = pgTable(
  "reservations",
  {
    code: varchar("code", { length: 16 }).primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    heure: varchar("heure", { length: 5 }).notNull(),
    nombrePersonnes: integer("nombre_personnes").notNull(),
    nomClient: text("nom_client").notNull(),
    telephone: varchar("telephone", { length: 32 }).notNull(),
    tableId: varchar("table_id", { length: 16 }),
    statut: varchar("statut", { length: 16 }).notNull().default("CONFIRMEE"),
    notes: text("notes").notNull().default(""),
    evergauzyId: varchar("evergauzy_id", { length: 64 }),
    tenantId,
    syncStatus,
    creeLe,
    majLe,
  },
  (table) => [index("reservations_date_idx").on(table.date, table.statut)]
);

export const factures = pgTable(
  "factures",
  {
    id: varchar("id", { length: 16 }).primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    montantTotal: integer("montant_total").notNull(),
    statut: varchar("statut", { length: 16 }).notNull().default("payee"),
    lignes: jsonb("lignes").$type<Array<{ plat: string; quantite: number; montant: number }>>().notNull().default([]),
    evergauzyId: varchar("evergauzy_id", { length: 64 }),
    tenantId,
    syncStatus,
    majLe,
  },
  (table) => [index("factures_date_idx").on(table.date)]
);

export const employes = pgTable(
  "employes",
  {
    id: varchar("id", { length: 16 }).primaryKey(),
    nom: text("nom").notNull(),
    fonction: varchar("fonction", { length: 16 }).notNull(),
    telephone: varchar("telephone", { length: 32 }).notNull(),
    actif: boolean("actif").notNull().default(true),
    tenantId,
    syncStatus,
    creeLe,
  },
  (table) => [index("employes_fonction_idx").on(table.fonction)]
);

export const commandes = pgTable(
  "commandes",
  {
    id: varchar("id", { length: 16 }).primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    heure: varchar("heure", { length: 5 }).notNull(),
    tableId: varchar("table_id", { length: 16 }),
    reservationCode: varchar("reservation_code", { length: 16 }),
    serveurId: varchar("serveur_id", { length: 16 }),
    cuisinierId: varchar("cuisinier_id", { length: 16 }),
    statut: varchar("statut", { length: 16 }).notNull().default("EN_ATTENTE"),
    mode: varchar("mode", { length: 16 }).notNull().default("sur_place"),
    adresseLivraison: text("adresse_livraison"),
    montantTotal: integer("montant_total").notNull().default(0),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    tenantId,
    syncStatus,
    creeLe,
    majLe,
  },
  (table) => [
    index("commandes_date_idx").on(table.date, table.statut),
    index("commandes_serveur_idx").on(table.serveurId),
    uniqueIndex("commandes_idempotency_idx").on(table.idempotencyKey),
  ]
);

export const comptes = pgTable(
  "comptes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeId: varchar("employe_id", { length: 16 })
      .notNull()
      .references(() => employes.id),
    email: varchar("email", { length: 255 }).notNull(),
    motDePasseHash: varchar("mot_de_passe_hash", { length: 255 }).notNull(),
    actif: boolean("actif").notNull().default(true),
    dernierAcces: timestamp("dernier_acces", { withTimezone: true }),
    tenantId,
    syncStatus,
    creeLe,
    majLe,
  },
  (table) => [uniqueIndex("comptes_email_idx").on(table.tenantId, table.email)]
);


export const commandeLignes = pgTable(
  "commande_lignes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commandeId: varchar("commande_id", { length: 16 })
      .notNull()
      .references(() => commandes.id),
    plat: text("plat").notNull(),
    quantite: integer("quantite").notNull(),
    prixUnitaire: integer("prix_unitaire").notNull(),
    notes: text("notes").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("commande_lignes_commande_idx").on(table.commandeId)]
);

export const affectations = pgTable(
  "affectations",
  {
    date: varchar("date", { length: 10 }).notNull(),
    reservationCode: varchar("reservation_code", { length: 16 }).notNull(),
    serveurId: varchar("serveur_id", { length: 16 }).notNull(),
    tenantId,
    syncStatus,
    creeLe,
  },
  (table) => [
    primaryKey({ columns: [table.date, table.reservationCode] }),
    index("affectations_serveur_idx").on(table.date, table.serveurId),
  ]
);

export const shifts = pgTable(
  "shifts",
  {
    id: varchar("id", { length: 16 }).primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    employeId: varchar("employe_id", { length: 16 }).notNull(),
    debut: varchar("debut", { length: 5 }).notNull(),
    fin: varchar("fin", { length: 5 }).notNull(),
    poste: varchar("poste", { length: 16 }).notNull(),
    tenantId,
    syncStatus,
    creeLe,
  },
  (table) => [index("shifts_date_idx").on(table.date)]
);

export const outboxSync = pgTable(
  "outbox_sync",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entite: varchar("entite", { length: 32 }).notNull(),
    entiteId: varchar("entite_id", { length: 64 }).notNull(),
    operation: varchar("operation", { length: 16 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    statut: varchar("statut", { length: 16 }).notNull().default("pending"),
    tentatives: integer("tentatives").notNull().default(0),
    erreur: text("erreur"),
    tenantId,
    creeLe,
    syncLe: timestamp("sync_le", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("outbox_idempotency_idx").on(table.idempotencyKey),
    index("outbox_statut_idx").on(table.statut),
  ]
);

export const syncLog = pgTable(
  "sync_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entite: varchar("entite", { length: 32 }).notNull(),
    entiteId: varchar("entite_id", { length: 64 }).notNull(),
    operation: varchar("operation", { length: 16 }).notNull(),
    sens: varchar("sens", { length: 16 }).notNull(),
    statut: varchar("statut", { length: 16 }).notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    creeLe,
  },
  (table) => [index("sync_log_entite_idx").on(table.entite, table.entiteId)]
);

export const themes = pgTable(
  "themes",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    nom: text("nom").notNull(),
    description: text("description").notNull().default(""),
    auteur: varchar("auteur", { length: 128 }).notNull().default("Perissos"),
    version: varchar("version", { length: 16 }).notNull().default("1.0.0"),
    categorie: varchar("categorie", { length: 32 }).notNull().default("restaurant"),
    previewUrl: text("preview_url"),
    actif: boolean("actif").notNull().default(true),
    creeLe,
  },
  (table) => [index("themes_categorie_idx").on(table.categorie)]
);

export const themeFichiers = pgTable(
  "theme_fichiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    themeId: varchar("theme_id", { length: 64 })
      .notNull()
      .references(() => themes.id),
    chemin: varchar("chemin", { length: 255 }).notNull(),
    contenu: text("contenu").notNull().default(""),
    type: varchar("type", { length: 16 }).notNull().default("html"),
    ordre: integer("ordre").notNull().default(0),
  },
  (table) => [index("theme_fichiers_theme_idx").on(table.themeId)]
);

export const sitesRestaurant = pgTable(
  "sites_restaurant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId,
    themeId: varchar("theme_id", { length: 64 }).references(() => themes.id),
    slug: varchar("slug", { length: 64 }).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    statut: varchar("statut", { length: 16 }).notNull().default("brouillon"),
    urlPublique: text("url_publique"),
    creeLe,
    majLe,
  },
  (table) => [
    uniqueIndex("sites_restaurant_slug_idx").on(table.slug),
    index("sites_restaurant_tenant_idx").on(table.tenantId),
  ]
);

export const sitePages = pgTable(
  "site_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sitesRestaurant.id),
    slug: varchar("slug", { length: 64 }).notNull(),
    themeFichierId: uuid("theme_fichier_id").references(() => themeFichiers.id),
    ordre: integer("ordre").notNull().default(0),
  },
  (table) => [index("site_pages_site_idx").on(table.siteId)]
);
