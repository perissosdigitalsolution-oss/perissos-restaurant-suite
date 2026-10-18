import type {
  AffectationRecord,
  CommandeAssignationInput,
  CommandeCreeInput,
  CommandeFiltre,
  CommandeRecord,
  DisponibiliteResultat,
  EmployeCreeInput,
  EmployeRecord,
  FactureRecord,
  FonctionEmploye,
  LigneCommande,
  LigneFacture,
  PlatMenu,
  PosteShift,
  ReservationCreeInput,
  ReservationFiltre,
  ReservationModifInput,
  ReservationRecord,
  ShiftCreeInput,
  ShiftRecord,
  StatutCommande,
  StatutReservation,
  TableInfo,
} from "../types.js";
import type { AdaptateurDonneesRestaurant } from "./adaptateur.js";
import { calculerDisponibilite } from "./disponibilite.js";
import {
  ajouterJours,
  genererCodeReservation,
  heureEnMinutes,
  heureValide,
  mulberry32,
  normaliserTelephone,
  tirageAleatoire,
  tiragePondere,
  toISODate,
} from "../utils.js";

const NOMS_CLIENTS = [
  "Kouassi Brou",
  "Aya Konan",
  "Yao N'Guessan",
  "Adjoua Tapé",
  "Séka Ahou",
  "Koffi Djedje",
  "Mariam Touré",
  "Ismaël Coulibaly",
  "Affoué Tanoh",
  "Brou Zadi",
  "Gnamien Lou",
  "Rachelle Amenan",
  "Didier Kouamé",
  "Sylvie Akissi",
  "Fatou Bamba",
  "Christian Aka",
  "Estelle Doumbia",
  "Ibrahim Sanogo",
  "Prisca Guéi",
  "Franck Zamblé",
];

const HEURES_SERVICE = ["12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00"];
const HEURES_DEJEUNER = ["12:00", "12:30", "13:00", "13:30"];
const HEURES_DINER = ["19:00", "19:30", "20:00", "20:30"];

const FONCTIONS_VALIDES: FonctionEmploye[] = ["patron", "serveur", "cuisinier", "barman", "caissier"];
const POSTES_VALIDES: PosteShift[] = ["salle", "cuisine", "bar", "caisse"];

export class AdaptateurMock implements AdaptateurDonneesRestaurant {
  private readonly tables: TableInfo[];
  private readonly menu: PlatMenu[];
  private readonly prixParPlat: Map<string, number>;
  private readonly reservations: ReservationRecord[] = [];
  private readonly factures: FactureRecord[] = [];
  private readonly employes: EmployeRecord[] = [];
  private readonly commandes: CommandeRecord[] = [];
  private readonly affectations: AffectationRecord[] = [];
  private readonly planning: ShiftRecord[] = [];
  private readonly aleatoire = mulberry32(20261014);

  constructor() {
    this.tables = [
      { id: "T1", nom: "Table 1 · Salle", capacite: 2, emplacement: "salle" },
      { id: "T2", nom: "Table 2 · Salle", capacite: 2, emplacement: "salle" },
      { id: "T3", nom: "Table 3 · Salle", capacite: 4, emplacement: "salle" },
      { id: "T4", nom: "Table 4 · Terrasse", capacite: 4, emplacement: "terrasse" },
      { id: "T5", nom: "Table 5 · Terrasse", capacite: 4, emplacement: "terrasse" },
      { id: "T6", nom: "Table 6 · Salle", capacite: 6, emplacement: "salle" },
      { id: "T7", nom: "Table 7 · Terrasse", capacite: 6, emplacement: "terrasse" },
      { id: "T8", nom: "Table 8 · Salle", capacite: 8, emplacement: "salle" },
      { id: "T9", nom: "Table 9 · VIP", capacite: 10, emplacement: "vip" },
      { id: "T10", nom: "Table 10 · VIP", capacite: 12, emplacement: "vip" },
    ];
    this.menu = [
      { id: "M01", nom: "Alloco", categorie: "accompagnement", prix: 1000, allergenes: [], niveauPiment: 1, disponible: true, stockPortions: 4, description: "Bananes plantain frites croustillantes, sauce piment maison servie à part." },
      { id: "M02", nom: "Attiéké", categorie: "accompagnement", prix: 1000, allergenes: [], niveauPiment: 0, disponible: true, stockPortions: 30, description: "Semoule de manioc fermentée, l'accompagnement traditionnel ivoirien." },
      { id: "M03", nom: "Riz gras", categorie: "accompagnement", prix: 1500, allergenes: [], niveauPiment: 0, disponible: true, stockPortions: 25, description: "Riz mijoté à la tomate et aux épices douces." },
      { id: "M04", nom: "Poisson braisé (capitaine)", categorie: "grillades", prix: 5000, allergenes: [], niveauPiment: 1, disponible: true, stockPortions: 14, description: "Capitaine braisé entier, servi avec attiéké et alloco en garniture." },
      { id: "M05", nom: "Poulet braisé", categorie: "grillades", prix: 3000, allergenes: [], niveauPiment: 2, disponible: true, stockPortions: 18, description: "Demi-poulet braisé mariné aux épices, sauce piment à part." },
      { id: "M06", nom: "Choukouya de bœuf", categorie: "grillades", prix: 4000, allergenes: [], niveauPiment: 3, disponible: true, stockPortions: 12, description: "Émincé de bœuf grillé épicé, servi avec oignons frais et attiéké. Attention : très pimenté." },
      { id: "M07", nom: "Kedjenou de poulet", categorie: "plat", prix: 4000, allergenes: [], niveauPiment: 1, disponible: true, stockPortions: 15, description: "Poulet mijoté lentement en canari avec tomates et aubergines." },
      { id: "M08", nom: "Sauce arachide", categorie: "plat", prix: 2500, allergenes: ["arachide"], niveauPiment: 1, disponible: true, stockPortions: 10, description: "Sauce graine à l'arachide, servie avec riz blanc ou attiéké. Contient de l'arachide." },
      { id: "M09", nom: "Alloco-poulet", categorie: "plat", prix: 2500, allergenes: [], niveauPiment: 1, disponible: true, stockPortions: 8, description: "Assiette généreuse d'alloco avec émincé de poulet sauté." },
      { id: "M10", nom: "Poisson frit", categorie: "plat", prix: 3500, allergenes: [], niveauPiment: 1, disponible: true, stockPortions: 10, description: "Machoaron frit doré, sauce claire et attiéké." },
      { id: "M11", nom: "Jus de bissap", categorie: "boisson", prix: 1000, allergenes: [], niveauPiment: 0, disponible: true, stockPortions: null, description: "Infusion d'hibiscus glacée, préparée maison." },
      { id: "M12", nom: "Jus de gingembre", categorie: "boisson", prix: 1000, allergenes: [], niveauPiment: 0, disponible: true, stockPortions: null, description: "Gingembre frais pressé, peu sucré, très rafraîchissant." },
      { id: "M13", nom: "Eau minérale (50cl)", categorie: "boisson", prix: 500, allergenes: [], niveauPiment: 0, disponible: true, stockPortions: null, description: "Eau plate en bouteille fraîche." },
      { id: "M14", nom: "Ananas frais", categorie: "dessert", prix: 1000, allergenes: [], niveauPiment: 0, disponible: true, stockPortions: 20, description: "Tranches d'ananas mûr de Bonoua." },
    ];
    this.prixParPlat = new Map(this.menu.map((plat) => [plat.nom, plat.prix]));
    this.genererDonnees();
    this.genererEquipeEtService();
  }

  async listerTables(): Promise<TableInfo[]> {
    return this.tables.map((table) => ({ ...table }));
  }

  async verifierDisponibilite(date: string, heure: string, nombrePersonnes: number): Promise<DisponibiliteResultat> {
    this.validerEntrees(date, heure, nombrePersonnes);
    const resultat = calculerDisponibilite(this.tables, this.reservations, date, heure, nombrePersonnes);
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
    const disponibilite = calculerDisponibilite(
      this.tables,
      this.reservations,
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
    const reservation: ReservationRecord = {
      code: this.nouveauCode(),
      date: entree.date,
      heure: entree.heure,
      nombrePersonnes: entree.nombrePersonnes,
      nomClient: entree.nomClient.trim(),
      telephone: normaliserTelephone(entree.telephone),
      tableId: disponibilite.tableRecommandee.id,
      statut: "CONFIRMEE",
      notes: entree.notes ?? "",
      creeLe: toISODate(new Date()),
    };
    this.reservations.push(reservation);
    return { ...reservation };
  }

  async rechercherReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]> {
    const telephone = filtre.telephone ? normaliserTelephone(filtre.telephone) : null;
    return this.reservations
      .filter((reservation) => {
        if (filtre.code && reservation.code.toUpperCase() !== filtre.code.toUpperCase()) return false;
        if (telephone && reservation.telephone !== telephone) return false;
        if (filtre.nom && !reservation.nomClient.toLowerCase().includes(filtre.nom.toLowerCase())) return false;
        return true;
      })
      .map((reservation) => ({ ...reservation }));
  }

  async modifierReservation(
    code: string,
    telephone: string,
    changements: ReservationModifInput
  ): Promise<ReservationRecord> {
    const reservation = this.trouverReservationActive(code);
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
    const disponibilite = calculerDisponibilite(
      this.tables,
      this.reservations,
      nouvelleDate,
      nouvelleHeure,
      nouveauNombre,
      reservation.code
    );
    if (!disponibilite.tableRecommandee) {
      const alternatives = disponibilite.creneauxAlternatifs.map((creneau) => creneau.heure).join(", ");
      throw new Error(
        `Impossible de déplacer la réservation ${reservation.code} : aucune table de ${nouveauNombre} couverts le ${nouvelleDate} à ${nouvelleHeure}. Créneaux proches : ${alternatives || "aucun"}.`
      );
    }
    reservation.date = nouvelleDate;
    reservation.heure = nouvelleHeure;
    reservation.nombrePersonnes = nouveauNombre;
    reservation.tableId = disponibilite.tableRecommandee.id;
    reservation.notes = changements.notes ?? reservation.notes;
    return { ...reservation };
  }

  async annulerReservation(code: string, telephone: string): Promise<ReservationRecord> {
    const reservation = this.trouverReservationActive(code);
    if (reservation.telephone !== normaliserTelephone(telephone)) {
      throw new Error(`Le numéro de téléphone ne correspond pas à la réservation ${reservation.code}.`);
    }
    reservation.statut = "ANNULLEE";
    return { ...reservation };
  }

  async listerReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]> {
    return this.reservations
      .filter((reservation) => {
        if (filtre.dateDebut && reservation.date < filtre.dateDebut) return false;
        if (filtre.dateFin && reservation.date > filtre.dateFin) return false;
        if (filtre.statut && reservation.statut !== filtre.statut) return false;
        return true;
      })
      .sort((a, b) => (a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date)))
      .map((reservation) => ({ ...reservation }));
  }

  async listerMenu(): Promise<PlatMenu[]> {
    return this.menu.map((plat) => ({ ...plat, allergenes: [...plat.allergenes] }));
  }

  async obtenirPlat(nomOuId: string): Promise<PlatMenu | null> {
    const recherche = nomOuId.trim().toLowerCase();
    const platExact = this.menu.find(
      (plat) => plat.nom.toLowerCase() === recherche || plat.id.toLowerCase() === recherche
    );
    const plat = platExact ?? this.menu.find((plat) => plat.nom.toLowerCase().includes(recherche));
    return plat ? { ...plat, allergenes: [...plat.allergenes] } : null;
  }

  async listerFactures(dateDebut: string, dateFin: string): Promise<FactureRecord[]> {
    return this.factures
      .filter((facture) => facture.date >= dateDebut && facture.date <= dateFin)
      .map((facture) => ({ ...facture, lignes: facture.lignes.map((ligne) => ({ ...ligne })) }));
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

  private trouverReservationActive(code: string): ReservationRecord {
    const reservation = this.reservations.find(
      (element) => element.code.toUpperCase() === code.trim().toUpperCase() && element.statut === "CONFIRMEE"
    );
    if (!reservation) {
      throw new Error(`Réservation introuvable ou déjà clôturée : ${code}.`);
    }
    return reservation;
  }

  private nouveauCode(): string {
    let code = genererCodeReservation(this.aleatoire);
    while (this.reservations.some((reservation) => reservation.code === code)) {
      code = genererCodeReservation(this.aleatoire);
    }
    return code;
  }

  private genererTelephone(): string {
    const prefixe = tirageAleatoire(["07", "05", "01"], this.aleatoire);
    const chiffres = Array.from({ length: 8 }, () => Math.floor(this.aleatoire() * 10)).join("");
    return `+225 ${prefixe} ${chiffres.slice(0, 2)} ${chiffres.slice(2, 4)} ${chiffres.slice(4, 6)} ${chiffres.slice(6, 8)}`;
  }

  private genererDonnees(): void {
    const aujourdhui = new Date();
    for (let decalage = -28; decalage <= 21; decalage++) {
      const date = ajouterJours(aujourdhui, decalage);
      const iso = toISODate(date);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const finDeMois = date.getDate() >= 24;
      let nombre = 2 + Math.floor(this.aleatoire() * 2);
      if (weekend) nombre += 4;
      if (weekend && finDeMois) nombre += 6;
      for (let index = 0; index < nombre; index++) {
        const heure = weekend && finDeMois
          ? tirageAleatoire(index % 4 !== 3 ? HEURES_DINER : HEURES_DEJEUNER, this.aleatoire)
          : tirageAleatoire(HEURES_SERVICE, this.aleatoire);
        const personnes = weekend && finDeMois
          ? 4 + Math.floor(this.aleatoire() * 5)
          : 2 + Math.floor(this.aleatoire() * 5);
        const disponibilite = calculerDisponibilite(this.tables, this.reservations, iso, heure, personnes);
        if (!disponibilite.tableRecommandee) continue;
        const table = disponibilite.tableRecommandee;
        const statut: StatutReservation = decalage < 0
          ? this.aleatoire() < 0.07 ? "NO_SHOW" : this.aleatoire() < 0.05 ? "ANNULLEE" : "CONFIRMEE"
          : "CONFIRMEE";
        this.reservations.push({
          code: this.nouveauCode(),
          date: iso,
          heure,
          nombrePersonnes: personnes,
          nomClient: tirageAleatoire(NOMS_CLIENTS, this.aleatoire),
          telephone: this.genererTelephone(),
          tableId: table.id,
          statut,
          notes: "",
          creeLe: toISODate(ajouterJours(date, -1)),
        });
      }
    }
    this.genererFactures(aujourdhui);
  }

  private genererFactures(aujourdhui: Date): void {
    const platsPonderes: Array<[string, number]> = [
      ["Poisson braisé (capitaine)", 5],
      ["Poulet braisé", 4],
      ["Alloco", 4],
      ["Attiéké", 3],
      ["Choukouya de bœuf", 2],
      ["Kedjenou de poulet", 2],
      ["Sauce arachide", 2],
      ["Alloco-poulet", 2],
      ["Poisson frit", 2],
      ["Riz gras", 2],
      ["Jus de bissap", 3],
      ["Jus de gingembre", 2],
      ["Eau minérale (50cl)", 3],
      ["Ananas frais", 1],
    ];
    for (let decalage = -35; decalage <= 0; decalage++) {
      const date = ajouterJours(aujourdhui, decalage);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const finDeMois = date.getDate() >= 24;
      let nombre = 3 + Math.floor(this.aleatoire() * 2);
      if (weekend) nombre += 3;
      if (weekend && finDeMois) nombre += 2;
      if (decalage === 0) nombre = Math.max(2, Math.floor(nombre / 2));
      const coefficient = decalage >= -7 ? 1.2 : 1;
      for (let index = 0; index < nombre; index++) {
        const lignes: LigneFacture[] = [];
        const nombreLignes = 1 + Math.floor(this.aleatoire() * 3);
        for (let position = 0; position < nombreLignes; position++) {
          const plat = tiragePondere(platsPonderes, this.aleatoire);
          const quantite = Math.max(1, Math.round((1 + this.aleatoire() * 2) * coefficient));
          const prix = this.prixParPlat.get(plat) ?? 1000;
          lignes.push({ plat, quantite, montant: prix * quantite });
        }
        const montantTotal = lignes.reduce((total, ligne) => total + ligne.montant, 0);
        this.factures.push({
          id: `FA-${String(this.factures.length + 1).padStart(4, "0")}`,
          date: toISODate(date),
          montantTotal,
          statut: this.aleatoire() < 0.9 ? "payee" : "en_attente",
          lignes,
        });
      }
    }
  }

  async listerEmployes(): Promise<EmployeRecord[]> {
    return this.employes.map((employe) => ({ ...employe }));
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
    const employe: EmployeRecord = {
      id: this.nouvelIdEmploye(),
      nom: entree.nom.trim(),
      fonction: entree.fonction,
      telephone: entree.telephone.trim(),
      actif: true,
      creeLe: toISODate(new Date()),
    };
    this.employes.push(employe);
    return { ...employe };
  }

  async listerCommandes(filtre: CommandeFiltre): Promise<CommandeRecord[]> {
    return this.commandes
      .filter((commande) => {
        if (filtre.date && commande.date !== filtre.date) return false;
        if (filtre.statut && commande.statut !== filtre.statut) return false;
        if (filtre.tableId && commande.tableId !== filtre.tableId) return false;
        if (filtre.serveurId && commande.serveurId !== filtre.serveurId) return false;
        return true;
      })
      .sort((a, b) => (a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date)))
      .map((commande) => this.copierCommande(commande));
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
      const table = this.tables.find((element) => element.id === entree.tableId);
      if (!table) throw new Error(`Table introuvable : ${entree.tableId}.`);
    }
    if (entree.reservationCode) {
      const reservation = this.reservations.find(
        (element) => element.code.toUpperCase() === entree.reservationCode!.toUpperCase()
      );
      if (!reservation) throw new Error(`Réservation introuvable : ${entree.reservationCode}.`);
    }
    if (entree.serveurId) {
      const serveur = this.employes.find((employe) => employe.id === entree.serveurId);
      if (!serveur || serveur.fonction !== "serveur") {
        throw new Error(`Serveur introuvable : ${entree.serveurId}.`);
      }
    }
    const maintenant = new Date();
    const commande: CommandeRecord = {
      id: this.nouvelleIdCommande(),
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
    this.commandes.push(commande);
    for (const ligne of lignes) {
      const platReel = this.menu.find((element) => element.nom === ligne.plat);
      if (platReel && platReel.stockPortions !== null) {
        platReel.stockPortions = Math.max(0, platReel.stockPortions - ligne.quantite);
        if (platReel.stockPortions === 0) platReel.disponible = false;
      }
    }
    return this.copierCommande(commande);
  }

  async majStatutCommande(id: string, statut: StatutCommande): Promise<CommandeRecord> {
    const commande = this.trouverCommande(id);
    commande.statut = statut;
    return this.copierCommande(commande);
  }

  async assignerCommande(id: string, changements: CommandeAssignationInput): Promise<CommandeRecord> {
    const commande = this.trouverCommande(id);
    if (changements.serveurId !== undefined) {
      if (changements.serveurId === null) {
        commande.serveurId = null;
      } else {
        const serveur = this.employes.find((employe) => employe.id === changements.serveurId);
        if (!serveur || serveur.fonction !== "serveur" || !serveur.actif) {
          throw new Error(`Serveur introuvable ou inactif : ${changements.serveurId}.`);
        }
        commande.serveurId = serveur.id;
      }
    }
    if (changements.cuisinierId !== undefined) {
      if (changements.cuisinierId === null) {
        commande.cuisinierId = null;
      } else {
        const cuisinier = this.employes.find((employe) => employe.id === changements.cuisinierId);
        if (!cuisinier || cuisinier.fonction !== "cuisinier" || !cuisinier.actif) {
          throw new Error(`Cuisinier introuvable ou inactif : ${changements.cuisinierId}.`);
        }
        commande.cuisinierId = cuisinier.id;
      }
    }
    return this.copierCommande(commande);
  }

  async listerAffectations(date: string): Promise<AffectationRecord[]> {
    return this.affectations
      .filter((affectation) => affectation.date === date)
      .map((affectation) => ({ ...affectation }));
  }

  async affecterReservation(date: string, reservationCode: string, serveurId: string): Promise<AffectationRecord> {
    const reservation = this.reservations.find(
      (element) => element.code.toUpperCase() === reservationCode.trim().toUpperCase()
    );
    if (!reservation || reservation.date !== date || reservation.statut !== "CONFIRMEE") {
      throw new Error(`Réservation confirmée introuvable pour le ${date} : ${reservationCode}.`);
    }
    const serveur = this.employes.find((employe) => employe.id === serveurId);
    if (!serveur || serveur.fonction !== "serveur" || !serveur.actif) {
      throw new Error(`Serveur introuvable ou inactif : ${serveurId}.`);
    }
    const index = this.affectations.findIndex(
      (affectation) => affectation.date === date && affectation.reservationCode.toUpperCase() === reservationCode.toUpperCase()
    );
    const affectation: AffectationRecord = {
      date,
      reservationCode: reservation.code,
      serveurId: serveur.id,
      creeLe: toISODate(new Date()),
    };
    if (index >= 0) this.affectations[index] = affectation;
    else this.affectations.push(affectation);
    return { ...affectation };
  }

  async retirerAffectation(date: string, reservationCode: string): Promise<void> {
    const index = this.affectations.findIndex(
      (affectation) => affectation.date === date && affectation.reservationCode.toUpperCase() === reservationCode.trim().toUpperCase()
    );
    if (index < 0) {
      throw new Error(`Aucune affectation trouvée pour la réservation ${reservationCode} le ${date}.`);
    }
    this.affectations.splice(index, 1);
  }

  async listerPlanning(dateDebut: string, dateFin: string): Promise<ShiftRecord[]> {
    return this.planning
      .filter((shift) => shift.date >= dateDebut && shift.date <= dateFin)
      .sort((a, b) => (a.date === b.date ? a.debut.localeCompare(b.debut) : a.date.localeCompare(b.date)))
      .map((shift) => ({ ...shift }));
  }

  async creerShift(entree: ShiftCreeInput): Promise<ShiftRecord> {
    const employe = this.employes.find((element) => element.id === entree.employeId);
    if (!employe || !employe.actif) {
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
    const shift: ShiftRecord = {
      id: this.nouvelIdShift(),
      date: entree.date,
      employeId: entree.employeId,
      debut: entree.debut,
      fin: entree.fin,
      poste: entree.poste,
    };
    this.planning.push(shift);
    return { ...shift };
  }

  async supprimerShift(id: string): Promise<void> {
    const index = this.planning.findIndex((shift) => shift.id === id);
    if (index < 0) throw new Error(`Shift introuvable : ${id}.`);
    this.planning.splice(index, 1);
  }

  private copierCommande(commande: CommandeRecord): CommandeRecord {
    return { ...commande, lignes: commande.lignes.map((ligne) => ({ ...ligne })) };
  }

  private trouverCommande(id: string): CommandeRecord {
    const commande = this.commandes.find((element) => element.id.toUpperCase() === id.trim().toUpperCase());
    if (!commande) throw new Error(`Commande introuvable : ${id}.`);
    return commande;
  }

  private nouvelIdEmploye(): string {
    let numero = this.employes.length + 1;
    let id = `EMP-${String(numero).padStart(2, "0")}`;
    while (this.employes.some((employe) => employe.id === id)) {
      numero += 1;
      id = `EMP-${String(numero).padStart(2, "0")}`;
    }
    return id;
  }

  private nouvelleIdCommande(): string {
    let numero = this.commandes.length + 1;
    let id = `CMD-${String(numero).padStart(4, "0")}`;
    while (this.commandes.some((commande) => commande.id === id)) {
      numero += 1;
      id = `CMD-${String(numero).padStart(4, "0")}`;
    }
    return id;
  }

  private nouvelIdShift(): string {
    let numero = this.planning.length + 1;
    let id = `SH-${String(numero).padStart(3, "0")}`;
    while (this.planning.some((shift) => shift.id === id)) {
      numero += 1;
      id = `SH-${String(numero).padStart(3, "0")}`;
    }
    return id;
  }

  private genererEquipeEtService(): void {
    const iso = toISODate(new Date());
    this.employes.push(
      { id: "EMP-01", nom: "Amadou Ba", fonction: "patron", telephone: "+225 07 07 12 34 56", actif: true, creeLe: iso },
      { id: "EMP-02", nom: "Awa Koné", fonction: "serveur", telephone: "+225 05 45 67 89 01", actif: true, creeLe: iso },
      { id: "EMP-03", nom: "Yao N'Guessan", fonction: "serveur", telephone: "+225 01 23 45 67 89", actif: true, creeLe: iso },
      { id: "EMP-04", nom: "Mariam Touré", fonction: "cuisinier", telephone: "+225 07 88 76 54 32", actif: true, creeLe: iso },
      { id: "EMP-05", nom: "Koffi Yao", fonction: "cuisinier", telephone: "+225 05 11 22 33 44", actif: true, creeLe: iso },
      { id: "EMP-06", nom: "Bintou Sanogo", fonction: "barman", telephone: "+225 01 98 76 54 32", actif: true, creeLe: iso },
      { id: "EMP-07", nom: "Serge Kouadio", fonction: "caissier", telephone: "+225 07 55 44 33 22", actif: true, creeLe: iso }
    );
    const serveurs = this.employes.filter((employe) => employe.fonction === "serveur");
    const resasJour = this.reservations
      .filter((reservation) => reservation.date === iso && reservation.statut === "CONFIRMEE")
      .sort((a, b) => a.heure.localeCompare(b.heure));
    resasJour.forEach((reservation, index) => {
      if (index % 4 === 3) return;
      this.affectations.push({
        date: iso,
        reservationCode: reservation.code,
        serveurId: serveurs[index % serveurs.length].id,
        creeLe: iso,
      });
    });
    const statutsService: StatutCommande[] = ["PAYEE", "SERVIE", "PRETE", "EN_CUISINE", "EN_ATTENTE"];
    const cuisiniers = this.employes.filter((employe) => employe.fonction === "cuisinier");
    resasJour.slice(0, 5).forEach((reservation, index) => {
      const nombreLignes = 2 + (index % 2);
      const lignes: LigneCommande[] = [];
      for (let position = 0; position < nombreLignes; position++) {
        const plat = tirageAleatoire(this.menu, this.aleatoire);
        const quantite = 1 + Math.floor(this.aleatoire() * 2);
        lignes.push({ plat: plat.nom, quantite, prix: plat.prix, notes: "" });
      }
      const affectation = this.affectations.find((element) => element.reservationCode === reservation.code);
      this.commandes.push({
        id: `CMD-${String(this.commandes.length + 1).padStart(4, "0")}`,
        date: iso,
        heure: reservation.heure,
        tableId: reservation.tableId,
        reservationCode: reservation.code,
        serveurId: affectation ? affectation.serveurId : serveurs[index % serveurs.length].id,
        cuisinierId: statutsService[index] === "EN_ATTENTE" ? null : cuisiniers[index % cuisiniers.length].id,
        statut: statutsService[index],
        mode: "sur_place",
        adresseLivraison: null,
        lignes,
        montantTotal: lignes.reduce((total, ligne) => total + ligne.prix * ligne.quantite, 0),
        creeLe: iso,
      });
    });
    for (let decalage = -1; decalage <= 6; decalage++) {
      const jour = toISODate(ajouterJours(new Date(), decalage));
      for (const employe of this.employes) {
        if (employe.fonction === "patron") continue;
        const creneaux: Record<string, { debut: string; fin: string; poste: PosteShift }> = {
          serveur: { debut: "18:00", fin: "23:30", poste: "salle" },
          cuisinier: { debut: "16:00", fin: "23:00", poste: "cuisine" },
          barman: { debut: "17:00", fin: "23:30", poste: "bar" },
          caissier: { debut: "18:00", fin: "23:30", poste: "caisse" },
        };
        const creneau = creneaux[employe.fonction];
        const alternance = employe.fonction === "serveur" && employe.id === "EMP-03";
        this.planning.push({
          id: `SH-${String(this.planning.length + 1).padStart(3, "0")}`,
          date: jour,
          employeId: employe.id,
          debut: alternance ? "11:00" : creneau.debut,
          fin: alternance ? "15:30" : creneau.fin,
          poste: creneau.poste,
        });
      }
    }
  }
}
