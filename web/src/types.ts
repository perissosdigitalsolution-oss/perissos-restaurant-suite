export type RoleWeb =
  | "RESTAURANT_ADMIN"
  | "SERVER"
  | "KITCHEN"
  | "BAR"
  | "CASHIER"
  | "CLIENT";

export type FonctionEmployeWeb = "patron" | "serveur" | "cuisinier" | "barman" | "caissier";

export type StatutCommandeWeb = "EN_ATTENTE" | "EN_CUISINE" | "PRETE" | "SERVIE" | "PAYEE";
export type ModeCommandeWeb = "sur_place" | "a_emporter" | "livraison";

export type PosteShiftWeb = "salle" | "cuisine" | "bar" | "caisse";

export interface EmployeWeb {
  id: string;
  nom: string;
  fonction: FonctionEmployeWeb;
  telephone: string | null;
  actif: boolean;
}

export interface LigneCommandeWeb {
  plat: string;
  quantite: number;
  prixUnitaire: number;
  notes: string | null;
}

export interface CommandeWeb {
  id: string;
  date: string;
  heure: string;
  tableId: string | null;
  tableName: string | null;
  reservationCode: string | null;
  serveurId: string | null;
  serveurNom: string | null;
  cuisinierId: string | null;
  cuisinierNom: string | null;
  statut: StatutCommandeWeb;
  mode: ModeCommandeWeb | null;
  lignes: LigneCommandeWeb[];
  montantTotal: number;
}

export interface ReservationAssignationWeb {
  code: string;
  date: string;
  heure: string;
  table: string | null;
  nomClient: string;
  telephone: string;
  nombrePersonnes: number;
  serveurId: string | null;
  serveurNom: string | null;
}

export interface AffectationsJourWeb {
  date: string;
  serveurs: EmployeWeb[];
  reservations: ReservationAssignationWeb[];
}

export interface ShiftWeb {
  id: string;
  date: string;
  employeId: string;
  employeNom: string;
  employeFonction: FonctionEmployeWeb;
  debut: string;
  fin: string;
  poste: PosteShiftWeb;
}

export interface ReservationWeb {
  code: string;
  date: string;
  heure: string;
  nombrePersonnes: number;
  nomClient: string;
  telephone: string;
  statut: "CONFIRMEE" | "ANNULLEE" | "NO_SHOW";
  table: string | null;
  notes: string;
  creeLe: string;
}

export interface DonneesRestaurant {
  nom: string;
  ville: string;
  aujourdhui: string;
  capacite: { nombreTables: number; couverts: number };
  equipe: boolean;
  reservationsJour: ReservationWeb[];
  reservationsAVenir: ReservationWeb[];
}

export interface PlatMenuWeb {
  nom: string;
  categorie: string;
  prix: number;
  description: string;
  niveauPiment: number;
  allergenes: string[];
  disponible: boolean;
  stockPortions: number | null;
}

export interface TopPlat {
  plat: string;
  quantite: number;
  partPourcent: number;
  chiffreAffairesFormate: string;
}

export interface AlerteStock {
  plat: string;
  stockRestant: number;
  seuil: number;
}

export interface ChiffreAffaires {
  periode: string;
  du: string;
  au: string;
  chiffreAffaires: number;
  chiffreAffairesFormate: string;
  nombreFactures: number;
  variationPourcent: number | null;
}

export interface PointAffluence {
  date: string;
  couverts: number;
  occupationPourcent: number;
}

export interface ClientFidele {
  nom: string;
  telephone: string;
  passages: number;
  derniereDate: string;
}

export interface Rapport {
  chiffre: ChiffreAffaires;
  chiffreJour: ChiffreAffaires;
  ventes: {
    topPlats: TopPlat[];
    alertesStock: AlerteStock[];
    ruptures: Array<{ plat: string }>;
  };
  previsions: {
    dateCible: string;
    jour: string;
    serveursRecommandes: number;
    serveursHabituels: number;
    tauxOccupationDinerPourcent: number;
    conseils: string[];
  };
  noShows: {
    total: number;
    reservations: Array<{
      code: string;
      date: string;
      heure: string;
      nomClient: string;
      telephone: string;
      nombrePersonnes: number;
    }>;
  };
  affluence: PointAffluence[];
  capaciteCouverts: number;
  clientsFideles: ClientFidele[];
  service: {
    commandesParStatut: Record<StatutCommandeWeb, number>;
    commandesOuvertes: number;
    montantEnCours: number;
    reservationsSansServeur: number;
    reservationsConfirmees: number;
    serveursActifs: number;
  };
}

export interface AppelOutilWeb {
  nom: string;
  succes: boolean;
}

export interface ReponseChat {
  reponse: string;
  appels: AppelOutilWeb[];
}

export interface MessageChat {
  auteur: "moi" | "chafik";
  texte: string;
  appels?: AppelOutilWeb[];
  erreur?: boolean;
}

export interface QuestionDiffered {
  id: number;
  texte: string;
}

export interface CompteSessionWeb {
  nom: string;
  employeId: string;
  role: RoleWeb;
}

export interface CompteGereWeb {
  id: string;
  email: string;
  actif: boolean;
  dernierAcces: string | null;
  employeId: string;
  nom: string;
  fonction: FonctionEmployeWeb;
}

export interface EquipeReponseWeb {
  employes: EmployeWeb[];
}

export interface CommandesReponseWeb {
  date: string;
  commandes: CommandeWeb[];
}

export interface PlanningReponseWeb {
  debut: string;
  fin: string;
  shifts: ShiftWeb[];
}
