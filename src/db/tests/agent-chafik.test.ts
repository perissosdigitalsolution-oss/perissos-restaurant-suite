import { describe, it, expect } from "vitest";
import { chargerConfiguration } from "../../config.js";
import { creerAdaptateur } from "../../evergauzy/index.js";
import { AgentChafik } from "../../agent/agent-chafik.js";
import { toISODate } from "../../utils.js";

const config = chargerConfiguration();
const adaptateur = creerAdaptateur(config);

describe("Agent Chafik — construction", () => {
  it("se construit avec la configuration courante", () => {
    const agent = new AgentChafik({ configuration: config, adaptateur });
    expect(agent).toBeDefined();
  });
});

describe("Agent Chafik — permissions par rôle (sans LLM)", () => {
  it("refuse les chiffres financiers au rôle SERVER", async () => {
    const { executerOutil } = await import("../../outils/executeur.js");
    const resultat = await executerOutil(
      "obtenir_chiffre_affaires",
      JSON.stringify({ periode: "semaine" }),
      {
        adaptateur,
        session: {
          idSession: "test",
          nomUtilisateur: "Test",
          role: "SERVER",
          canal: "web",
          organizationId: config.organizationId,
          tenantId: config.tenantId,
        },
        maintenant: new Date(),
      }
    );
    expect(resultat.succes).toBe(false);
    expect(resultat.contenu).toContain("ACCÈS REFUSÉ");
  });

  it("autorise les chiffres financiers au rôle RESTAURANT_ADMIN", async () => {
    const { executerOutil } = await import("../../outils/executeur.js");
    const resultat = await executerOutil(
      "obtenir_chiffre_affaires",
      JSON.stringify({ periode: "semaine" }),
      {
        adaptateur,
        session: {
          idSession: "test",
          nomUtilisateur: "Test",
          role: "RESTAURANT_ADMIN",
          canal: "web",
          organizationId: config.organizationId,
          tenantId: config.tenantId,
        },
        maintenant: new Date(),
      }
    );
    expect(resultat.succes).toBe(true);
  });

  it("refuse l'encaissement d'une commande au rôle KITCHEN", async () => {
    const { executerOutil } = await import("../../outils/executeur.js");
    const commandes = await adaptateur.listerCommandes({});
    if (commandes.length === 0) return;
    const resultat = await executerOutil(
      "maj_statut_commande",
      JSON.stringify({ id_commande: commandes[0].id, statut: "PAYEE" }),
      {
        adaptateur,
        session: {
          idSession: "test",
          nomUtilisateur: "Test",
          role: "KITCHEN",
          canal: "web",
          organizationId: config.organizationId,
          tenantId: config.tenantId,
        },
        maintenant: new Date(),
      }
    );
    expect(resultat.succes).toBe(false);
  });

  it("consulte le menu en tant que CLIENT", async () => {
    const { executerOutil } = await import("../../outils/executeur.js");
    const resultat = await executerOutil(
      "consulter_menu",
      JSON.stringify({}),
      {
        adaptateur,
        session: {
          idSession: "test",
          nomUtilisateur: "Test",
          role: "CLIENT",
          canal: "web",
          organizationId: config.organizationId,
          tenantId: config.tenantId,
        },
        maintenant: new Date(),
      }
    );
    expect(resultat.succes).toBe(true);
  });
});
