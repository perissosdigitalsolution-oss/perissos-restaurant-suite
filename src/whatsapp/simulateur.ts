import { chargerConfiguration, verifierConfigurationLLM, type ConfigurationApp } from "../config.js";
import { creerAdaptateur } from "../evergauzy/index.js";
import { AgentChafik } from "../agent/agent-chafik.js";
import { construireTraitementPayload } from "./traitement.js";
import { RegistreSessionsWhatsApp } from "./sessions.js";
import type { EnvoyeurWhatsApp } from "./envoyer-message.js";
import { normaliserTelephone } from "../utils.js";

const TELEPHONE_AYA = "+225 07 07 45 12 88";
const TELEPHONE_PATRON = "+225 01 02 03 04 05";

function construirePayloadEntrant(telephone: string, nomProfil: string, texte: string, identifiant: string): unknown {
  const waId = normaliserTelephone(telephone).replace("+", "");
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: `sim-${identifiant}`,
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "+225 27 22 00 00 00", phone_number_id: "simulation" },
              contacts: [{ profile: { name: nomProfil }, wa_id: waId }],
              messages: [
                {
                  from: waId,
                  id: `sim-${identifiant}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: texte },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function main(): Promise<void> {
  const configuration = chargerConfiguration();
  verifierConfigurationLLM(configuration);
  const configurationSimulation: ConfigurationApp = {
    ...configuration,
    whatsapp: {
      ...configuration.whatsapp,
      telephonesAdmin: [
        ...configuration.whatsapp.telephonesAdmin,
        normaliserTelephone(TELEPHONE_PATRON),
      ],
    },
  };
  const adaptateur = creerAdaptateur(configurationSimulation);
  const agent = new AgentChafik({ configuration: configurationSimulation, adaptateur });
  const registre = new RegistreSessionsWhatsApp(configurationSimulation);
  const envoyeur: EnvoyeurWhatsApp = async (destinataire, texte) => {
    console.log(`\nChafik → ${destinataire} :\n${texte}\n${"─".repeat(70)}`);
  };
  const traiter = construireTraitementPayload({ agent, registre, envoyeur });

  const script: Array<{ telephone: string; nom: string; texte: string }> = [
    {
      telephone: TELEPHONE_AYA,
      nom: "Aya Konan",
      texte: "Bonjour ! Une table pour 6 personnes samedi soir à 19h30, c'est possible ?",
    },
    {
      telephone: TELEPHONE_AYA,
      nom: "Aya Konan",
      texte: "Parfait merci ! Au fait, votre choukouya est très pimenté ? J'ai des amis sensibles.",
    },
    {
      telephone: TELEPHONE_PATRON,
      nom: "Le Gérant",
      texte: "Chafik, combien on a fait de chiffre d'affaires cette semaine ?",
    },
    {
      telephone: TELEPHONE_PATRON,
      nom: "Le Gérant",
      texte: "Et pour samedi, je dois prévoir combien de serveurs ?",
    },
  ];

  console.log("SIMULATION WHATSAPP — même chemin de code que le webhook réel");
  console.log(`Modèle : ${configuration.llm.model} · Données : ${configuration.evergauzy.mode}\n`);
  for (const [index, etape] of script.entries()) {
    console.log(`\n>>> ${etape.nom} (${etape.telephone}) : « ${etape.texte} »`);
    await traiter(construirePayloadEntrant(etape.telephone, etape.nom, etape.texte, String(index)));
  }
  console.log("\nFin de la simulation. Le webhook réel (npm run whatsapp) traite exactement ces mêmes payloads.");
}

main().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : String(erreur));
  console.error("Astuce : la simulation converse avec un vrai LLM — renseignez LLM_API_KEY dans .env. Sans clé, lancez npm run demo.");
  process.exit(1);
});
