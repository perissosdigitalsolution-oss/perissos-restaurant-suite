import type { AgentChafik } from "../agent/agent-chafik.js";
import type { RegistreSessionsWhatsApp } from "./sessions.js";
import type { EnvoyeurWhatsApp } from "./envoyer-message.js";

export interface DependancesTraitement {
  agent: AgentChafik;
  registre: RegistreSessionsWhatsApp;
  envoyeur: EnvoyeurWhatsApp;
}

interface ValeurChangement {
  messaging_product?: string;
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: Array<{
    from?: string;
    id?: string;
    type?: string;
    text?: { body?: string };
  }>;
}

export type TraiterPayloadWhatsApp = (payload: unknown) => Promise<void>;

export function construireTraitementPayload(dependances: DependancesTraitement): TraiterPayloadWhatsApp {
  return async (payload: unknown): Promise<void> => {
    const racine = payload as {
      object?: string;
      entry?: Array<{ changes?: Array<{ field?: string; value?: ValeurChangement }> }>;
    };
    if (racine?.object !== "whatsapp_business_account") return;
    for (const entree of racine.entry ?? []) {
      for (const changement of entree.changes ?? []) {
        const valeur = changement?.value;
        if (!valeur?.messages) continue;
        const nomProfil = valeur.contacts?.[0]?.profile?.name ?? null;
        for (const message of valeur.messages) {
          const destinataire = String(message.from ?? "");
          const texte = typeof message.text?.body === "string" ? message.text.body.trim() : "";
          if (!destinataire || !texte) {
            if (message.type && message.type !== "text") {
              console.log(`[WhatsApp] Message de type « ${message.type} » ignoré (seul le texte est traité).`);
            }
            continue;
          }
          const { session, historique } = dependances.registre.obtenir(destinataire, nomProfil);
          console.log(`[WhatsApp] ${session.nomUtilisateur} (${destinataire}) → « ${texte} »`);
          try {
            const reponse = await dependances.agent.repondre(session, texte, historique);
            for (const appel of reponse.appels) {
              console.log(`[WhatsApp]   [outil] ${appel.nom} → ${appel.succes ? "OK" : "ÉCHEC"}`);
            }
            await dependances.envoyeur(destinataire, reponse.reponse);
          } catch (erreur) {
            console.error(
              `[WhatsApp] Erreur pendant le traitement : ${erreur instanceof Error ? erreur.message : String(erreur)}`
            );
            await dependances.envoyeur(
              destinataire,
              "Désolé, je rencontre un souci technique. Pouvez-vous reformuler votre message dans un instant ?"
            );
          }
        }
      }
    }
  };
}
