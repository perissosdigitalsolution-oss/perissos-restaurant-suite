import { chargerConfiguration } from "../config.js";
import { creerAdaptateur } from "../evergauzy/index.js";
import { creerEnvoyeurWhatsApp } from "./envoyer-message.js";
import { ajouterJours, formatDateFr, formatHeureFr, toISODate } from "../utils.js";
import { initialiserSentry, capturerErreur, fermerSentry } from "../monitoring/sentry.js";

const INTERVALLE_MS = 60 * 60 * 1000; // toutes les heures

async function envoyerRappels(): Promise<void> {
  const configuration = chargerConfiguration();
  const adaptateur = creerAdaptateur(configuration);
  const envoyeur = creerEnvoyeurWhatsApp(configuration.whatsapp);
  const demain = toISODate(ajouterJours(new Date(), 1));
  const reservations = await adaptateur.listerReservations({ dateDebut: demain, dateFin: demain, statut: "CONFIRMEE" });

  if (reservations.length === 0) {
    console.log(`[Rappels ${new Date().toISOString()}] Aucune réservation confirmée pour demain (${formatDateFr(demain)}).`);
    return;
  }

  console.log(`[Rappels ${new Date().toISOString()}] ${reservations.length} rappel(s) pour demain (${formatDateFr(demain)}) :`);
  for (const reservation of reservations) {
    const message = `Bonjour ${reservation.nomClient} ! Petit rappel : votre table vous attend demain, ${formatDateFr(reservation.date)} à ${formatHeureFr(reservation.heure)}, pour ${reservation.nombrePersonnes} personnes. Votre code de réservation : ${reservation.code}. Pour modifier ou annuler, répondez simplement à ce message. On vous attend avec plaisir chez ${configuration.restaurantNom} !`;
    try {
      await envoyeur(reservation.telephone, message);
    } catch (erreur) {
      capturerErreur(erreur, { reservationCode: reservation.code });
      console.error(`[Rappels] Échec envoi à ${reservation.telephone} : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
  }
  console.log(`[Rappels] ${reservations.length} rappel(s) traité(s).`);
}

async function main(): Promise<void> {
  initialiserSentry();
  console.log("══════════════════════════════════════════════════════════");
  console.log("CHAFIK — Cron rappels WhatsApp (anti-no-show)");
  console.log(`Intervalle : ${INTERVALLE_MS / 60000} minutes`);
  console.log("══════════════════════════════════════════════════════════");

  // Exécution immédiate au démarrage
  await envoyerRappels();

  // Puis toutes les heures
  setInterval(() => {
    void envoyerRappels().catch((erreur) => {
      capturerErreur(erreur);
      console.error(`[Rappels] Erreur cycle : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    });
  }, INTERVALLE_MS);

  process.on("SIGTERM", () => {
    void fermerSentry().then(() => process.exit(0));
  });
  process.on("SIGINT", () => {
    void fermerSentry().then(() => process.exit(0));
  });
}

main().catch((erreur) => {
  capturerErreur(erreur);
  console.error("Impossible de démarrer le cron rappels :", erreur instanceof Error ? erreur.message : String(erreur));
  process.exit(1);
});
