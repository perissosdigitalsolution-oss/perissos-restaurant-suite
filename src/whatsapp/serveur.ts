import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { chargerConfiguration, verifierConfigurationLLM } from "../config.js";
import { creerAdaptateur } from "../evergauzy/index.js";
import { AgentChafik } from "../agent/agent-chafik.js";
import { creerEnvoyeurWhatsApp } from "./envoyer-message.js";
import { RegistreSessionsWhatsApp } from "./sessions.js";
import { construireTraitementPayload } from "./traitement.js";

function lireCorps(requete: http.IncomingMessage): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const morceaux: Buffer[] = [];
    requete.on("data", (morceau: Buffer) => morceaux.push(morceau));
    requete.on("end", () => resoudre(Buffer.concat(morceaux).toString("utf8")));
    requete.on("error", rejeter);
  });
}

function signatureValide(secret: string, corpsBrut: string, signatureRecue: string | undefined): boolean {
  if (!signatureRecue || signatureRecue.length === 0) return false;
  const attendue = `sha256=${createHmac("sha256", secret).update(corpsBrut, "utf8").digest("hex")}`;
  const tamponAttendu = Buffer.from(attendue);
  const tamponRecu = Buffer.from(signatureRecue);
  return tamponAttendu.length === tamponRecu.length && timingSafeEqual(tamponAttendu, tamponRecu);
}

async function main(): Promise<void> {
  const configuration = chargerConfiguration();
  const adaptateur = creerAdaptateur(configuration);
  const agent = new AgentChafik({ configuration, adaptateur });
  const registre = new RegistreSessionsWhatsApp(configuration);
  const envoyeur = creerEnvoyeurWhatsApp(configuration.whatsapp);
  const traiter = construireTraitementPayload({ agent, registre, envoyeur });

  try {
    verifierConfigurationLLM(configuration);
  } catch (erreur) {
    console.warn(`[WhatsApp] Attention : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    console.warn("[WhatsApp] Le webhook démarre en mode dégradé : chaque message reçu entraînera une réponse d'erreur.");
  }

  const port = configuration.whatsapp.port;
  const serveur = http.createServer((requete, reponse) => {
    void (async () => {
      if (requete.method === "GET") {
        const url = new URL(requete.url ?? "/", `http://${requete.headers.host ?? "localhost"}`);
        const mode = url.searchParams.get("hub.mode");
        const jeton = url.searchParams.get("hub.verify_token");
        const defi = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && jeton === configuration.whatsapp.jetonVerification && defi) {
          reponse.writeHead(200, { "Content-Type": "text/plain" });
          reponse.end(defi);
          console.log("[WhatsApp] Vérification du webhook réussie (challenge renvoyé).");
        } else {
          reponse.writeHead(403, { "Content-Type": "text/plain" });
          reponse.end("Interdit");
        }
        return;
      }
      if (requete.method === "POST") {
        const corpsBrut = await lireCorps(requete);
        const signature = requete.headers["x-hub-signature-256"];
        const signatureRecue = Array.isArray(signature) ? signature[0] : signature;
        if (
          configuration.whatsapp.secretApplication &&
          !signatureValide(configuration.whatsapp.secretApplication, corpsBrut, signatureRecue)
        ) {
          console.error("[WhatsApp] Signature X-Hub-Signature-256 invalide : requête rejetée.");
          reponse.writeHead(401);
          reponse.end();
          return;
        }
        reponse.writeHead(200);
        reponse.end();
        try {
          await traiter(JSON.parse(corpsBrut));
        } catch (erreur) {
          console.error(
            `[WhatsApp] Rejet du payload : ${erreur instanceof Error ? erreur.message : String(erreur)}`
          );
        }
        return;
      }
      reponse.writeHead(404);
      reponse.end();
    })().catch((erreur) => {
      console.error(`[WhatsApp] Erreur serveur : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      if (!reponse.headersSent) {
        reponse.writeHead(500);
        reponse.end();
      }
    });
  });

  serveur.listen(port, () => {
    console.log("══════════════════════════════════════════════════════════");
    console.log(`CHAFIK — webhook WhatsApp du restaurant ${configuration.restaurantNom}`);
    console.log(`Port            : ${port}`);
    console.log(`Vérification    : GET ?hub.mode=subscribe&hub.verify_token=${configuration.whatsapp.jetonVerification}`);
    console.log("Réception       : POST (payload WhatsApp Business Cloud API)");
    console.log(
      `Envoi           : ${
        configuration.whatsapp.token && configuration.whatsapp.numeroId
          ? "réel via l'API Meta"
          : "SIMULATION — réponses affichées ici (WHATSAPP_TOKEN absent)"
      }`
    );
    console.log(
      `Patron WhatsApp : ${
        configuration.whatsapp.telephonesAdmin.length > 0
          ? configuration.whatsapp.telephonesAdmin.join(", ")
          : "aucun numéro configuré (WHATSAPP_ADMIN_PHONES)"
      }`
    );
    console.log(
      `Signature       : ${
        configuration.whatsapp.secretApplication
          ? "vérifiée (X-Hub-Signature-256)"
          : "NON vérifiée (WHATSAPP_APP_SECRET absent — à configurer en production)"
      }`
    );
    console.log(`Astuce tunnel   : cloudflared tunnel --url http://localhost:${port}`);
    console.log("══════════════════════════════════════════════════════════");
  });
}

main().catch((erreur) => {
  console.error("Impossible de démarrer le webhook :", erreur instanceof Error ? erreur.message : String(erreur));
  process.exit(1);
});
