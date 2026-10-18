import { z } from "zod";

export const schemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide."),
  motDePasse: z.string().min(1, "Mot de passe obligatoire."),
});

export const schemaCompteCreation = z.object({
  employeId: z.string().min(1, "Membre d'équipe obligatoire."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
});

export const schemaCompteReinitialisation = z.object({
  id: z.string().uuid("Identifiant de compte invalide."),
});

export const schemaCompteStatut = z.object({
  id: z.string().uuid("Identifiant de compte invalide."),
  actif: z.boolean(),
});

export const schemaReservationCreation = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  heure: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)."),
  nombrePersonnes: z.number().int().min(1).max(12),
  nomClient: z.string().trim().min(1, "Nom du client obligatoire."),
  telephone: z.string().trim().min(8, "Téléphone obligatoire."),
  notes: z.string().optional(),
});

export const schemaCommandeCreation = z.object({
  tableId: z.string().optional().nullable(),
  reservationCode: z.string().optional().nullable(),
  serveurId: z.string().optional().nullable(),
  lignes: z
    .array(
      z.object({
        plat: z.string().min(1, "Plat obligatoire."),
        quantite: z.number().int().min(1, "Quantité doit être ≥ 1."),
        notes: z.string().optional(),
      })
    )
    .min(1, "Au moins une ligne de commande."),
  idempotencyKey: z.string().optional(),
});

export const schemaCommandeStatut = z.object({
  id: z.string().min(1, "Identifiant de commande obligatoire."),
  statut: z.enum(["EN_ATTENTE", "EN_CUISINE", "PRETE", "SERVIE", "PAYEE"]),
});

export const schemaCommandeAssignation = z.object({
  id: z.string().min(1, "Identifiant de commande obligatoire."),
  serveurId: z.string().nullable().optional(),
  cuisinierId: z.string().nullable().optional(),
});

export const schemaAffectation = z.object({
  reservationCode: z.string().min(1, "Code de réservation obligatoire."),
  serveurId: z.string().min(1, "Serveur obligatoire."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.").optional(),
});

export const schemaShift = z.object({
  employeId: z.string().min(1, "Employé obligatoire."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  debut: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)."),
  fin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)."),
  poste: z.enum(["salle", "cuisine", "bar", "caisse"]),
});

export const schemaSiteConfig = z.object({
  themeId: z.string().min(1, "Thème obligatoire."),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug invalide (minuscules, chiffres, tirets)."),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const schemaCommandeClient = z.object({
  mode: z.enum(["sur_place", "a_emporter", "livraison"]),
  tableId: z.string().optional().nullable(),
  adresseLivraison: z.string().optional().nullable(),
  lignes: z
    .array(
      z.object({
        plat: z.string().min(1, "Plat obligatoire."),
        quantite: z.number().int().min(1, "Quantité doit être ≥ 1."),
        notes: z.string().optional(),
      })
    )
    .min(1, "Au moins une ligne de commande."),
  idempotencyKey: z.string().optional(),
});

export const schemaImportTheme = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Identifiant invalide."),
  nom: z.string().min(1, "Nom obligatoire."),
  description: z.string().optional(),
  contenu: z.string().min(1, "Contenu HTML obligatoire."),
});

export function valider<T>(schema: z.ZodType<T>, donnees: unknown): { succes: true; donnees: T } | { succes: false; erreur: string } {
  const resultat = schema.safeParse(donnees);
  if (resultat.success) return { succes: true, donnees: resultat.data };
  const premier = resultat.error.issues[0];
  return { succes: false, erreur: premier ? `${premier.path.join(".") || "champ"} : ${premier.message}` : "Données invalides." };
}
