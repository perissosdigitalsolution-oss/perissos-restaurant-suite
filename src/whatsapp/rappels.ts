import { chargerConfiguration } from "../config.js";
import { creerAdaptateur } from "../evergauzy/index.js";
import { creerEnvoyeurWhatsApp } from "./envoyer-message.js";
import { ajouterJours, formatDateFr, formatHeureFr, toISODate } from "../utils.js";

async function main(): Promise<void> {
  const configuration = chargerConfiguration();
  const adaptateur = creerAdaptateur(configuration);
  const envoyeur = creerEnvoyeurWhatsApp(configuration.whatsapp);
  const demain = toISODate(ajouterJours(new Date(), 1));
  const reservations = await adaptateur.listerReservations({ dateDebut: demain, dateFin: demain, statut: "CONFIRMEE" });

  if (reservations.length === 0) {
    console.log(`Aucune réservation confirmée pour demain, ${formatDateFr(demain)}. Rien à envoyer.`);
    return;
  }

  console.log(`${reservations.length} rappel(s) anti-no-show à envoyer pour demain, ${formatDateFr(demain)} :`);
  for (const reservation of reservations) {
    const message = `Bonjour ${reservation.nomClient} ! Petit rappel : votre table vous attend demain, ${formatDateFr(reservation.date)} à ${formatHeureFr(reservation.heure)}, pour ${reservation.nombrePersonnes} personnes. Votre code de réservation : ${reservation.code}. Pour modifier ou annuler, répondez simplement à ce message. On vous attend avec plaisir chez ${configuration.restaurantNom} !`;
    await envoyeur(reservation.telephone, message);
  }
  console.log("Rappels envoyés.");
}

main().catch((erreur) => {
  console.error("Échec de l'envoi des rappels :", erreur instanceof Error ? erreur.message : String(erreur));
  process.exit(1);
});
