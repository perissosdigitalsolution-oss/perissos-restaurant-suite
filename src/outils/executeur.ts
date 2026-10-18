import type { ContexteOutil, GestionnaireOutil } from "./gestionnaires.js";
import { GESTIONNAIRES_OUTILS } from "./gestionnaires.js";
import { MESSAGE_REFUS, ROLES_AUTORISES } from "./permissions.js";

export interface ResultatExecutionOutil {
  succes: boolean;
  contenu: string;
}

export async function executerOutil(
  nom: string,
  argumentsJson: string,
  contexte: ContexteOutil
): Promise<ResultatExecutionOutil> {
  const gestionnaire: GestionnaireOutil | undefined = GESTIONNAIRES_OUTILS[nom];
  if (!gestionnaire) {
    return { succes: false, contenu: `Outil inconnu : ${nom}.` };
  }
  const rolesAutorises = ROLES_AUTORISES[nom] ?? [];
  if (!rolesAutorises.includes(contexte.session.role)) {
    return { succes: false, contenu: MESSAGE_REFUS };
  }
  let argumentsOutil: Record<string, unknown>;
  try {
    argumentsOutil = argumentsJson && argumentsJson.trim().length > 0 ? JSON.parse(argumentsJson) : {};
  } catch {
    return { succes: false, contenu: `Arguments invalides pour ${nom} : le JSON fourni est mal formé.` };
  }
  try {
    const resultat = await gestionnaire(argumentsOutil, contexte);
    return { succes: true, contenu: JSON.stringify(resultat) };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    return { succes: false, contenu: `Erreur de l'outil ${nom} : ${message}` };
  }
}
