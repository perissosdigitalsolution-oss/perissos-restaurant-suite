import type { AdaptateurDonneesRestaurant } from "../evergauzy/adaptateur.js";
import type {
  CommandeRecord,
  EmployeRecord,
  FonctionEmploye,
  PlatMenu,
  ReservationFiltre,
  ReservationModifInput,
  ReservationRecord,
  Role,
  SessionContext,
  StatutCommande,
} from "../types.js";
import type { Periode } from "../utils.js";
import {
  ajouterJours,
  bornesPeriode,
  bornesPeriodePrecedente,
  depuisISODate,
  formatDateFr,
  formatFCFA,
  formatHeureFr,
  formatPourcent,
  heureEnMinutes,
  nomJourFr,
  toISODate,
} from "../utils.js";

export interface ContexteOutil {
  adaptateur: AdaptateurDonneesRestaurant;
  session: SessionContext;
  maintenant: Date;
}

export type GestionnaireOutil = (
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
) => Promise<Record<string, unknown>>;

function texteOuNull(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.trim().length > 0 ? valeur.trim() : null;
}

function nombreOuNull(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null;
}

function lirePeriode(valeur: unknown, defaut: Periode): Periode {
  return valeur === "aujourdhui" || valeur === "semaine" || valeur === "mois" ? valeur : defaut;
}

function versApercuPlat(plat: PlatMenu) {
  return {
    nom: plat.nom,
    categorie: plat.categorie,
    prix: plat.prix,
    prixFormate: formatFCFA(plat.prix),
    allergenes: plat.allergenes,
    niveauPiment: plat.niveauPiment,
    disponible: plat.disponible && (plat.stockPortions === null || plat.stockPortions > 0),
    stockPortions: plat.stockPortions,
    description: plat.description,
  };
}

function versResumeReservation(reservation: ReservationRecord) {
  return {
    code: reservation.code,
    date: reservation.date,
    heure: reservation.heure,
    nombrePersonnes: reservation.nombrePersonnes,
    nomClient: reservation.nomClient,
    telephone: reservation.telephone,
    statut: reservation.statut,
    table: reservation.tableId,
    notes: reservation.notes,
  };
}

async function outilVerifierDisponibilite(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const date = texteOuNull(argumentsOutil.date);
  const heure = texteOuNull(argumentsOutil.heure);
  const nombrePersonnes = nombreOuNull(argumentsOutil.nombre_personnes);
  if (!date || !heure || nombrePersonnes === null) {
    throw new Error(
      "Pour vérifier la disponibilité, il faut une date (AAAA-MM-JJ), une heure (HH:MM) et le nombre de personnes."
    );
  }
  const resultat = await contexte.adaptateur.verifierDisponibilite(date, heure, nombrePersonnes);
  let message: string;
  if (resultat.disponible && resultat.tableRecommandee) {
    message = `${nombrePersonnes} couverts sont disponibles le ${formatDateFr(date)} à ${formatHeureFr(heure)} : ${resultat.tableRecommandee.nom} (${resultat.tableRecommandee.capacite} places).`;
    if (resultat.tablesLibres.length > 1) {
      message += ` ${resultat.tablesLibres.length - 1} autre(s) table(s) libre(s) également.`;
    }
  } else {
    message = `Aucune table de ${nombrePersonnes} couverts disponible le ${formatDateFr(date)} à ${formatHeureFr(heure)}.`;
    if (resultat.creneauxAlternatifs.length > 0) {
      message += ` Créneaux proches disponibles : ${resultat.creneauxAlternatifs.map((creneau) => formatHeureFr(creneau.heure)).join(", ")}.`;
    } else {
      message += " Aucun créneau proche de libre : proposez un autre jour.";
    }
  }
  return { ...resultat, message };
}

async function outilCreerReservation(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const date = texteOuNull(argumentsOutil.date);
  const heure = texteOuNull(argumentsOutil.heure);
  const nombrePersonnes = nombreOuNull(argumentsOutil.nombre_personnes);
  const nomClient = texteOuNull(argumentsOutil.nom_client);
  const telephone = texteOuNull(argumentsOutil.telephone);
  if (!date || !heure || nombrePersonnes === null || !nomClient || !telephone) {
    const manquants: string[] = [];
    if (!date) manquants.push("la date");
    if (!heure) manquants.push("l'heure");
    if (nombrePersonnes === null) manquants.push("le nombre de personnes");
    if (!nomClient) manquants.push("le nom du client");
    if (!telephone) manquants.push("le numéro de téléphone");
    throw new Error(
      `Impossible de créer la réservation, il manque : ${manquants.join(", ")}. Demandez ces informations au client.`
    );
  }
  const reservation = await contexte.adaptateur.creerReservation({
    date,
    heure,
    nombrePersonnes,
    nomClient,
    telephone,
    notes: texteOuNull(argumentsOutil.notes) ?? "",
  });
  const tables = await contexte.adaptateur.listerTables();
  const table = tables.find((element) => element.id === reservation.tableId);
  return {
    confirmation: true,
    reservation: versResumeReservation(reservation),
    table: table ? table.nom : null,
    message: `Réservation confirmée : ${formatDateFr(reservation.date)} à ${formatHeureFr(reservation.heure)}, ${reservation.nombrePersonnes} personnes${table ? ` (${table.nom})` : ""}, au nom de ${reservation.nomClient}. Code de réservation : ${reservation.code}. Un rappel sera envoyé automatiquement au ${telephone} avant le service.`,
  };
}

async function outilRechercherReservation(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const filtre: ReservationFiltre = {
    code: texteOuNull(argumentsOutil.code) ?? undefined,
    telephone: texteOuNull(argumentsOutil.telephone) ?? undefined,
    nom: texteOuNull(argumentsOutil.nom) ?? undefined,
  };
  if (!filtre.code && !filtre.telephone && !filtre.nom) {
    throw new Error("Précisez au moins un code, un numéro de téléphone ou un nom de client pour la recherche.");
  }
  const reservations = await contexte.adaptateur.rechercherReservations(filtre);
  return {
    nombreResultats: reservations.length,
    reservations: reservations.map(versResumeReservation),
    message:
      reservations.length === 0
        ? "Aucune réservation ne correspond à cette recherche."
        : `${reservations.length} réservation(s) trouvée(s) : ${[...new Set(reservations.map((r) => r.code))].slice(0, 5).join(", ")}.`,
  };
}

async function outilModifierReservation(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const code = texteOuNull(argumentsOutil.code);
  const telephone = texteOuNull(argumentsOutil.telephone);
  if (!code || !telephone) {
    throw new Error("Pour modifier une réservation, il faut le code de réservation et le numéro de téléphone du client.");
  }
  const changements: ReservationModifInput = {
    date: texteOuNull(argumentsOutil.date) ?? undefined,
    heure: texteOuNull(argumentsOutil.heure) ?? undefined,
    nombrePersonnes: nombreOuNull(argumentsOutil.nombre_personnes) ?? undefined,
    notes: texteOuNull(argumentsOutil.notes) ?? undefined,
  };
  const reservation = await contexte.adaptateur.modifierReservation(code, telephone, changements);
  const tables = await contexte.adaptateur.listerTables();
  const table = tables.find((element) => element.id === reservation.tableId);
  return {
    confirmation: true,
    reservation: versResumeReservation(reservation),
    table: table ? table.nom : null,
    message: `Réservation ${reservation.code} mise à jour : ${formatDateFr(reservation.date)} à ${formatHeureFr(reservation.heure)}, ${reservation.nombrePersonnes} personnes${table ? ` (${table.nom})` : ""}.`,
  };
}

async function outilAnnulerReservation(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const code = texteOuNull(argumentsOutil.code);
  const telephone = texteOuNull(argumentsOutil.telephone);
  if (!code || !telephone) {
    throw new Error("Pour annuler une réservation, il faut le code de réservation et le numéro de téléphone du client.");
  }
  const reservation = await contexte.adaptateur.annulerReservation(code, telephone);
  return {
    confirmation: true,
    reservation: versResumeReservation(reservation),
    message: `Réservation ${reservation.code} au nom de ${reservation.nomClient} bien annulée. La table sera proposée à d'autres clients. Souhaitez-vous réserver une autre date ?`,
  };
}

async function outilConsulterMenu(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const plats = await contexte.adaptateur.listerMenu();
  const recherche = texteOuNull(argumentsOutil.recherche)?.toLowerCase() ?? null;
  const categorie = texteOuNull(argumentsOutil.categorie);
  const sansAllergene = texteOuNull(argumentsOutil.sans_allergene)?.toLowerCase() ?? null;
  const pimentMax = nombreOuNull(argumentsOutil.niveau_piment_max);
  const resultats = plats.filter((plat) => {
    if (categorie && plat.categorie !== categorie) return false;
    if (sansAllergene && plat.allergenes.some((allergene) => allergene.toLowerCase().includes(sansAllergene))) {
      return false;
    }
    if (pimentMax !== null && plat.niveauPiment > pimentMax) return false;
    if (recherche && !`${plat.nom} ${plat.description}`.toLowerCase().includes(recherche)) return false;
    return true;
  });
  return {
    nombrePlats: resultats.length,
    plats: resultats.map(versApercuPlat),
    message: `${resultats.length} plat(s) correspondent à votre demande sur ${plats.length} plats à la carte.`,
  };
}

async function outilVerifierStockPlat(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const nomPlat = texteOuNull(argumentsOutil.nom_du_plat);
  if (!nomPlat) {
    throw new Error("Précisez le nom du plat à vérifier.");
  }
  const plat = await contexte.adaptateur.obtenirPlat(nomPlat);
  if (!plat) {
    return {
      message: `Je ne trouve pas « ${nomPlat} » dans la carte. Appelez consulter_menu pour voir les plats disponibles.`,
    };
  }
  const disponible = plat.disponible && (plat.stockPortions === null || plat.stockPortions > 0);
  return {
    plat: versApercuPlat(plat),
    disponible,
    message: disponible
      ? `${plat.nom} est disponible (${plat.stockPortions === null ? "stock illimité" : `${plat.stockPortions} portion(s) restante(s)`}). Prix : ${formatFCFA(plat.prix)}.${plat.allergenes.length > 0 ? ` Allergènes : ${plat.allergenes.join(", ")}.` : ""}${plat.niveauPiment >= 3 ? " Attention : ce plat est très pimenté." : ""}`
      : `${plat.nom} est momentanément indisponible. Proposez un autre plat avec consulter_menu.`,
  };
}

async function outilObtenirChiffreAffaires(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const periode = lirePeriode(argumentsOutil.periode, "semaine");
  const dateReferenceTexte = texteOuNull(argumentsOutil.date_reference);
  const dateReference = dateReferenceTexte ? depuisISODate(dateReferenceTexte) : contexte.maintenant;
  const { debut, fin } = bornesPeriode(dateReference, periode);
  const { debut: debutPrecedent, fin: finPrecedent } = bornesPeriodePrecedente(debut, fin);
  const factures = await contexte.adaptateur.listerFactures(toISODate(debut), toISODate(fin));
  const facturesPrecedentes = await contexte.adaptateur.listerFactures(toISODate(debutPrecedent), toISODate(finPrecedent));
  const chiffre = factures.reduce((somme, facture) => somme + facture.montantTotal, 0);
  const chiffrePrecedent = facturesPrecedentes.reduce((somme, facture) => somme + facture.montantTotal, 0);
  const variationPourcent = chiffrePrecedent > 0 ? ((chiffre - chiffrePrecedent) / chiffrePrecedent) * 100 : null;
  const libelle =
    periode === "aujourdhui" ? "aujourd'hui" : periode === "semaine" ? "sur les 7 derniers jours" : "sur les 30 derniers jours";
  const comparaison =
    variationPourcent !== null
      ? `, soit ${formatPourcent(variationPourcent)} par rapport à la période précédente (${formatFCFA(chiffrePrecedent)})`
      : "";
  return {
    periode,
    du: toISODate(debut),
    au: toISODate(fin),
    chiffreAffaires: chiffre,
    chiffreAffairesFormate: formatFCFA(chiffre),
    nombreFactures: factures.length,
    periodePrecedente: chiffrePrecedent,
    periodePrecedenteFormate: formatFCFA(chiffrePrecedent),
    variationPourcent: variationPourcent === null ? null : Math.round(variationPourcent * 10) / 10,
    message: `${libelle.charAt(0).toUpperCase()}${libelle.slice(1)}, le restaurant a encaissé ${formatFCFA(chiffre)} sur ${factures.length} factures${comparaison}.`,
  };
}

async function outilAnalyserVentes(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const periode = argumentsOutil.periode === "mois" ? "mois" : "semaine";
  const { debut, fin } = bornesPeriode(contexte.maintenant, periode);
  const factures = await contexte.adaptateur.listerFactures(toISODate(debut), toISODate(fin));
  const ventesParPlat = new Map<string, { quantite: number; chiffreAffaires: number }>();
  let chiffreTotal = 0;
  for (const facture of factures) {
    chiffreTotal += facture.montantTotal;
    for (const ligne of facture.lignes) {
      const ventes = ventesParPlat.get(ligne.plat) ?? { quantite: 0, chiffreAffaires: 0 };
      ventes.quantite += ligne.quantite;
      ventes.chiffreAffaires += ligne.montant;
      ventesParPlat.set(ligne.plat, ventes);
    }
  }
  const topPlats = [...ventesParPlat.entries()]
    .sort((a, b) => b[1].chiffreAffaires - a[1].chiffreAffaires)
    .slice(0, 5)
    .map(([plat, ventes]) => ({
      plat,
      quantite: ventes.quantite,
      chiffreAffaires: ventes.chiffreAffaires,
      chiffreAffairesFormate: formatFCFA(ventes.chiffreAffaires),
      partPourcent: chiffreTotal > 0 ? Math.round((ventes.chiffreAffaires / chiffreTotal) * 1000) / 10 : 0,
    }));
  const menu = await contexte.adaptateur.listerMenu();
  const seuilStock = 5;
  const alertesStock: Array<{ plat: string; stockRestant: number; seuil: number }> = [];
  const ruptures: Array<{ plat: string }> = [];
  for (const plat of menu) {
    if (!ventesParPlat.has(plat.nom)) continue;
    if (plat.stockPortions !== null && plat.stockPortions <= seuilStock && plat.stockPortions > 0) {
      alertesStock.push({ plat: plat.nom, stockRestant: plat.stockPortions, seuil: seuilStock });
    }
    if (plat.stockPortions === 0 || !plat.disponible) {
      ruptures.push({ plat: plat.nom });
    }
  }
  const morceaux: string[] = [];
  if (topPlats.length > 0) {
    const vedette = topPlats[0];
    morceaux.push(
      `${vedette.plat} concentre ${String(vedette.partPourcent).replace(".", ",")}% du chiffre d'affaires (${vedette.chiffreAffairesFormate}, ${vedette.quantite} portions vendues).`
    );
  }
  for (const alerte of alertesStock) {
    morceaux.push(`Alerte stock : il ne reste que ${alerte.stockRestant} portion(s) pour ${alerte.plat}, pensez au réapprovisionnement.`);
  }
  for (const rupture of ruptures) {
    morceaux.push(`Rupture : ${rupture.plat} est momentanément indisponible.`);
  }
  return {
    periode,
    du: toISODate(debut),
    au: toISODate(fin),
    chiffreAffaires: chiffreTotal,
    chiffreAffairesFormate: formatFCFA(chiffreTotal),
    nombreFactures: factures.length,
    topPlats,
    alertesStock,
    ruptures,
    message: morceaux.join(" "),
  };
}

async function outilPrevisionsAffluence(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const dateCible = texteOuNull(argumentsOutil.date_cible) ?? toISODate(contexte.maintenant);
  const tables = await contexte.adaptateur.listerTables();
  const capaciteTotale = tables.reduce((somme, table) => somme + table.capacite, 0);
  const dateReference = depuisISODate(dateCible);
  const estWeekend = dateReference.getDay() === 0 || dateReference.getDay() === 6;
  const estFinDeMois = dateReference.getDate() >= 24;
  const historique: Array<{ date: string; tauxOccupationDiner: number; couverts: number }> = [];
  for (let occurrence = 1; occurrence <= 4; occurrence++) {
    const datePassee = ajouterJours(dateReference, -7 * occurrence);
    const iso = toISODate(datePassee);
    const reservations = await contexte.adaptateur.listerReservations({ dateDebut: iso, dateFin: iso });
    const actives = reservations.filter((reservation) => reservation.statut === "CONFIRMEE");
    const couvertsDiner = actives
      .filter((reservation) => heureEnMinutes(reservation.heure) >= 18 * 60)
      .reduce((somme, reservation) => somme + reservation.nombrePersonnes, 0);
    const couverts = actives.reduce((somme, reservation) => somme + reservation.nombrePersonnes, 0);
    historique.push({
      date: iso,
      tauxOccupationDiner:
        capaciteTotale > 0 ? Math.round((Math.min(couvertsDiner, capaciteTotale) / capaciteTotale) * 1000) / 10 : 0,
      couverts,
    });
  }
  const moyenne = (liste: number[]) => liste.reduce((somme, valeur) => somme + valeur, 0) / (liste.length || 1);
  const tauxGlobal = moyenne(historique.map((entree) => entree.tauxOccupationDiner));
  const historiqueFinDeMois = historique.filter((entree) => depuisISODate(entree.date).getDate() >= 24);
  const tauxPertinent =
    estFinDeMois && historiqueFinDeMois.length > 0
      ? moyenne(historiqueFinDeMois.map((entree) => entree.tauxOccupationDiner))
      : tauxGlobal;
  const serveursHabituels = estWeekend ? 6 : 4;
  const renfort = tauxPertinent >= 85 || (estWeekend && estFinDeMois && tauxPertinent >= 60);
  const serveursRecommandes = renfort ? serveursHabituels + 2 : serveursHabituels;
  const conseils: string[] = [];
  if (renfort) {
    conseils.push(
      `Occupation prévue d'environ ${Math.round(tauxPertinent)}% au dîner : prévoyez ${serveursRecommandes} serveurs au lieu de ${serveursHabituels}.`
    );
  } else {
    conseils.push(
      `Affluence attendue modérée (≈ ${Math.round(tauxPertinent)}% d'occupation au dîner) : le staffing habituel de ${serveursHabituels} serveurs suffit.`
    );
  }
  if (estWeekend && estFinDeMois) {
    conseils.push("Week-end de fin de mois : les historiques affichent souvent complet dès le jeudi, anticipez aussi les stocks (alloco, poisson braisé).");
  }
  return {
    dateCible,
    jour: nomJourFr(dateCible),
    weekend: estWeekend,
    finDeMois: estFinDeMois,
    capaciteTotaleCouverts: capaciteTotale,
    historique,
    tauxOccupationDinerPourcent: Math.round(tauxPertinent * 10) / 10,
    serveursHabituels,
    serveursRecommandes,
    conseils,
    message: conseils.join(" "),
  };
}

async function outilListeReservations(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const statutBrut = texteOuNull(argumentsOutil.statut);
  const filtre: ReservationFiltre = {
    dateDebut: texteOuNull(argumentsOutil.date_debut) ?? undefined,
    dateFin: texteOuNull(argumentsOutil.date_fin) ?? undefined,
    statut:
      statutBrut === "CONFIRMEE" || statutBrut === "ANNULLEE" || statutBrut === "NO_SHOW" ? statutBrut : undefined,
  };
  const reservations = await contexte.adaptateur.listerReservations(filtre);
  const resume = reservations.slice(0, 50).map(versResumeReservation);
  const message =
    filtre.statut === "NO_SHOW"
      ? `${reservations.length} client(s) n'ont pas honoré leur réservation sur la période. Voici la liste à relancer chaleureusement.`
      : `${reservations.length} réservation(s) trouvée(s) sur la période.`;
  return { total: reservations.length, reservations: resume, message };
}

const LIBELLES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: "en attente",
  EN_CUISINE: "en cuisine",
  PRETE: "prête",
  SERVIE: "servie",
  PAYEE: "payée",
};

const TRANSITIONS_COMMANDE: Record<Role, Array<[StatutCommande, StatutCommande]>> = {
  RESTAURANT_ADMIN: [
    ["EN_ATTENTE", "EN_CUISINE"],
    ["EN_CUISINE", "PRETE"],
    ["PRETE", "SERVIE"],
    ["SERVIE", "PAYEE"],
  ],
  SERVER: [
    ["EN_ATTENTE", "EN_CUISINE"],
    ["PRETE", "SERVIE"],
    ["SERVIE", "PAYEE"],
  ],
  BAR: [
    ["EN_ATTENTE", "EN_CUISINE"],
    ["PRETE", "SERVIE"],
    ["SERVIE", "PAYEE"],
  ],
  KITCHEN: [
    ["EN_ATTENTE", "EN_CUISINE"],
    ["EN_CUISINE", "PRETE"],
  ],
  CASHIER: [["SERVIE", "PAYEE"]],
  CLIENT: [],
};

const LIBELLES_FONCTION: Record<FonctionEmploye, string> = {
  patron: "patron",
  serveur: "serveur",
  cuisinier: "cuisinier",
  barman: "barman",
  caissier: "caissier",
};

function versResumeEmploye(employe: EmployeRecord) {
  return {
    id: employe.id,
    nom: employe.nom,
    fonction: employe.fonction,
    telephone: employe.telephone,
    actif: employe.actif,
  };
}

async function trouverEmploye(
  contexte: ContexteOutil,
  valeur: string,
  fonctionVoulue?: FonctionEmploye
): Promise<EmployeRecord> {
  const employes = await contexte.adaptateur.listerEmployes();
  const recherche = valeur.trim().toLowerCase();
  const trouve =
    employes.find((employe) => employe.id.toLowerCase() === recherche || employe.nom.toLowerCase() === recherche) ??
    employes.find((employe) => employe.nom.toLowerCase().includes(recherche));
  if (!trouve) {
    throw new Error(`Membre d'équipe introuvable : ${valeur}. Consultez lister_equipe pour voir l'équipe.`);
  }
  if (fonctionVoulue && trouve.fonction !== fonctionVoulue) {
    throw new Error(`${trouve.nom} n'est pas ${LIBELLES_FONCTION[fonctionVoulue]} (fonction actuelle : ${trouve.fonction}).`);
  }
  return trouve;
}

function versResumeCommande(commande: CommandeRecordAvecNoms) {
  return {
    id: commande.id,
    date: commande.date,
    heure: commande.heure,
    table: commande.tableId,
    reservationCode: commande.reservationCode,
    serveurId: commande.serveurId,
    serveur: commande.serveurNom,
    cuisinierId: commande.cuisinierId,
    cuisinier: commande.cuisinierNom,
    statut: commande.statut,
    statutLibelle: LIBELLES_STATUT_COMMANDE[commande.statut],
    lignes: commande.lignes.map((ligne) => ({
      plat: ligne.plat,
      quantite: ligne.quantite,
      prix: ligne.prix,
      notes: ligne.notes,
    })),
    montantTotal: commande.montantTotal,
    montantTotalFormate: formatFCFA(commande.montantTotal),
  };
}

interface CommandeRecordAvecNoms {
  id: string;
  date: string;
  heure: string;
  tableId: string | null;
  reservationCode: string | null;
  serveurId: string | null;
  cuisinierId: string | null;
  statut: StatutCommande;
  lignes: Array<{ plat: string; quantite: number; prix: number; notes: string }>;
  montantTotal: number;
  creeLe: string;
  serveurNom: string | null;
  cuisinierNom: string | null;
}

async function enrichirCommandes(contexte: ContexteOutil, commandes: CommandeRecord[]): Promise<CommandeRecordAvecNoms[]> {
  const employes = await contexte.adaptateur.listerEmployes();
  return commandes.map((commande) => ({
    ...commande,
    serveurNom: commande.serveurId
      ? (employes.find((employe) => employe.id === commande.serveurId)?.nom ?? null)
      : null,
    cuisinierNom: commande.cuisinierId
      ? (employes.find((employe) => employe.id === commande.cuisinierId)?.nom ?? null)
      : null,
  }));
}

async function outilListerEquipe(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const fonction = texteOuNull(argumentsOutil.fonction);
  if (fonction && !Object.keys(LIBELLES_FONCTION).includes(fonction)) {
    throw new Error(`Fonction inconnue : ${fonction}. Valeurs acceptées : ${Object.keys(LIBELLES_FONCTION).join(", ")}.`);
  }
  const employes = await contexte.adaptateur.listerEmployes();
  const filtres = employes.filter((employe) => !fonction || employe.fonction === fonction);
  const actifs = filtres.filter((employe) => employe.actif);
  return {
    total: filtres.length,
    actifs: actifs.length,
    equipe: filtres.map(versResumeEmploye),
    message:
      filtres.length === 0
        ? "Aucun membre d'équipe ne correspond à cette recherche."
        : `${actifs.length} membre(s) actif(s) sur ${filtres.length} : ${filtres
            .map((employe) => `${employe.nom} (${employe.fonction})`)
            .join(", ")}.`,
  };
}

async function outilCreerMembreEquipe(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const nom = texteOuNull(argumentsOutil.nom);
  const fonction = texteOuNull(argumentsOutil.fonction) as FonctionEmploye | null;
  const telephone = texteOuNull(argumentsOutil.telephone);
  if (!nom || !fonction || !telephone) {
    throw new Error("Pour ajouter un membre d'équipe, il faut le nom, la fonction et le téléphone.");
  }
  const employe = await contexte.adaptateur.creerEmploye({ nom, fonction, telephone });
  return {
    confirmation: true,
    employe: versResumeEmploye(employe),
    message: `${employe.nom} a été ajouté à l'équipe comme ${employe.fonction} (identifiant ${employe.id}).`,
  };
}

async function outilListerCommandes(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const date = texteOuNull(argumentsOutil.date) ?? toISODate(contexte.maintenant);
  const statutBrut = texteOuNull(argumentsOutil.statut);
  const statut =
    statutBrut === "EN_ATTENTE" || statutBrut === "EN_CUISINE" || statutBrut === "PRETE" || statutBrut === "SERVIE" || statutBrut === "PAYEE"
      ? statutBrut
      : undefined;
  const table = texteOuNull(argumentsOutil.table);
  const commandes = await contexte.adaptateur.listerCommandes({ date, statut, tableId: table ?? undefined });
  const enrichies = await enrichirCommandes(contexte, commandes);
  const ouvertes = enrichies.filter((commande) => commande.statut !== "PAYEE");
  return {
    date,
    total: enrichies.length,
    ouvertes: ouvertes.length,
    commandes: enrichies.slice(0, 30).map((commande) => ({
      id: commande.id,
      heure: commande.heure,
      table: commande.tableId,
      serveur: commande.serveurNom,
      cuisinier: commande.cuisinierNom,
      statut: commande.statut,
      statutLibelle: LIBELLES_STATUT_COMMANDE[commande.statut],
      lignes: commande.lignes.map((ligne) => `${ligne.quantite}x ${ligne.plat}`),
      montantTotalFormate: formatFCFA(commande.montantTotal),
    })),
    message:
      enrichies.length === 0
        ? `Aucune commande le ${formatDateFr(date)}.`
        : `${ouvertes.length} commande(s) en cours sur ${enrichies.length} le ${formatDateFr(date)} : ${enrichies
            .slice(0, 5)
            .map((commande) => `${commande.id} (${commande.tableId ?? "sans table"}, ${LIBELLES_STATUT_COMMANDE[commande.statut]})`)
            .join(", ")}.`,
  };
}

async function outilCreerCommande(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const table = texteOuNull(argumentsOutil.table);
  const reservationCode = texteOuNull(argumentsOutil.reservation_code);
  const serveurTexte = texteOuNull(argumentsOutil.serveur);
  const lignesBrutes = Array.isArray(argumentsOutil.lignes) ? argumentsOutil.lignes : [];
  if (lignesBrutes.length === 0) {
    throw new Error("Indiquez au moins une ligne de commande : un plat et une quantité.");
  }
  const lignes = lignesBrutes.map((element) => {
    const ligne = element as Record<string, unknown>;
    return {
      plat: texteOuNull(ligne.plat) ?? "",
      quantite: nombreOuNull(ligne.quantite) ?? 0,
      notes: texteOuNull(ligne.notes) ?? undefined,
    };
  });
  const serveur = serveurTexte ? await trouverEmploye(contexte, serveurTexte, "serveur") : null;
  const commande = await contexte.adaptateur.creerCommande({
    tableId: table,
    reservationCode,
    serveurId: serveur?.id ?? null,
    lignes,
  });
  const resume = versResumeCommande({ ...commande, serveurNom: serveur?.nom ?? null, cuisinierNom: null });
  return {
    confirmation: true,
    commande: resume,
    message: `Commande ${commande.id} créée pour ${table ?? "emporter"} : ${lignes
      .map((ligne) => `${ligne.quantite}x ${ligne.plat}`)
      .join(", ")} — ${formatFCFA(commande.montantTotal)}. Elle attend en cuisine (statut en attente).`,
  };
}

async function outilAssignerCommande(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const id = texteOuNull(argumentsOutil.id_commande);
  if (!id) throw new Error("Précisez l'identifiant de la commande à assigner (par exemple CMD-0002).");
  const cuisinierTexte = texteOuNull(argumentsOutil.cuisinier);
  const serveurTexte = texteOuNull(argumentsOutil.serveur);
  if (!cuisinierTexte && !serveurTexte) {
    throw new Error("Indiquez au moins un cuisinier ou un serveur à assigner.");
  }
  const cuisinier = cuisinierTexte ? await trouverEmploye(contexte, cuisinierTexte, "cuisinier") : undefined;
  const serveur = serveurTexte ? await trouverEmploye(contexte, serveurTexte, "serveur") : undefined;
  const commande = await contexte.adaptateur.assignerCommande(id, {
    cuisinierId: cuisinier?.id,
    serveurId: serveur?.id,
  });
  const morceaux: string[] = [];
  if (cuisinier) morceaux.push(`${cuisinier.nom} en cuisine`);
  if (serveur) morceaux.push(`${serveur.nom} en salle`);
  return {
    confirmation: true,
    commande: {
      id: commande.id,
      statut: commande.statut,
      serveurId: commande.serveurId,
      cuisinierId: commande.cuisinierId,
    },
    message: `Commande ${commande.id} assignée : ${morceaux.join(" et ")}.`,
  };
}

async function outilMajStatutCommande(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const id = texteOuNull(argumentsOutil.id_commande);
  const statut = texteOuNull(argumentsOutil.statut) as StatutCommande | null;
  if (!id || !statut) throw new Error("Précisez l'identifiant de la commande et le nouveau statut.");
  const autorisees = TRANSITIONS_COMMANDE[contexte.session.role];
  const commandes = await contexte.adaptateur.listerCommandes({});
  const commande = commandes.find((element) => element.id.toUpperCase() === id.toUpperCase());
  if (!commande) throw new Error(`Commande introuvable : ${id}.`);
  const transition: [StatutCommande, StatutCommande] = [commande.statut, statut];
  if (!autorisees.some(([depuis, vers]) => depuis === transition[0] && vers === transition[1])) {
    if (commande.statut === statut) {
      return { confirmation: true, commande: { id, statut }, message: `La commande ${id} est déjà ${LIBELLES_STATUT_COMMANDE[statut]}.` };
    }
    throw new Error(
      `Transition interdite : ${LIBELLES_STATUT_COMMANDE[commande.statut]} → ${LIBELLES_STATUT_COMMANDE[statut]} pour le rôle ${contexte.session.role}. Étapes autorisées : ${autorisees
        .map(([depuis, vers]) => `${LIBELLES_STATUT_COMMANDE[depuis]} → ${LIBELLES_STATUT_COMMANDE[vers]}`)
        .join(", ")}.`
    );
  }
  const miseAJour = await contexte.adaptateur.majStatutCommande(commande.id, statut);
  return {
    confirmation: true,
    commande: { id: miseAJour.id, statut: miseAJour.statut, statutLibelle: LIBELLES_STATUT_COMMANDE[statut] },
    message: `Commande ${miseAJour.id} : ${LIBELLES_STATUT_COMMANDE[commande.statut]} → ${LIBELLES_STATUT_COMMANDE[statut]}.`,
  };
}

async function outilAffecterReservation(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const code = texteOuNull(argumentsOutil.code_reservation);
  const serveurTexte = texteOuNull(argumentsOutil.serveur);
  if (!code || !serveurTexte) {
    throw new Error("Pour affecter une réservation, il faut le code de réservation et le serveur.");
  }
  const date = texteOuNull(argumentsOutil.date) ?? toISODate(contexte.maintenant);
  const serveur = await trouverEmploye(contexte, serveurTexte, "serveur");
  const affectation = await contexte.adaptateur.affecterReservation(date, code, serveur.id);
  const reservation = (await contexte.adaptateur.listerReservations({ code }))[0];
  const table = reservation?.tableId ? ` (table ${reservation.tableId})` : "";
  return {
    confirmation: true,
    affectation,
    message: `${serveur.nom} sert désormais la réservation ${affectation.reservationCode}${table}${reservation ? ` à ${reservation.heure}` : ""} le ${formatDateFr(date)}.`,
  };
}

async function outilListerAffectations(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const date = texteOuNull(argumentsOutil.date) ?? toISODate(contexte.maintenant);
  const [affectations, reservations, employes] = await Promise.all([
    contexte.adaptateur.listerAffectations(date),
    contexte.adaptateur.listerReservations({ dateDebut: date, dateFin: date, statut: "CONFIRMEE" }),
    contexte.adaptateur.listerEmployes(),
  ]);
  const nomServeur = (id: string) => employes.find((employe) => employe.id === id)?.nom ?? id;
  const lignes = reservations.map((reservation) => {
    const affectation = affectations.find((element) => element.reservationCode === reservation.code);
    return {
      code: reservation.code,
      heure: reservation.heure,
      table: reservation.tableId,
      nomClient: reservation.nomClient,
      nombrePersonnes: reservation.nombrePersonnes,
      serveur: affectation ? nomServeur(affectation.serveurId) : null,
    };
  });
  const sansServeur = lignes.filter((ligne) => !ligne.serveur);
  return {
    date,
    totalReservations: lignes.length,
    affectees: lignes.length - sansServeur.length,
    sansServeur: sansServeur.length,
    reservations: lignes,
    message:
      lignes.length === 0
        ? `Aucune réservation confirmée le ${formatDateFr(date)}.`
        : `${lignes.length - sansServeur.length}/${lignes.length} réservation(s) ont un serveur.${
            sansServeur.length > 0
              ? ` Sans serveur : ${sansServeur.map((ligne) => `${ligne.code} (${ligne.heure}, ${ligne.nomClient})`).join(", ")}.`
              : " Tout le service est affecté."
          }`,
  };
}

async function outilListerPlanning(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const debut = texteOuNull(argumentsOutil.date_debut) ?? toISODate(contexte.maintenant);
  const fin = texteOuNull(argumentsOutil.date_fin) ?? toISODate(ajouterJours(contexte.maintenant, 7));
  const [shifts, employes] = await Promise.all([
    contexte.adaptateur.listerPlanning(debut, fin),
    contexte.adaptateur.listerEmployes(),
  ]);
  const nomEmploye = (id: string) => employes.find((employe) => employe.id === id)?.nom ?? id;
  return {
    debut,
    fin,
    total: shifts.length,
    shifts: shifts.slice(0, 50).map((shift) => ({
      id: shift.id,
      date: shift.date,
      employe: nomEmploye(shift.employeId),
      employeId: shift.employeId,
      debut: shift.debut,
      fin: shift.fin,
      poste: shift.poste,
    })),
    message:
      shifts.length === 0
        ? `Aucun shift planifié entre le ${formatDateFr(debut)} et le ${formatDateFr(fin)}.`
        : `${shifts.length} shift(s) planifié(s) entre le ${formatDateFr(debut)} et le ${formatDateFr(fin)}.`,
  };
}

async function outilCreerShift(
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown>> {
  const date = texteOuNull(argumentsOutil.date);
  const employeTexte = texteOuNull(argumentsOutil.employe);
  const debut = texteOuNull(argumentsOutil.debut);
  const fin = texteOuNull(argumentsOutil.fin);
  const poste = texteOuNull(argumentsOutil.poste) as "salle" | "cuisine" | "bar" | "caisse" | null;
  if (!date || !employeTexte || !debut || !fin || !poste) {
    throw new Error("Pour créer un shift, il faut la date, le membre d'équipe, le début, la fin et le poste.");
  }
  const employe = await trouverEmploye(contexte, employeTexte);
  const shift = await contexte.adaptateur.creerShift({ date, employeId: employe.id, debut, fin, poste });
  return {
    confirmation: true,
    shift: { ...shift, employe: employe.nom },
    message: `Shift créé : ${employe.nom} le ${formatDateFr(date)} de ${formatHeureFr(debut)} à ${formatHeureFr(fin)} au poste ${poste}.`,
  };
}

export const GESTIONNAIRES_OUTILS: Record<string, GestionnaireOutil> = {
  verifier_disponibilite: outilVerifierDisponibilite,
  creer_reservation: outilCreerReservation,
  rechercher_reservation: outilRechercherReservation,
  modifier_reservation: outilModifierReservation,
  annuler_reservation: outilAnnulerReservation,
  consulter_menu: outilConsulterMenu,
  verifier_stock_plat: outilVerifierStockPlat,
  obtenir_chiffre_affaires: outilObtenirChiffreAffaires,
  analyser_ventes: outilAnalyserVentes,
  previsions_affluence: outilPrevisionsAffluence,
  liste_reservations: outilListeReservations,
  lister_equipe: outilListerEquipe,
  creer_membre_equipe: outilCreerMembreEquipe,
  lister_commandes: outilListerCommandes,
  creer_commande: outilCreerCommande,
  assigner_commande: outilAssignerCommande,
  maj_statut_commande: outilMajStatutCommande,
  affecter_reservation: outilAffecterReservation,
  lister_affectations: outilListerAffectations,
  lister_planning: outilListerPlanning,
  creer_shift: outilCreerShift,
};
