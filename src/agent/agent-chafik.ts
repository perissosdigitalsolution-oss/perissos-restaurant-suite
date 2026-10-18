import type { ConfigurationApp } from "../config.js";
import type { AdaptateurDonneesRestaurant } from "../evergauzy/adaptateur.js";
import type { MessageLLM } from "../llm/client-llm.js";
import { appelCompletion } from "../llm/client-llm.js";
import { DEFINITIONS_OUTILS } from "../outils/definitions.js";
import { executerOutil } from "../outils/executeur.js";
import type { SessionContext } from "../types.js";
import { construireInviteSysteme } from "./invite-systeme.js";

const MAX_ITERATIONS_OUTILS = 8;
const TAILLE_HISTORIQUE = 12;

export interface TraceAppelOutil {
  nom: string;
  arguments: string;
  succes: boolean;
  contenu: string;
}

export interface ReponseAgent {
  reponse: string;
  appels: TraceAppelOutil[];
}

export class AgentChafik {
  constructor(
    private readonly parametres: { configuration: ConfigurationApp; adaptateur: AdaptateurDonneesRestaurant }
  ) {}

  async repondre(session: SessionContext, messageUtilisateur: string, historique: MessageLLM[]): Promise<ReponseAgent> {
    const maintenant = new Date();
    const messages: MessageLLM[] = [
      { role: "system", content: construireInviteSysteme(session, this.parametres.configuration, maintenant) },
      ...historique.slice(-TAILLE_HISTORIQUE),
      { role: "user", content: messageUtilisateur },
    ];
    const appels: TraceAppelOutil[] = [];
    for (let iteration = 0; iteration < MAX_ITERATIONS_OUTILS; iteration++) {
      const assistant = await appelCompletion(this.parametres.configuration.llm, messages, DEFINITIONS_OUTILS);
      if (!assistant.tool_calls || assistant.tool_calls.length === 0) {
        const reponse = assistant.content?.trim() || "Je vous écoute, comment puis-je vous aider ?";
        historique.push({ role: "user", content: messageUtilisateur });
        historique.push({ role: "assistant", content: reponse });
        return { reponse, appels };
      }
      messages.push(assistant);
      for (const appel of assistant.tool_calls) {
        const resultat = await executerOutil(appel.function.name, appel.function.arguments, {
          adaptateur: this.parametres.adaptateur,
          session,
          maintenant,
        });
        appels.push({
          nom: appel.function.name,
          arguments: appel.function.arguments,
          succes: resultat.succes,
          contenu: resultat.contenu,
        });
        messages.push({ role: "tool", tool_call_id: appel.id, content: resultat.contenu });
      }
    }
    const repli = "Je n'ai pas réussi à finaliser votre demande. Pouvez-vous la reformuler, s'il vous plaît ?";
    historique.push({ role: "user", content: messageUtilisateur });
    historique.push({ role: "assistant", content: repli });
    return { reponse: repli, appels };
  }
}
