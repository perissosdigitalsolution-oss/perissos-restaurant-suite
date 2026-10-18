import type { ConfigEverGauzy } from "../config.js";
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
  LigneFacture,
  PlatMenu,
  ReservationCreeInput,
  ReservationFiltre,
  ReservationModifInput,
  ReservationRecord,
  ShiftCreeInput,
  ShiftRecord,
  StatutCommande,
  TableInfo,
} from "../types.js";
import type { AdaptateurDonneesRestaurant } from "./adaptateur.js";
import { calculerDisponibilite } from "./disponibilite.js";
import { AdaptateurPostgres } from "./adaptateur-postgres.js";
import { toISODate } from "../utils.js";

type ConfigurationLive = ConfigEverGauzy & { organizationId: string; tenantId: string };

export class AdaptateurEverGauzy implements AdaptateurDonneesRestaurant {
  private readonly operationnel = new AdaptateurPostgres();

  constructor(private readonly configuration: ConfigurationLive) {
    if (!configuration.baseUrl || !configuration.apiToken) {
      throw new Error("Mode live Ever Gauzy : EVERGAUZY_BASE_URL et EVERGAUZY_API_TOKEN sont obligatoires dans le fichier .env.");
    }
  }

  private async requete<T>(
    chemin: string,
    options?: { methode?: string; parametres?: Record<string, string | number | undefined>; corps?: unknown }
  ): Promise<T> {
    const base = this.configuration.baseUrl.replace(/\/+$/, "");
    const url = new URL(`${base}${chemin}`);
    for (const [cle, valeur] of Object.entries(options?.parametres ?? {})) {
      if (valeur !== undefined) url.searchParams.set(cle, String(valeur));
    }
    url.searchParams.set("organizationId", this.configuration.organizationId);
    url.searchParams.set("tenantId", this.configuration.tenantId);
    const reponse = await fetch(url, {
      method: options?.methode ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.configuration.apiToken}`,
        "Tenant-Id": this.configuration.tenantId,
      },
      body: options?.corps === undefined ? undefined : JSON.stringify(options.corps),
    });
    if (!reponse.ok) {
      const corps = await reponse.text();
      const indice =
        reponse.status === 404
          ? ` Vérifiez le chemin « ${chemin} » configuré via les variables EVERGAUZY_*_PATH du fichier .env.`
          : "";
      throw new Error(`Ever Gauzy ${reponse.status} sur ${chemin} : ${corps.slice(0, 300)}${indice}`);
    }
    if (reponse.status === 204) {
      return undefined as T;
    }
    return (await reponse.json()) as T;
  }

  private extraireElements<T>(corps: unknown): T[] {
    if (Array.isArray(corps)) return corps as T[];
    const enveloppe = corps as { items?: unknown; data?: unknown | { items?: unknown } };
    if (Array.isArray(enveloppe?.items)) return enveloppe.items as T[];
    if (Array.isArray(enveloppe?.data)) return enveloppe.data as T[];
    if (enveloppe?.data && Array.isArray((enveloppe.data as { items?: unknown }).items)) {
      return (enveloppe.data as { items: T[] }).items;
    }
    return [];
  }

  private versTable(brut: Record<string, unknown>): TableInfo {
    return {
      id: String(brut.id ?? brut.publicId ?? brut.name ?? ""),
      nom: String(brut.name ?? brut.title ?? `Table ${brut.id ?? ""}`),
      capacite: Number(brut.capacity ?? brut.seats ?? brut.sits ?? brut.numberOfSeats ?? 4),
      emplacement: brut.location === "terrasse" || brut.location === "vip" ? brut.location : "salle",
    };
  }

  private versReservation(brut: Record<string, unknown>): ReservationRecord {
    const horodatage = String(brut.reservationDate ?? brut.date ?? brut.startedAt ?? "");
    const correspondanceHeure = String(brut.startTime ?? brut.heure ?? brut.startedAt ?? "").match(/(\d{2}:\d{2})/);
    const statutBrut = String(brut.statut ?? brut.status ?? "");
    return {
      code: String(brut.code ?? brut.publicId ?? brut.id ?? ""),
      date: /^\d{4}-\d{2}-\d{2}/.test(horodatage) ? horodatage.slice(0, 10) : toISODate(new Date(horodatage || Date.now())),
      heure: correspondanceHeure ? correspondanceHeure[1] : "19:00",
      nombrePersonnes: Number(brut.seats ?? brut.nombrePersonnes ?? brut.guests ?? brut.numberOfGuests ?? 2),
      nomClient: String(brut.clientName ?? brut.nomClient ?? brut.name ?? ""),
      telephone: String(brut.phone ?? brut.telephone ?? ""),
      tableId: brut.tableId !== undefined && brut.tableId !== null ? String(brut.tableId) : null,
      statut: statutBrut === "ANNULLEE" || statutBrut === "cancelled" || statutBrut === "canceled"
        ? "ANNULLEE"
        : statutBrut === "NO_SHOW" || statutBrut === "noShow"
          ? "NO_SHOW"
          : "CONFIRMEE",
      notes: String(brut.notes ?? ""),
      creeLe: toISODate(new Date()),
    };
  }

  private versPlat(brut: Record<string, unknown>): PlatMenu {
    return {
      id: String(brut.id ?? brut.publicId ?? brut.slug ?? ""),
      nom: String(brut.name ?? brut.title ?? ""),
      categorie: "plat",
      prix: Number(brut.price ?? brut.unitPrice ?? brut.cost ?? 0),
      allergenes: Array.isArray(brut.allergenes) ? brut.allergenes.map((element) => String(element)) : [],
      niveauPiment: Number(brut.niveauPiment ?? 0),
      disponible: brut.enabled !== false && brut.isActive !== false,
      stockPortions: brut.quantity !== undefined && brut.quantity !== null ? Number(brut.quantity) : null,
      description: String(brut.description ?? ""),
    };
  }

  private versFacture(brut: Record<string, unknown>): FactureRecord {
    const lignesBrutes = Array.isArray(brut.invoiceItems)
      ? brut.invoiceItems
      : Array.isArray(brut.items)
        ? brut.items
        : [];
    const lignes: LigneFacture[] = lignesBrutes.map((element) => {
      const ligne = element as Record<string, unknown>;
      return {
        plat: String(ligne.description ?? ligne.name ?? ligne.productName ?? "Article"),
        quantite: Number(ligne.quantity ?? 1),
        montant: Number(ligne.totalValue ?? ligne.total ?? ligne.amount ?? 0),
      };
    });
    const horodatage = String(brut.invoiceDate ?? brut.date ?? brut.created_at ?? "");
    return {
      id: String(brut.id ?? brut.publicId ?? brut.invoiceNumber ?? ""),
      date: /^\d{4}-\d{2}-\d{2}/.test(horodatage) ? horodatage.slice(0, 10) : toISODate(new Date(horodatage || Date.now())),
      montantTotal: Number(brut.totalValue ?? brut.total ?? 0),
      statut: brut.isPaid === true || String(brut.status ?? "").toUpperCase() === "PAID" ? "payee" : "en_attente",
      lignes,
    };
  }

  async listerTables(): Promise<TableInfo[]> {
    const brut = await this.requete<unknown>(this.configuration.chemins.tables);
    return this.extraireElements<Record<string, unknown>>(brut)
      .filter((element) => element && (element.id !== undefined || element.name !== undefined))
      .map((element) => this.versTable(element));
  }

  async verifierDisponibilite(date: string, heure: string, nombrePersonnes: number): Promise<DisponibiliteResultat> {
    const [tables, reservations] = await Promise.all([
      this.listerTables(),
      this.listerReservations({ dateDebut: date, dateFin: date }),
    ]);
    const resultat = calculerDisponibilite(tables, reservations, date, heure, nombrePersonnes);
    return { date, heure, nombrePersonnes, ...resultat };
  }

  async creerReservation(entree: ReservationCreeInput): Promise<ReservationRecord> {
    const disponibilite = await this.verifierDisponibilite(entree.date, entree.heure, entree.nombrePersonnes);
    if (!disponibilite.tableRecommandee) {
      const alternatives = disponibilite.creneauxAlternatifs.map((creneau) => creneau.heure).join(", ");
      throw new Error(
        `Plus aucune table de ${entree.nombrePersonnes} couverts le ${entree.date} à ${entree.heure}. Créneaux proches disponibles : ${alternatives || "aucun"}.`
      );
    }
    const brut = await this.requete<Record<string, unknown>>(this.configuration.chemins.reservations, {
      methode: "POST",
      corps: {
        reservationDate: entree.date,
        startTime: entree.heure,
        seats: entree.nombrePersonnes,
        clientName: entree.nomClient,
        phone: entree.telephone,
        notes: entree.notes ?? "",
        tableId: disponibilite.tableRecommandee.id,
      },
    });
    return this.versReservation(brut ?? entree as unknown as Record<string, unknown>);
  }

  async rechercherReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]> {
    const brut = await this.requete<unknown>(this.configuration.chemins.reservations, {
      parametres: { code: filtre.code, phone: filtre.telephone, name: filtre.nom },
    });
    return this.extraireElements<Record<string, unknown>>(brut).map((element) => this.versReservation(element));
  }

  async modifierReservation(
    code: string,
    telephone: string,
    changements: ReservationModifInput
  ): Promise<ReservationRecord> {
    const reservations = await this.rechercherReservations({ code });
    const reservation = reservations.find((element) => element.code === code);
    if (!reservation) {
      throw new Error(`Réservation introuvable : ${code}.`);
    }
    if (reservation.telephone.replace(/\D/g, "") !== telephone.replace(/\D/g, "")) {
      throw new Error(`Le numéro de téléphone ne correspond pas à la réservation ${code}.`);
    }
    const corps = Object.fromEntries(
      Object.entries({
        reservationDate: changements.date,
        startTime: changements.heure,
        seats: changements.nombrePersonnes,
        notes: changements.notes,
      }).filter(([, valeur]) => valeur !== undefined)
    );
    const brut = await this.requete<Record<string, unknown>>(
      `${this.configuration.chemins.reservations}/${encodeURIComponent(code)}`,
      { methode: "PATCH", corps }
    );
    if (brut && Object.keys(brut).length > 0) {
      return this.versReservation(brut);
    }
    const relues = await this.rechercherReservations({ code });
    const relue = relues.find((element) => element.code === code);
    if (!relue) {
      throw new Error(`Impossible de relire la réservation ${code} après modification.`);
    }
    return relue;
  }

  async annulerReservation(code: string, telephone: string): Promise<ReservationRecord> {
    const reservations = await this.rechercherReservations({ code });
    const reservation = reservations.find((element) => element.code === code);
    if (!reservation) {
      throw new Error(`Réservation introuvable : ${code}.`);
    }
    if (reservation.telephone.replace(/\D/g, "") !== telephone.replace(/\D/g, "")) {
      throw new Error(`Le numéro de téléphone ne correspond pas à la réservation ${code}.`);
    }
    await this.requete(`${this.configuration.chemins.reservations}/${encodeURIComponent(code)}`, {
      methode: "PATCH",
      corps: { status: "cancelled", statut: "ANNULLEE" },
    });
    return { ...reservation, statut: "ANNULLEE" };
  }

  async listerReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]> {
    const brut = await this.requete<unknown>(this.configuration.chemins.reservations, {
      parametres: { startDate: filtre.dateDebut, endDate: filtre.dateFin, status: filtre.statut },
    });
    return this.extraireElements<Record<string, unknown>>(brut)
      .map((element) => this.versReservation(element))
      .filter((reservation) => {
        if (filtre.dateDebut && reservation.date < filtre.dateDebut) return false;
        if (filtre.dateFin && reservation.date > filtre.dateFin) return false;
        if (filtre.statut && reservation.statut !== filtre.statut) return false;
        return true;
      })
      .sort((a, b) => (a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date)));
  }

  async listerMenu(): Promise<PlatMenu[]> {
    const brut = await this.requete<unknown>(this.configuration.chemins.produits);
    return this.extraireElements<Record<string, unknown>>(brut)
      .filter((element) => element && (element.name !== undefined || element.id !== undefined))
      .map((element) => this.versPlat(element));
  }

  async obtenirPlat(nomOuId: string): Promise<PlatMenu | null> {
    const recherche = nomOuId.trim().toLowerCase();
    const menu = await this.listerMenu();
    const platExact = menu.find(
      (plat) => plat.nom.toLowerCase() === recherche || plat.id.toLowerCase() === recherche
    );
    return platExact ?? menu.find((plat) => plat.nom.toLowerCase().includes(recherche)) ?? null;
  }

  async listerFactures(dateDebut: string, dateFin: string): Promise<FactureRecord[]> {
    const brut = await this.requete<unknown>(this.configuration.chemins.factures, {
      parametres: { startDate: dateDebut, endDate: dateFin },
    });
    return this.extraireElements<Record<string, unknown>>(brut)
      .map((element) => this.versFacture(element))
      .filter((facture) => facture.date >= dateDebut && facture.date <= dateFin);
  }

  async listerEmployes(): Promise<EmployeRecord[]> {
    return this.operationnel.listerEmployes();
  }

  async creerEmploye(entree: EmployeCreeInput): Promise<EmployeRecord> {
    return this.operationnel.creerEmploye(entree);
  }

  async listerCommandes(filtre: CommandeFiltre): Promise<CommandeRecord[]> {
    return this.operationnel.listerCommandes(filtre);
  }

  async creerCommande(entree: CommandeCreeInput): Promise<CommandeRecord> {
    return this.operationnel.creerCommande(entree);
  }

  async majStatutCommande(id: string, statut: StatutCommande): Promise<CommandeRecord> {
    return this.operationnel.majStatutCommande(id, statut);
  }

  async assignerCommande(id: string, changements: CommandeAssignationInput): Promise<CommandeRecord> {
    return this.operationnel.assignerCommande(id, changements);
  }

  async listerAffectations(date: string): Promise<AffectationRecord[]> {
    return this.operationnel.listerAffectations(date);
  }

  async affecterReservation(date: string, reservationCode: string, serveurId: string): Promise<AffectationRecord> {
    return this.operationnel.affecterReservation(date, reservationCode, serveurId);
  }

  async retirerAffectation(date: string, reservationCode: string): Promise<void> {
    return this.operationnel.retirerAffectation(date, reservationCode);
  }

  async listerPlanning(dateDebut: string, dateFin: string): Promise<ShiftRecord[]> {
    return this.operationnel.listerPlanning(dateDebut, dateFin);
  }

  async creerShift(entree: ShiftCreeInput): Promise<ShiftRecord> {
    return this.operationnel.creerShift(entree);
  }

  async supprimerShift(id: string): Promise<void> {
    return this.operationnel.supprimerShift(id);
  }
}
