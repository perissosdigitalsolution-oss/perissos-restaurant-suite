import readline from "node:readline/promises";
import { chargerConfiguration, verifierConfigurationLLM } from "./config.js";
import { creerAdaptateur } from "./evergauzy/index.js";
import { AgentChafik } from "./agent/agent-chafik.js";
import type { MessageLLM } from "./llm/client-llm.js";
import type { Role, SessionContext } from "./types.js";

async function main(): Promise<void> {
  const configuration = chargerConfiguration();
  verifierConfigurationLLM(configuration);
  const adaptateur = creerAdaptateur(configuration);
  const agent = new AgentChafik({ configuration, adaptateur });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("══════════════════════════════════════════════════════");
  console.log(`CHAFIK — agent IA du restaurant ${configuration.restaurantNom}`);
  console.log(`Modèle LLM : ${configuration.llm.model}`);
  console.log(`Données    : mode ${configuration.evergauzy.mode}${configuration.evergauzy.mode === "live" ? ` (${configuration.evergauzy.baseUrl})` : " (données simulées)"}`);
  console.log("Commandes  : « exit » ou « quitter » pour arrêter");
  console.log("════════════════════════════════════════════════════");

  const reponseRole = (await rl.question("\nSe connecter en tant que ? (admin/client) [client] : ")).trim().toLowerCase();
  const role: Role = reponseRole === "admin" ? "RESTAURANT_ADMIN" : "CLIENT";
  const nomUtilisateur =
    (await rl.question("Votre nom : ")).trim() || (role === "RESTAURANT_ADMIN" ? "Le Gérant" : "Invité");

  const session: SessionContext = {
    idSession: `cli-${Date.now()}`,
    nomUtilisateur,
    role,
    canal: role === "RESTAURANT_ADMIN" ? "backoffice" : "whatsapp",
    organizationId: configuration.organizationId,
    tenantId: configuration.tenantId,
  };
  const historique: MessageLLM[] = [];
  console.log(`\nChafik > Bonjour ${nomUtilisateur} ! Je suis Chafik, l'assistant du restaurant ${configuration.restaurantNom}. Que puis-je faire pour vous ?`);

  while (true) {
    const question = (await rl.question("\nVous > ")).trim();
    if (question.length === 0) continue;
    if (["exit", "quitter", "bye"].includes(question.toLowerCase())) break;
    try {
      const reponse = await agent.repondre(session, question, historique);
      for (const appel of reponse.appels) {
        console.log(`   [outil] ${appel.nom} -> ${appel.succes ? "OK" : "ÉCHEC"}`);
      }
      console.log(`\nChafik > ${reponse.reponse}`);
    } catch (erreur) {
      console.error(
        `\nChafik > Je rencontre un souci technique : ${erreur instanceof Error ? erreur.message : String(erreur)}`
      );
    }
  }

  console.log(`\nChafik > À très vite chez ${configuration.restaurantNom} !`);
  rl.close();
}

main().catch((erreur) => {
  console.error(`\n${erreur instanceof Error ? erreur.message : String(erreur)}`);
  console.error("Astuce : lancez « npm run demo » pour tester la couche d'outils sans clé API.");
  process.exit(1);
});
