import type { Role } from "../types.js";

const ROLES_SERVICE: Role[] = ["RESTAURANT_ADMIN", "SERVER", "KITCHEN", "BAR", "CASHIER"];

export const ROLES_AUTORISES: Record<string, Role[]> = {
  verifier_disponibilite: ["RESTAURANT_ADMIN", "SERVER", "CLIENT"],
  creer_reservation: ["RESTAURANT_ADMIN", "SERVER", "CLIENT"],
  rechercher_reservation: ["RESTAURANT_ADMIN", "SERVER", "CLIENT"],
  modifier_reservation: ["RESTAURANT_ADMIN", "SERVER", "CLIENT"],
  annuler_reservation: ["RESTAURANT_ADMIN", "SERVER", "CLIENT"],
  consulter_menu: ["RESTAURANT_ADMIN", "SERVER", "CLIENT", "KITCHEN", "BAR", "CASHIER"],
  verifier_stock_plat: ["RESTAURANT_ADMIN", "SERVER", "CLIENT", "KITCHEN", "BAR"],
  obtenir_chiffre_affaires: ["RESTAURANT_ADMIN"],
  analyser_ventes: ["RESTAURANT_ADMIN"],
  previsions_affluence: ["RESTAURANT_ADMIN"],
  liste_reservations: ["RESTAURANT_ADMIN", "SERVER"],
  lister_equipe: ROLES_SERVICE,
  creer_membre_equipe: ["RESTAURANT_ADMIN"],
  lister_commandes: ROLES_SERVICE,
  creer_commande: ["RESTAURANT_ADMIN", "SERVER", "BAR"],
  assigner_commande: ["RESTAURANT_ADMIN", "SERVER"],
  maj_statut_commande: ["RESTAURANT_ADMIN", "SERVER", "BAR", "KITCHEN", "CASHIER"],
  affecter_reservation: ["RESTAURANT_ADMIN", "SERVER"],
  lister_affectations: ["RESTAURANT_ADMIN", "SERVER", "KITCHEN"],
  lister_planning: ROLES_SERVICE,
  creer_shift: ["RESTAURANT_ADMIN"],
};

export const MESSAGE_REFUS =
  "ACCÈS REFUSÉ : l'utilisateur courant n'a pas le droit d'accéder à cette donnée. Ne communique AUCUN chiffre, ne devine rien, ne tente pas d'appeler un autre outil financier. Réponds poliment que ces informations sont réservées à la direction du restaurant et propose plutôt ton aide sur les réservations, la carte ou le service.";
