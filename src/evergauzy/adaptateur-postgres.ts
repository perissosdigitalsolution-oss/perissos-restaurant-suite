import { eq, and, gte, lte, sql, like } from "drizzle-orm";
import type {
  AffectationRecord,
  CommandeAssignationInput,
  CommandeCreeInput,
  CommandeFiltre,
  CommandeRecord,
  DisponibiliteResultat,
  EmployeCreeInput,
  EmployeRecord,
  Emplacement,
  FactureRecord,
  FonctionEmploye,
  LigneCommande,
  LigneFacture,
  PlatMenu,
  CategorieMenu,
  PosteShift,
  ReservationCreeInput,
  ReservationFiltre,
  ReservationModifInput,
  ReservationRecord,
  ShiftCreeInput,
  ShiftRecord,
  StatutCommande,
  ModeCommande,
  StatutReservation,
  TableInfo,
} from "../types.js";
import type { AdaptateurDonneesRestaurant } from "./adaptateur.js";
import { calculerDisponibilite } from "./disponibilite.js";
import { db } from "../db/client.js";
import {
  affectations,
  commandeLignes,
  commandes,
  employes,
  menu,
  reservations,
  shifts,
  tables,
  factures,
  outboxSync,
} from "../db/schema.js";
import type { PgTransaction } from "drizzle-orm/pg-core";
import {
  ajouterJours,
  genererCodeReservation,
  heureEnMinutes,
  heureValide,
  normaliserTelephone,
  toISODate,
} from "../utils.js";

const FONCTIONS_VALIDES: FonctionEmploye[] = ["patron", "serveur", "cuisinier", "barman", "caissier"];
const POSTES_VALIDES: PosteShift[] = ["salle", "cuisine", "bar", "caisse"];

export class AdaptateurPostgres implements AdaptateurDonneesRestaurant {
  async listerTables(): Promise<TableInfo[]> {
    const lignes = await db.select().from(tables).orderBy(tables.id);
    return lignes.map((ligne) => ({
      id: ligne.id,
      nom: ligne.nom,
      capacite: ligne.capacite,
      emplacement: ligne.emplacement as Emplacement,
    }));
  }

  async verifierDisponibilite(date: string, heure: string, nombrePersonnes: number): Promise<DisponibiliteResultat> {
    this.validerEntrees(date, heure, nombrePersonnes);
    const listeTables = await this.listerTables();
    const listeReservations = await db.select().from(reservations).where(eq(reservations.date, date));
    const resultat = calculerDisponibilite(
      listeTables,
      listeReservations.map((reservation) => this.hydraterReservation(reservation)),
      date,
      heure,
      nombrePersonnes
    );
    return { date, heure, nombrePersonnes, ...resultat };
  }

  async creerReservation(entree: ReservationCreeInput): Promise<ReservationRecord> {
    this.validerEntrees(entree.date, entree.heure, entree.nombrePersonnes);
    if (!entree.nomClient || entree.nomClient.trim().length === 0) {
      throw new Error("Le nom du client est obligatoire pour créer une réservation.");
    }
    if (!entree.telephone || entree.telephone.trim().length === 0) {
      throw new Error("Le numéro de téléphone du client est obligatoire pour créer une réservation.");
    }
    if (entree.date < toISODate(new Date())) {
      throw new Error("Impossible de créer une réservation pour une date passée.");
    }
    const listeTables = await this.listerTables();
    const listeReservations = await db.select().from(reservations).where(eq(reservations.date, entree.date));
    const disponibilite = calculerDisponibilite(
      listeTables,
      listeReservations.map((reservation) => this.hydraterReservation(reservation)),
      entree.date,
      entree.heure,
      entree.nombrePersonnes
    );
    if (!disponibilite.tableRecommandee) {
      const alternatives = disponibilite.creneauxAlternatifs.map((creneau) => creneau.heure).join(", ");
      throw new Error(
        `Plus aucune table de ${entree.nombrePersonnes} couverts le ${entree.date} à ${entree.heure}. Créneaux proches disponibles : ${alternatives || "aucun"}.`
      );
    }
    const code = await this.nouveauCodeReservation();
    const maintenant = new Date();
    await db.insert(reservations).values({
      code,
      date: entree.date,
      heure: entree.heure,
      nombrePersonnes: entree.nombrePersonnes,
      nomClient: entree.nomClient.trim(),
      telephone: normaliserTelephone(entree.telephone),
      tableId: disponibilite.tableRecommandee.id,
      statut: "CONFIRMEE",
      notes: entree.notes ?? "",
      creeLe: maintenant,
    });
    return {
      code,
      date: entree.date,
      heure: entree.heure,
      nombrePersonnes: entree.nombrePersonnes,
      nomClient: entree.nomClient.trim(),
      telephone: normaliserTelephone(entree.telephone),
      tableId: disponibilite.tableRecommandee.id,
      statut: "CONFIRMEE",
      notes: entree.notes ?? "",
      creeLe: toISODate(maintenant),
    };
  }

  async rechercherReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]> {
    const conditions = [];
    if (filtre.code) {
      conditions.push(eq(reservations.code, filtre.code.toUpperCase()));
    }
    if (filtre.telephone) {
      const telephone = normaliserTelephone(filtre.telephone);
      conditions.push(eq(reservations.telephone, telephone));
    }
    if (filtre.nom) {
      conditions.push(like(reservations.nomClient, `%${filtre.nom}%`));
    }
    const liste = await db.select().from(reservations).where(conditions.length ? and(...conditions) : undefined);
    return liste.map((reservation) => this.hydraterReservation(reservation));
  }

  async modifierReservation(code: string, telephone: string, changements: ReservationModifInput): Promise<ReservationRecord> {
    const reservation = await this.trouverReservationActive(code);
    if (reservation.telephone !== normaliserTelephone(telephone)) {
      throw new Error(`Le numéro de téléphone ne correspond pas à la réservation ${reservation.code}.`);
    }
    const nouvelleDate = changements.date ?? reservation.date;
    const nouvelleHeure = changements.heure ?? reservation.heure;
    const nouveauNombre = changements.nombrePersonnes ?? reservation.nombrePersonnes;
    this.validerEntrees(nouvelleDate, nouvelleHeure, nouveauNombre);
    if (nouvelleDate < toISODate(new Date())) {
      throw new Error("Impossible de déplacer une réservation vers une date passée.");
    }
    const listeTables = await this.listerTables();
    const listeReservations = await db.select().from(reservations).where(eq(reservations.date, nouvelleDate));
    const autres = listeReservations.filter((element) => element.code !== reservation.code);
    const disponibilite = calculerDisponibilite(
      listeTables,
      autres.map((element) => this.hydraterReservation(element)),
      nouvelleDate,
      nouvelleHeure,
      nouveauNombre
    );
    if (!disponibilite.tableRecommandee) {
      const alternatives = disponibilite.creneauxAlternatifs.map((creneau) => creneau.heure).join(", ");
      throw new Error(
        `Impossible de déplacer la réservation ${reservation.code} : aucune table de ${nouveauNombre} couverts le ${nouvelleDate} à ${nouvelleHeure}. Créneaux proches : ${alternatives || "aucun"}.`
      );
    }
    await db
      .update(reservations)
      .set({
        date: nouvelleDate,
        heure: nouvelleHeure,
        nombrePersonnes: nouveauNombre,
        tableId: disponibilite.tableRecommandee.id,
        notes: changements.notes ?? reservation.notes,
        majLe: new Date(),
      })
      .where(eq(reservations.code, reservation.code));
    return {
      ...reservation,
      date: nouvelleDate,
      heure: nouvelleHeure,
      nombrePersonnes: nouveauNombre,
      tableId: disponibilite.tableRecommandee.id,
      notes: changements.notes ?? reservation.notes,
    };
  }

  async annulerReservation(code: string, telephone: string): Promise<ReservationRecord> {
    const reservation = await this.trouverReservationActive(code);
    if (reservation.telephone !== normaliserTelephone(telephone)) {
      throw new Error(`Le numéro de téléphone ne correspond pas à la réservation ${reservation.code}.`);
    }
    await db.update(reservations).set({ statut: "ANNULLEE", majLe: new Date() }).where(eq(reservations.code, reservation.code));
    return { ...reservation, statut: "ANNULLEE" };
  }

  async listerReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]> {
    const conditions = [];
    if (filtre.dateDebut) conditions.push(gte(reservations.date, filtre.dateDebut));
    if (filtre.dateFin) conditions.push(lte(reservations.date, filtre.dateFin));
    if (filtre.statut) conditions.push(eq(reservations.statut, filtre.statut));
    const liste = await db
      .select()
      .from(reservations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(reservations.date, reservations.heure);
    return liste.map((reservation) => this.hydraterReservation(reservation));
  }

  async listerMenu(): Promise<PlatMenu[]> {
    const liste = await db.select().from(menu).orderBy(menu.id);
    return liste.map((plat) => this.hydraterMenu(plat));
  }

  async obtenirPlat(nomOuId: string): Promise<PlatMenu | null> {
    const recherche = nomOuId.trim().toLowerCase();
    const liste = await db.select().from(menu);
    const platExact = liste.find(
      (plat) => plat.nom.toLowerCase() === recherche || plat.id.toLowerCase() === recherche
    );
    const plat = platExact ?? liste.find((element) => element.nom.toLowerCase().includes(recherche));
    return plat ? this.hydraterMenu(plat) : null;
  }

  async listerFactures(dateDebut: string, dateFin: string): Promise<FactureRecord[]> {
    const liste = await db
      .select()
      .from(factures)
      .where(and(gte(factures.date, dateDebut), lte(factures.date, dateFin)))
      .orderBy(factures.date, factures.id);
    return liste.map((facture) => ({
      id: facture.id,
      date: facture.date,
      montantTotal: facture.montantTotal,
      statut: facture.statut as FactureRecord["statut"],
      lignes: [...facture.lignes],
    }));
  }

  async listerEmployes(): Promise<EmployeRecord[]> {
    const liste = await db.select().from(employes).orderBy(employes.id);
    return liste.map((employe) => ({
      id: employe.id,
      nom: employe.nom,
      fonction: employe.fonction as FonctionEmploye,
      telephone: employe.telephone,
      actif: employe.actif,
      creeLe: toISODate(employe.creeLe),
    }));
  }

  async creerEmploye(entree: EmployeCreeInput): Promise<EmployeRecord> {
    if (!entree.nom || entree.nom.trim().length < 2) {
      throw new Error("Le nom du membre d'équipe est obligatoire (au moins 2 caractères).");
    }
    if (!FONCTIONS_VALIDES.includes(entree.fonction)) {
      throw new Error(`Fonction inconnue : ${entree.fonction}. Valeurs acceptées : ${FONCTIONS_VALIDES.join(", ")}.`);
    }
    if (!entree.telephone || entree.telephone.trim().length < 8) {
      throw new Error("Le numéro de téléphone du membre d'équipe est obligatoire.");
    }
    const id = await this.nouvelId("employes", 2);
    const maintenant = new Date();
    const employe: EmployeRecord = {
      id,
      nom: entree.nom.trim(),
      fonction: entree.fonction,
      telephone: entree.telephone.trim(),
      actif: true,
      creeLe: toISODate(maintenant),
    };
    await db.insert(employes).values({ id, nom: employe.nom, fonction: employe.fonction, telephone: employe.telephone, creeLe: maintenant });
    return employe;
  }

  async listerCommandes(filtre: CommandeFiltre): Promise<CommandeRecord[]> {
    const conditions = [];
    if (filtre.date) conditions.push(eq(commandes.date, filtre.date));
    if (filtre.statut) conditions.push(eq(commandes.statut, filtre.statut));
    if (filtre.tableId) conditions.push(eq(commandes.tableId, filtre.tableId));
    if (filtre.serveurId) conditions.push(eq(commandes.serveurId, filtre.serveurId));
    const liste = await db
      .select()
      .from(commandes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(commandes.date, commandes.heure);
    return this.hydraterCommandes(liste);
  }

  async creerCommande(entree: CommandeCreeInput): Promise<CommandeRecord> {
    if (!entree.lignes || entree.lignes.length === 0) {
      throw new Error("Une commande doit contenir au moins une ligne (plat et quantité).");
    }
    const lignes: LigneCommande[] = [];
    for (const ligne of entree.lignes) {
      const plat = await this.obtenirPlat(ligne.plat);
      if (!plat) {
        throw new Error(`Plat introuvable dans la carte : ${ligne.plat}.`);
      }
      if (!Number.isInteger(ligne.quantite) || ligne.quantite < 1) {
        throw new Error(`Quantité invalide pour ${plat.nom} : utilisez un entier positif.`);
      }
      if (!plat.disponible || (plat.stockPortions !== null && plat.stockPortions < ligne.quantite)) {
        throw new Error(
          `${plat.nom} n'est pas disponible en ${ligne.quantite} portion(s)${plat.stockPortions !== null ? ` (stock : ${plat.stockPortions})` : ""}.`
        );
      }
      lignes.push({ plat: plat.nom, quantite: ligne.quantite, prix: plat.prix, notes: ligne.notes?.trim() ?? "" });
    }
    if (entree.tableId) {
      const tablesExistantes = await this.listerTables();
      if (!tablesExistantes.some((table) => table.id === entree.tableId)) {
        throw new Error(`Table introuvable : ${entree.tableId}.`);
      }
    }
    if (entree.reservationCode) {
      const existe = await db.select({ code: reservations.code }).from(reservations).where(eq(reservations.code, entree.reservationCode.toUpperCase()));
      if (existe.length === 0) throw new Error(`Réservation introuvable : ${entree.reservationCode}.`);
    }
    if (entree.serveurId) {
      const serveur = await db.select().from(employes).where(eq(employes.id, entree.serveurId));
      if (serveur.length === 0 || serveur[0].fonction !== "serveur") {
        throw new Error(`Serveur introuvable : ${entree.serveurId}.`);
      }
    }
    const maintenant = new Date();
    const commandeExistante = entree.idempotencyKey
      ? await db.select().from(commandes).where(eq(commandes.idempotencyKey, entree.idempotencyKey))
      : [];
    if (commandeExistante.length > 0) {
      return this.hydraterCommande(commandeExistante[0]);
    }
    const commande = await db.transaction(async (transaction) => {
      const id = await this.nouvelId("commandes", 4, transaction);
      const nouvelleCommande: CommandeRecord = {
        id,
        date: toISODate(maintenant),
        heure: `${String(maintenant.getHours()).padStart(2, "0")}:${String(maintenant.getMinutes()).padStart(2, "0")}`,
        tableId: entree.tableId ?? null,
        reservationCode: entree.reservationCode ?? null,
        serveurId: entree.serveurId ?? null,
        cuisinierId: null,
        statut: "EN_ATTENTE",
        mode: entree.mode ?? "sur_place",
        adresseLivraison: entree.adresseLivraison ?? null,
        lignes,
        montantTotal: lignes.reduce((total, ligne) => total + ligne.prix * ligne.quantite, 0),
        creeLe: toISODate(maintenant),
      };
      await transaction.insert(commandes).values({
        id: nouvelleCommande.id,
        date: nouvelleCommande.date,
        heure: nouvelleCommande.heure,
        tableId: nouvelleCommande.tableId,
        reservationCode: nouvelleCommande.reservationCode,
        serveurId: nouvelleCommande.serveurId,
        cuisinierId: nouvelleCommande.cuisinierId,
        statut: nouvelleCommande.statut,
        mode: nouvelleCommande.mode,
        adresseLivraison: nouvelleCommande.adresseLivraison,
        montantTotal: nouvelleCommande.montantTotal,
        idempotencyKey: entree.idempotencyKey ?? null,
        creeLe: maintenant,
      });
      for (const [position, ligne] of lignes.entries()) {
        await transaction.insert(commandeLignes).values({
          commandeId: nouvelleCommande.id,
          plat: ligne.plat,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prix,
          notes: ligne.notes,
          position,
        });
      }
      for (const ligne of lignes) {
        const plat = await transaction.select().from(menu).where(eq(menu.nom, ligne.plat));
        if (plat[0]?.stockPortions !== null && plat[0]?.stockPortions !== undefined) {
          const nouveau = Math.max(0, plat[0].stockPortions - ligne.quantite);
          await transaction
            .update(menu)
            .set({ stockPortions: nouveau, disponible: nouveau > 0, majLe: new Date() })
            .where(eq(menu.nom, ligne.plat));
        }
      }
      return nouvelleCommande;
    });
    return commande;
  }

  async majStatutCommande(id: string, statut: StatutCommande): Promise<CommandeRecord> {
    const commande = await this.trouverCommande(id);
    await db.update(commandes).set({ statut, majLe: new Date() }).where(eq(commandes.id, commande.id));
    if (statut === "PAYEE") {
      const existante = await db
        .select({ id: outboxSync.id })
        .from(outboxSync)
        .where(eq(outboxSync.idempotencyKey, `facture-${commande.id}`));
      if (existante.length === 0) {
        await db.insert(outboxSync).values({
          entite: "commande",
          entiteId: commande.id,
          operation: "creer_facture",
          idempotencyKey: `facture-${commande.id}`,
          payload: { commandeId: commande.id, montantTotal: commande.montantTotal, date: commande.date },
          statut: "pending",
        });
      }
    }
    return { ...commande, statut };
  }

  async assignerCommande(id: string, changements: CommandeAssignationInput): Promise<CommandeRecord> {
    const commande = await this.trouverCommande(id);
    const maj: Partial<typeof commandes.$inferInsert> = { majLe: new Date() };
    if (changements.serveurId !== undefined) {
      if (changements.serveurId === null) {
        maj.serveurId = null;
      } else {
        const serveur = await db.select().from(employes).where(eq(employes.id, changements.serveurId));
        if (serveur.length === 0 || serveur[0].fonction !== "serveur" || !serveur[0].actif) {
          throw new Error(`Serveur introuvable ou inactif : ${changements.serveurId}.`);
        }
        maj.serveurId = serveur[0].id;
      }
    }
    if (changements.cuisinierId !== undefined) {
      if (changements.cuisinierId === null) {
        maj.cuisinierId = null;
      } else {
        const cuisinier = await db.select().from(employes).where(eq(employes.id, changements.cuisinierId));
        if (cuisinier.length === 0 || cuisinier[0].fonction !== "cuisinier" || !cuisinier[0].actif) {
          throw new Error(`Cuisinier introuvable ou inactif : ${changements.cuisinierId}.`);
        }
        maj.cuisinierId = cuisinier[0].id;
      }
    }
    await db.update(commandes).set(maj).where(eq(commandes.id, commande.id));
    return {
      ...commande,
      serveurId: maj.serveurId !== undefined ? maj.serveurId : commande.serveurId,
      cuisinierId: maj.cuisinierId !== undefined ? maj.cuisinierId : commande.cuisinierId,
    };
  }

  async listerAffectations(date: string): Promise<AffectationRecord[]> {
    const liste = await db.select().from(affectations).where(eq(affectations.date, date));
    return liste.map((affectation) => ({
      date: affectation.date,
      reservationCode: affectation.reservationCode,
      serveurId: affectation.serveurId,
      creeLe: toISODate(affectation.creeLe),
    }));
  }

  async affecterReservation(date: string, reservationCode: string, serveurId: string): Promise<AffectationRecord> {
    const reservation = await db
      .select()
      .from(reservations)
      .where(and(eq(reservations.code, reservationCode.trim().toUpperCase()), eq(reservations.date, date)));
    if (reservation.length === 0 || reservation[0].statut !== "CONFIRMEE") {
      throw new Error(`Réservation confirmée introuvable pour le ${date} : ${reservationCode}.`);
    }
    const serveur = await db.select().from(employes).where(eq(employes.id, serveurId));
    if (serveur.length === 0 || serveur[0].fonction !== "serveur" || !serveur[0].actif) {
      throw new Error(`Serveur introuvable ou inactif : ${serveurId}.`);
    }
    const existante = await db
      .select()
      .from(affectations)
      .where(and(eq(affectations.date, date), eq(affectations.reservationCode, reservation[0].code)));
    const creeLe = new Date();
    if (existante.length > 0) {
      await db.update(affectations).set({ serveurId: serveur[0].id, creeLe }).where(
        and(eq(affectations.date, date), eq(affectations.reservationCode, reservation[0].code))
      );
    } else {
      await db.insert(affectations).values({
        date,
        reservationCode: reservation[0].code,
        serveurId: serveur[0].id,
        creeLe,
      });
    }
    return { date, reservationCode: reservation[0].code, serveurId: serveur[0].id, creeLe: toISODate(creeLe) };
  }

  async retirerAffectation(date: string, reservationCode: string): Promise<void> {
    const resultat = await db
      .delete(affectations)
      .where(and(eq(affectations.date, date), eq(affectations.reservationCode, reservationCode.trim().toUpperCase())))
      .returning({ date: affectations.date });
    if (resultat.length === 0) {
      throw new Error(`Aucune affectation trouvée pour la réservation ${reservationCode} le ${date}.`);
    }
  }

  async listerPlanning(dateDebut: string, dateFin: string): Promise<ShiftRecord[]> {
    const liste = await db
      .select()
      .from(shifts)
      .where(and(gte(shifts.date, dateDebut), lte(shifts.date, dateFin)))
      .orderBy(shifts.date, shifts.debut);
    return liste.map((shift) => ({
      id: shift.id,
      date: shift.date,
      employeId: shift.employeId,
      debut: shift.debut,
      fin: shift.fin,
      poste: shift.poste as PosteShift,
    }));
  }

  async creerShift(entree: ShiftCreeInput): Promise<ShiftRecord> {
    const employe = await db.select().from(employes).where(eq(employes.id, entree.employeId));
    if (employe.length === 0 || !employe[0].actif) {
      throw new Error(`Membre d'équipe introuvable ou inactif : ${entree.employeId}.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entree.date)) {
      throw new Error("Date de shift invalide : utilisez le format AAAA-MM-JJ.");
    }
    if (!heureValide(entree.debut) || !heureValide(entree.fin)) {
      throw new Error("Heures de shift invalides : utilisez le format HH:MM en 24h.");
    }
    if (heureEnMinutes(entree.fin) === heureEnMinutes(entree.debut)) {
      throw new Error("La fin du shift doit être différente du début.");
    }
    if (!POSTES_VALIDES.includes(entree.poste)) {
      throw new Error(`Poste inconnu : ${entree.poste}. Valeurs acceptées : ${POSTES_VALIDES.join(", ")}.`);
    }
    const id = await this.nouvelId("shifts", 3);
    const shift: ShiftRecord = {
      id,
      date: entree.date,
      employeId: entree.employeId,
      debut: entree.debut,
      fin: entree.fin,
      poste: entree.poste,
    };
    await db.insert(shifts).values({ ...shift });
    return shift;
  }

  async supprimerShift(id: string): Promise<void> {
    const resultat = await db.delete(shifts).where(eq(shifts.id, id)).returning({ id: shifts.id });
    if (resultat.length === 0) {
      throw new Error(`Shift introuvable : ${id}.`);
    }
  }

  private hydraterReservation(row: (typeof reservations.$inferSelect)): ReservationRecord {
    return {
      code: row.code,
      date: row.date,
      heure: row.heure,
      nombrePersonnes: row.nombrePersonnes,
      nomClient: row.nomClient,
      telephone: row.telephone,
      tableId: row.tableId,
      statut: row.statut as StatutReservation,
      notes: row.notes,
      creeLe: toISODate(row.creeLe),
    };
  }

  private hydraterMenu(row: (typeof menu.$inferSelect)): PlatMenu {
    return {
      id: row.id,
      nom: row.nom,
      categorie: row.categorie as CategorieMenu,
      prix: row.prix,
      allergenes: row.allergenes,
      niveauPiment: row.niveauPiment,
      disponible: row.disponible,
      stockPortions: row.stockPortions,
      description: row.description,
    };
  }

  private validerEntrees(date: string, heure: string, nombrePersonnes: number): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Date invalide : utilisez le format AAAA-MM-JJ.");
    }
    if (!heureValide(heure)) {
      throw new Error("Heure invalide : utilisez le format HH:MM en 24h, par exemple 19:30.");
    }
    if (!Number.isInteger(nombrePersonnes) || nombrePersonnes < 1 || nombrePersonnes > 12) {
      throw new Error("Le nombre de personnes doit être un entier compris entre 1 et 12.");
    }
  }

  private async trouverReservationActive(code: string): Promise<ReservationRecord> {
    const liste = await db
      .select()
      .from(reservations)
      .where(and(eq(reservations.code, code.trim().toUpperCase()), eq(reservations.statut, "CONFIRMEE")));
    if (liste.length === 0) {
      throw new Error(`Réservation introuvable ou déjà clôturée : ${code}.`);
    }
    return this.hydraterReservation(liste[0]);
  }

  private async trouverCommande(id: string): Promise<CommandeRecord> {
    const liste = await db.select().from(commandes).where(eq(commandes.id, id.trim().toUpperCase()));
    if (liste.length === 0) throw new Error(`Commande introuvable : ${id}.`);
    return this.hydraterCommande(liste[0]);
  }

  private async hydraterCommandes(liste: CommandeRow[]): Promise<CommandeRecord[]> {
    return Promise.all(liste.map((commande) => this.hydraterCommande(commande)));
  }

  private async hydraterCommande(commande: CommandeRow): Promise<CommandeRecord> {
    const lignes = await db
      .select()
      .from(commandeLignes)
      .where(eq(commandeLignes.commandeId, commande.id))
      .orderBy(commandeLignes.position);
    return {
      id: commande.id,
      date: commande.date,
      heure: commande.heure,
      tableId: commande.tableId,
      reservationCode: commande.reservationCode,
      serveurId: commande.serveurId,
      cuisinierId: commande.cuisinierId,
      statut: commande.statut as StatutCommande,
      mode: (commande.mode as ModeCommande) ?? "sur_place",
      adresseLivraison: commande.adresseLivraison,
      montantTotal: commande.montantTotal,
      creeLe: toISODate(commande.creeLe),
      lignes: lignes.map((ligne) => ({
        plat: ligne.plat,
        quantite: ligne.quantite,
        prix: ligne.prixUnitaire,
        notes: ligne.notes,
      })),
    };
  }

private async nouvelId(
    table: "employes" | "commandes" | "shifts",
    padding: number,
    transaction?: any
  ): Promise<string> {
    const execute = transaction ?? db;
    const seqName = table === "employes" ? "employe_id_seq"
      : table === "commandes" ? "commande_id_seq"
      : "shift_id_seq";
    const resultat = await execute.execute(sql.raw(`SELECT nextval('${seqName}') AS prochain`));
    const rows = (resultat as unknown as { rows: Array<{ prochain: string | number }> }).rows;
    const num = Number(rows[0]?.prochain ?? 1);
    const prefixe = table === "employes" ? "EMP-"
      : table === "commandes" ? "CMD-"
      : "SH-";
    return `${prefixe}${String(num).padStart(padding, "0")}`;
  }

  private async nouveauCodeReservation(): Promise<string> {
    let code = genererCodeReservation(Math.random);
    let existant = await db.select({ code: reservations.code }).from(reservations).where(eq(reservations.code, code));
    while (existant.length > 0) {
      code = genererCodeReservation(Math.random);
      existant = await db.select({ code: reservations.code }).from(reservations).where(eq(reservations.code, code));
    }
    return code;
  }
}

type CommandeRow = typeof commandes.$inferSelect;

export type { LigneFacture };
