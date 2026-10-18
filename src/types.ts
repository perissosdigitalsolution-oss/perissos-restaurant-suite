export type Role = "RESTAURANT_ADMIN" | "SERVER" | "KITCHEN" | "BAR" | "CASHIER" | "CLIENT";

export type Canal = "whatsapp" | "web" | "backoffice";

export interface SessionContext {
  idSession: string;
  nomUtilisateur: string;
  role: Role;
  canal: Canal;
  organizationId: string;
  tenantId: string;
  telephone?: string;
}

export type Emplacement = "salle" | "terrasse" | "vip";

export interface TableInfo {
  id: string;
  nom: string;
  capacite: number;
  emplacement: Emplacement;
}

export type StatutReservation = "CONFIRMEE" | "ANNULLEE" | "NO_SHOW";

export interface ReservationRecord {
  code: string;
  date: string;
  heure: string;
  nombrePersonnes: number;
  nomClient: string;
  telephone: string;
  tableId: string | null;
  statut: StatutReservation;
  notes: string;
  creeLe: string;
}

export interface ReservationCreeInput {
  date: string;
  heure: string;
  nombrePersonnes: number;
  nomClient: string;
  telephone: string;
  notes?: string;
}

export interface ReservationModifInput {
  date?: string;
  heure?: string;
  nombrePersonnes?: number;
  notes?: string;
}

export interface ReservationFiltre {
  code?: string;
  telephone?: string;
  nom?: string;
  dateDebut?: string;
  dateFin?: string;
  statut?: StatutReservation;
}

export type CategorieMenu = "entree" | "plat" | "grillades" | "accompagnement" | "boisson" | "dessert";

export interface PlatMenu {
  id: string;
  nom: string;
  categorie: CategorieMenu;
  prix: number;
  allergenes: string[];
  niveauPiment: number;
  disponible: boolean;
  stockPortions: number | null;
  description: string;
}

export interface LigneFacture {
  plat: string;
  quantite: number;
  montant: number;
}

export interface FactureRecord {
  id: string;
  date: string;
  montantTotal: number;
  statut: "payee" | "en_attente";
  lignes: LigneFacture[];
}

export interface CreneauAlternatif {
  heure: string;
}

export interface DisponibiliteResultat {
  date: string;
  heure: string;
  nombrePersonnes: number;
  disponible: boolean;
  tablesLibres: TableInfo[];
  tableRecommandee: TableInfo | null;
  creneauxAlternatifs: CreneauAlternatif[];
}

export type FonctionEmploye = "patron" | "serveur" | "cuisinier" | "barman" | "caissier";

export interface EmployeRecord {
  id: string;
  nom: string;
  fonction: FonctionEmploye;
  telephone: string;
  actif: boolean;
  creeLe: string;
}

export interface EmployeCreeInput {
  nom: string;
  fonction: FonctionEmploye;
  telephone: string;
}

export type StatutCommande = "EN_ATTENTE" | "EN_CUISINE" | "PRETE" | "SERVIE" | "PAYEE";
export type ModeCommande = "sur_place" | "a_emporter" | "livraison";

export interface LigneCommande {
  plat: string;
  quantite: number;
  prix: number;
  notes: string;
}

export interface CommandeRecord {
  id: string;
  date: string;
  heure: string;
  tableId: string | null;
  reservationCode: string | null;
  serveurId: string | null;
  cuisinierId: string | null;
  statut: StatutCommande;
  mode: ModeCommande;
  adresseLivraison: string | null;
  lignes: LigneCommande[];
  montantTotal: number;
  creeLe: string;
}

export interface CommandeCreeInput {
  tableId?: string | null;
  reservationCode?: string | null;
  serveurId?: string | null;
  mode?: ModeCommande | null;
  adresseLivraison?: string | null;
  lignes: Array<{ plat: string; quantite: number; notes?: string }>;
  idempotencyKey?: string;
}

export interface CommandeFiltre {
  date?: string;
  statut?: StatutCommande;
  tableId?: string;
  serveurId?: string;
}

export interface CommandeAssignationInput {
  serveurId?: string | null;
  cuisinierId?: string | null;
}

export interface AffectationRecord {
  date: string;
  reservationCode: string;
  serveurId: string;
  creeLe: string;
}

export type PosteShift = "salle" | "cuisine" | "bar" | "caisse";

export interface ShiftRecord {
  id: string;
  date: string;
  employeId: string;
  debut: string;
  fin: string;
  poste: PosteShift;
}

export interface ShiftCreeInput {
  date: string;
  employeId: string;
  debut: string;
  fin: string;
  poste: PosteShift;
}
