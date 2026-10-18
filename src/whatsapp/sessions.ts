import type { ConfigurationApp } from "../config.js";
import type { MessageLLM } from "../llm/client-llm.js";
import type { SessionContext } from "../types.js";
import { normaliserTelephone } from "../utils.js";

const TAILLE_HISTORIQUE_MAX = 24;

export interface EntreeSessionWhatsApp {
  session: SessionContext;
  historique: MessageLLM[];
}

export class RegistreSessionsWhatsApp {
  private readonly sessions = new Map<string, EntreeSessionWhatsApp>();

  constructor(private readonly configuration: ConfigurationApp) {}

  obtenir(telephoneBrut: string, nomProfil: string | null): EntreeSessionWhatsApp {
    const telephone = normaliserTelephone(telephoneBrut);
    const existante = this.sessions.get(telephone);
    if (existante) {
      if (nomProfil) {
        existante.session.nomUtilisateur = nomProfil;
      }
      if (existante.historique.length > TAILLE_HISTORIQUE_MAX) {
        existante.historique.splice(0, existante.historique.length - TAILLE_HISTORIQUE_MAX);
      }
      return existante;
    }
    const estAdmin = this.configuration.whatsapp.telephonesAdmin.includes(telephone);
    const entree: EntreeSessionWhatsApp = {
      session: {
        idSession: `wa-${telephone}`,
        nomUtilisateur: nomProfil ?? telephone,
        role: estAdmin ? "RESTAURANT_ADMIN" : "CLIENT",
        canal: "whatsapp",
        organizationId: this.configuration.organizationId,
        tenantId: this.configuration.tenantId,
        telephone,
      },
      historique: [],
    };
    this.sessions.set(telephone, entree);
    return entree;
  }
}
