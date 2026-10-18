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

export interface AdaptateurDonneesRestaurant {
  listerTables(): Promise<TableInfo[]>;
  verifierDisponibilite(date: string, heure: string, nombrePersonnes: number): Promise<DisponibiliteResultat>;
  creerReservation(entree: ReservationCreeInput): Promise<ReservationRecord>;
  rechercherReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]>;
  modifierReservation(code: string, telephone: string, changements: ReservationModifInput): Promise<ReservationRecord>;
  annulerReservation(code: string, telephone: string): Promise<ReservationRecord>;
  listerReservations(filtre: ReservationFiltre): Promise<ReservationRecord[]>;
  listerMenu(): Promise<PlatMenu[]>;
  obtenirPlat(nomOuId: string): Promise<PlatMenu | null>;
  listerFactures(dateDebut: string, dateFin: string): Promise<FactureRecord[]>;
  listerEmployes(): Promise<EmployeRecord[]>;
  creerEmploye(entree: EmployeCreeInput): Promise<EmployeRecord>;
  listerCommandes(filtre: CommandeFiltre): Promise<CommandeRecord[]>;
  creerCommande(entree: CommandeCreeInput): Promise<CommandeRecord>;
  majStatutCommande(id: string, statut: StatutCommande): Promise<CommandeRecord>;
  assignerCommande(id: string, changements: CommandeAssignationInput): Promise<CommandeRecord>;
  listerAffectations(date: string): Promise<AffectationRecord[]>;
  affecterReservation(date: string, reservationCode: string, serveurId: string): Promise<AffectationRecord>;
  retirerAffectation(date: string, reservationCode: string): Promise<void>;
  listerPlanning(dateDebut: string, dateFin: string): Promise<ShiftRecord[]>;
  creerShift(entree: ShiftCreeInput): Promise<ShiftRecord>;
  supprimerShift(id: string): Promise<void>;
}
