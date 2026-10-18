import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../client.js";
import { commandes, outboxSync, menu, employes, tables } from "../schema.js";
import { eq, sql } from "drizzle-orm";
import { AdaptateurPostgres } from "../../evergauzy/adaptateur-postgres.js";
import { AdaptateurMock } from "../../evergauzy/adaptateur-mock.js";
import { toISODate } from "../../utils.js";

const adaptateur = new AdaptateurPostgres();

async function seedMinimal(): Promise<void> {
  const mock = new AdaptateurMock();
  const [listeTables, listeMenu, listeEmployes] = await Promise.all([
    mock.listerTables(),
    mock.listerMenu(),
    mock.listerEmployes(),
  ]);
  for (const table of listeTables) {
    await db.insert(tables).values(table);
  }
  for (const plat of listeMenu) {
    await db.insert(menu).values(plat);
  }
  for (const employe of listeEmployes) {
    await db.insert(employes).values({ ...employe, creeLe: new Date(employe.creeLe) });
  }
  await db.execute(sql.raw(`
    SELECT setval('employe_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM employes), 0) + 1, false)
  `));
  await db.execute(sql.raw(`
    SELECT setval('commande_id_seq', 1, false)
  `));
  await db.execute(sql.raw(`
    SELECT setval('shift_id_seq', 1, false)
  `));
}

beforeAll(async () => {
  await db.execute(
    `TRUNCATE commande_lignes, commandes, affectations, shifts, employes, factures, reservations, menu, tables, outbox_sync RESTART IDENTITY CASCADE`
  );
  await seedMinimal();
});

afterAll(async () => {
  await db.execute(
    `TRUNCATE commande_lignes, commandes, affectations, shifts, employes, factures, reservations, menu, tables, outbox_sync RESTART IDENTITY CASCADE`
  );
});

describe("AdaptateurPostgres — CRUD tables", () => {
  it("listerTables retourne les tables", async () => {
    const tables = await adaptateur.listerTables();
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0]).toHaveProperty("id");
    expect(tables[0]).toHaveProperty("nom");
  });
});

describe("AdaptateurPostgres — CRUD menu", () => {
  it("listerMenu retourne les plats", async () => {
    const menu = await adaptateur.listerMenu();
    expect(menu.length).toBeGreaterThan(0);
    expect(menu[0]).toHaveProperty("nom");
    expect(menu[0]).toHaveProperty("prix");
  });

  it("obtenirPlat trouve par nom", async () => {
    const plat = await adaptateur.obtenirPlat("Poulet braisé");
    expect(plat).not.toBeNull();
    expect(plat!.nom).toBe("Poulet braisé");
  });

  it("obtenirPlat retourne null pour un plat inconnu", async () => {
    const plat = await adaptateur.obtenirPlat("Plat Inconnu XYZ");
    expect(plat).toBeNull();
  });
});

describe("AdaptateurPostgres — CRUD réservations", () => {
  it("créer + lister une réservation", async () => {
    const demain = toISODate(new Date(Date.now() + 86400000));
    const cree = await adaptateur.creerReservation({
      date: demain,
      heure: "19:30",
      nombrePersonnes: 4,
      nomClient: "Client Test",
      telephone: "+225 07 00 00 00 00",
    });
    expect(cree.code).toMatch(/^PRS-/);
    expect(cree.statut).toBe("CONFIRMEE");

    const liste = await adaptateur.listerReservations({ dateDebut: demain, dateFin: demain });
    expect(liste.some((r) => r.code === cree.code)).toBe(true);
  });

  it("annuler une réservation", async () => {
    const demain = toISODate(new Date(Date.now() + 86400000));
    const cree = await adaptateur.creerReservation({
      date: demain,
      heure: "20:00",
      nombrePersonnes: 2,
      nomClient: "Client Annulation",
      telephone: "+225 07 11 11 11 11",
    });
    const annulee = await adaptateur.annulerReservation(cree.code, cree.telephone);
    expect(annulee.statut).toBe("ANNULLEE");
  });
});

describe("AdaptateurPostgres — CRUD employés", () => {
  it("créer + lister un employé", async () => {
    const employe = await adaptateur.creerEmploye({
      nom: "Test Employé",
      fonction: "serveur",
      telephone: "+225 07 22 22 22 22",
    });
    expect(employe.id).toMatch(/^EMP-/);
    expect(employe.actif).toBe(true);

    const liste = await adaptateur.listerEmployes();
    expect(liste.some((e) => e.id === employe.id)).toBe(true);
  });

  it("refuse une fonction invalide", async () => {
    await expect(
      adaptateur.creerEmploye({ nom: "Test", fonction: "invalid" as never, telephone: "+225 07 33 33 33 33" })
    ).rejects.toThrow();
  });
});

describe("AdaptateurPostgres — CRUD commandes", () => {
  it("créer une commande avec lignes", async () => {
    const commande = await adaptateur.creerCommande({
      tableId: "T2",
      serveurId: "EMP-02",
      lignes: [{ plat: "Alloco", quantite: 2 }],
    });
    expect(commande.id).toMatch(/^CMD-/);
    expect(commande.statut).toBe("EN_ATTENTE");
    expect(commande.lignes.length).toBe(1);
    expect(commande.lignes[0].plat).toBe("Alloco");
    expect(commande.montantTotal).toBeGreaterThan(0);
  });

  it("majStatutCommande change le statut", async () => {
    const commande = await adaptateur.creerCommande({
      lignes: [{ plat: "Jus de bissap", quantite: 1 }],
    });
    const maj = await adaptateur.majStatutCommande(commande.id, "EN_CUISINE");
    expect(maj.statut).toBe("EN_CUISINE");
  });

  it("assignerCommande assigne un cuisinier", async () => {
    const commande = await adaptateur.creerCommande({
      lignes: [{ plat: "Riz gras", quantite: 1 }],
    });
    const assignee = await adaptateur.assignerCommande(commande.id, { cuisinierId: "EMP-04" });
    expect(assignee.cuisinierId).toBe("EMP-04");
  });
});

describe("Idempotence", () => {
  it("rejouer une création avec la même idempotency_key ne crée pas de doublon", async () => {
    const key = `test-idempotence-${Date.now()}`;
    const entree = {
      tableId: "T3",
      serveurId: "EMP-02",
      lignes: [{ plat: "Attiéké", quantite: 1 }],
      idempotencyKey: key,
    };

    await adaptateur.creerCommande(entree);
    await adaptateur.creerCommande(entree);

    const rows = await db.select().from(commandes).where(eq(commandes.idempotencyKey, key));
    expect(rows.length).toBe(1);
  });
});

describe("Résilience Ever Gauzy", () => {
  it("majStatutCommande PAYEE écrit dans outbox_sync", async () => {
    const commande = await adaptateur.creerCommande({
      lignes: [{ plat: "Eau minérale (50cl)", quantite: 2 }],
    });
    await adaptateur.majStatutCommande(commande.id, "SERVIE");
    await adaptateur.majStatutCommande(commande.id, "PAYEE");

    const rows = await db.select().from(outboxSync).where(eq(outboxSync.idempotencyKey, `facture-${commande.id}`));
    expect(rows.length).toBe(1);
    expect(rows[0].statut).toBe("pending");
  });
});
