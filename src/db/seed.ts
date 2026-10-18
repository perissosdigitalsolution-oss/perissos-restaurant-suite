import "dotenv/config";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./client.js";
import {
  affectations,
  commandeLignes,
  commandes,
  comptes,
  employes,
  factures,
  menu,
  reservations,
  shifts,
  tables,
} from "./schema.js";
import { AdaptateurMock } from "../evergauzy/adaptateur-mock.js";

const MOT_DE_PASSE_DEMO = "demo1234";

const COMPTES_DEMO: Array<{ employeId: string; email: string }> = [
  { employeId: "EMP-01", email: "amadou.ba@perissos.ci" },
  { employeId: "EMP-02", email: "awa.kone@perissos.ci" },
  { employeId: "EMP-04", email: "mariam.toure@perissos.ci" },
  { employeId: "EMP-06", email: "bintou.sanogo@perissos.ci" },
  { employeId: "EMP-07", email: "serge.kouadio@perissos.ci" },
];

async function seed(): Promise<void> {
  await db.execute(sql`TRUNCATE commande_lignes, commandes, affectations, shifts, employes, factures, reservations, menu, tables, comptes RESTART IDENTITY CASCADE`);
  const mock = new AdaptateurMock();
  const [listeTables, listeMenu, listeEmployes, listeReservations, listeFactures, listeCommandes, listeAffectations, listePlanning] =
    await Promise.all([
      mock.listerTables(),
      mock.listerMenu(),
      mock.listerEmployes(),
      mock.listerReservations({}),
      mock.listerFactures("2020-01-01", "2030-12-31"),
      mock.listerCommandes({}),
      mock.listerAffectations(new Date().toISOString().slice(0, 10)),
      mock.listerPlanning("2020-01-01", "2030-12-31"),
    ]);

  for (const table of listeTables) {
    await db.insert(tables).values(table);
  }
  console.log(`✓ ${listeTables.length} tables`);

  for (const plat of listeMenu) {
    await db.insert(menu).values(plat);
  }
  console.log(`✓ ${listeMenu.length} plats`);

  for (const employe of listeEmployes) {
    await db.insert(employes).values({
      ...employe,
      creeLe: new Date(employe.creeLe),
    });
  }
  console.log(`✓ ${listeEmployes.length} employés`);

  for (const reservation of listeReservations) {
    await db.insert(reservations).values({
      code: reservation.code,
      date: reservation.date,
      heure: reservation.heure,
      nombrePersonnes: reservation.nombrePersonnes,
      nomClient: reservation.nomClient,
      telephone: reservation.telephone,
      tableId: reservation.tableId,
      statut: reservation.statut,
      notes: reservation.notes,
      creeLe: new Date(reservation.creeLe),
    });
  }
  console.log(`✓ ${listeReservations.length} réservations`);

  for (const facture of listeFactures) {
    await db.insert(factures).values({
      id: facture.id,
      date: facture.date,
      montantTotal: facture.montantTotal,
      statut: facture.statut,
      lignes: facture.lignes,
    });
  }
  console.log(`✓ ${listeFactures.length} factures`);

  for (const commande of listeCommandes) {
    await db.insert(commandes).values({
      id: commande.id,
      date: commande.date,
      heure: commande.heure,
      tableId: commande.tableId,
      reservationCode: commande.reservationCode,
      serveurId: commande.serveurId,
      cuisinierId: commande.cuisinierId,
      statut: commande.statut,
      montantTotal: commande.montantTotal,
      creeLe: new Date(commande.creeLe),
    });
    for (const [position, ligne] of commande.lignes.entries()) {
      await db.insert(commandeLignes).values({
        commandeId: commande.id,
        plat: ligne.plat,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prix,
        notes: ligne.notes,
        position,
      });
    }
  }
  console.log(`✓ ${listeCommandes.length} commandes`);

  for (const affectation of listeAffectations) {
    await db.insert(affectations).values({
      date: affectation.date,
      reservationCode: affectation.reservationCode,
      serveurId: affectation.serveurId,
      creeLe: new Date(affectation.creeLe),
    });
  }
  console.log(`✓ ${listeAffectations.length} affectations`);

  for (const shift of listePlanning) {
    await db.insert(shifts).values({
      ...shift,
      creeLe: new Date(),
    });
  }
  console.log(`✓ ${listePlanning.length} shifts`);

  await db.execute(sql`
    SELECT setval('employe_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM employes), 0) + 1, false)
  `);
  await db.execute(sql`
    SELECT setval('commande_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM commandes), 0) + 1, false)
  `);
  await db.execute(sql`
    SELECT setval('shift_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)) FROM shifts), 0) + 1, false)
  `);
  console.log("✓ séquences synchronisées");

  const motDePasseHash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);
  for (const compte of COMPTES_DEMO) {
    await db.insert(comptes).values({
      employeId: compte.employeId,
      email: compte.email,
      motDePasseHash,
    });
  }
  console.log(`✓ ${COMPTES_DEMO.length} comptes (mot de passe démo : ${MOT_DE_PASSE_DEMO})`);

  console.log("\nSeed terminé avec succès.");
}

seed().catch((erreur) => {
  console.error("Erreur seed:", erreur);
  process.exit(1);
});
