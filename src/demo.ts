import { chargerConfiguration } from "./config.js";
import { creerAdaptateur } from "./evergauzy/index.js";
import type { ContexteOutil } from "./outils/gestionnaires.js";
import { executerOutil } from "./outils/executeur.js";
import type { SessionContext } from "./types.js";
import { ajouterJours, formatDateFr, prochainJour, toISODate } from "./utils.js";

const TELEPHONE_CLIENT = "+225 07 07 45 12 88";
const LIGNE = "─".repeat(74);

async function etape(
  nomOutil: string,
  argumentsOutil: Record<string, unknown>,
  contexte: ContexteOutil
): Promise<Record<string, unknown> | null> {
  console.log(`\n  [outil] ${nomOutil}(${JSON.stringify(argumentsOutil)})`);
  const resultat = await executerOutil(nomOutil, JSON.stringify(argumentsOutil), contexte);
  console.log(`  ${resultat.succes ? "[OK]" : "[REFUS / ÉCHEC]"}`);
  try {
    const analyse = JSON.parse(resultat.contenu) as Record<string, unknown>;
    if (typeof analyse.message === "string") {
      console.log(`  Chafik dirait : « ${analyse.message} »`);
    }
    const { message: _message, ...donnees } = analyse;
    const corps = JSON.stringify(donnees, null, 2);
    const lignes = corps.split("\n").slice(0, 30);
    console.log(lignes.map((ligne) => `  ${ligne}`).join("\n"));
    return analyse;
  } catch {
    console.log(`  ${resultat.contenu.slice(0, 600)}`);
    return null;
  }
}

function scenario(titre: string): void {
  console.log(`\n${"═".repeat(74)}`);
  console.log(`  ${titre}`);
  console.log("═".repeat(74));
}

async function main(): Promise<void> {
  const configuration = chargerConfiguration();
  const adaptateur = creerAdaptateur(configuration);
  const maintenant = new Date();

  const sessionCliente: SessionContext = {
    idSession: "demo-whatsapp-001",
    nomUtilisateur: "Aya Konan",
    role: "CLIENT",
    canal: "whatsapp",
    organizationId: configuration.organizationId,
    tenantId: configuration.tenantId,
  };
  const sessionPatron: SessionContext = {
    idSession: "demo-backoffice-001",
    nomUtilisateur: "Le Gérant",
    role: "RESTAURANT_ADMIN",
    canal: "backoffice",
    organizationId: configuration.organizationId,
    tenantId: configuration.tenantId,
  };
  const contexteClient: ContexteOutil = { adaptateur, session: sessionCliente, maintenant };
  const contextePatron: ContexteOutil = { adaptateur, session: sessionPatron, maintenant };

  const samediProchain = toISODate(prochainJour(maintenant, 6));
  let samediFinDeMois = prochainJour(maintenant, 6);
  while (samediFinDeMois.getDate() < 24) {
    samediFinDeMois = ajouterJours(samediFinDeMois, 7);
  }
  const isoSamediFinDeMois = toISODate(samediFinDeMois);

  console.log(LIGNE);
  console.log("  DÉMO CHAFIK — COUCHE TOOLS / FUNCTION CALLING");
  console.log(`  Restaurant ${configuration.restaurantNom} · ${configuration.restaurantVille}`);
  console.log(`  Données : mode ${configuration.evergauzy.mode.toUpperCase()} · Nous sommes le ${formatDateFr(toISODate(maintenant))}`);
  console.log(LIGNE);

  scenario("SCÉNARIO 1 · CLIENT WhatsApp — réservation naturelle");
  await etape("verifier_disponibilite", { date: samediProchain, heure: "19:30", nombre_personnes: 6 }, contexteClient);
  const creation = await etape(
    "creer_reservation",
    {
      date: samediProchain,
      heure: "19:30",
      nombre_personnes: 6,
      nom_client: "Aya Konan",
      telephone: TELEPHONE_CLIENT,
      notes: "Anniversaire, si possible en terrasse",
    },
    contexteClient
  );
  const reservation = (creation?.reservation ?? {}) as { code?: string };
  const codeReservation = reservation.code ?? "";
  await etape("rechercher_reservation", { telephone: TELEPHONE_CLIENT }, contexteClient);

  scenario("SCÉNARIO 2 · CLIENT — questions sur la carte");
  await etape("consulter_menu", { sans_allergene: "arachide" }, contexteClient);
  await etape("verifier_stock_plat", { nom_du_plat: "Choukouya" }, contexteClient);

  scenario("SCÉNARIO 3 · SÉCURITÉ — un client demande les chiffres");
  await etape("obtenir_chiffre_affaires", { periode: "semaine" }, contexteClient);

  scenario("SCÉNARIO 4 · CLIENT — samedi de fin de mois déjà complet");
  await etape("verifier_disponibilite", { date: isoSamediFinDeMois, heure: "19:30", nombre_personnes: 8 }, contexteClient);

  scenario("SCÉNARIO 5 · PATRON — pilotage du restaurant (RESTAURANT_ADMIN)");
  await etape("obtenir_chiffre_affaires", { periode: "semaine" }, contextePatron);
  await etape("analyser_ventes", { periode: "semaine" }, contextePatron);
  await etape("previsions_affluence", { date_cible: isoSamediFinDeMois }, contextePatron);
  await etape(
    "liste_reservations",
    {
      date_debut: toISODate(ajouterJours(maintenant, -14)),
      date_fin: toISODate(ajouterJours(maintenant, -1)),
      statut: "NO_SHOW",
    },
    contextePatron
  );

  scenario("SCÉNARIO 6 · CLIENT — modification et annulation de sa réservation");
  await etape(
    "modifier_reservation",
    { code: codeReservation, telephone: TELEPHONE_CLIENT, heure: "20:00" },
    contexteClient
  );
  await etape(
    "annuler_reservation",
    { code: codeReservation, telephone: "+225 01 00 00 00 00" },
    contexteClient
  );
  await etape("annuler_reservation", { code: codeReservation, telephone: TELEPHONE_CLIENT }, contexteClient);

  console.log(`\n${LIGNE}`);
  console.log("  Prochaine étape : brancher le webhook WhatsApp Business Cloud API sur");
  console.log("  AgentChafik.repondre(session, message, historique) — la couche d'outils est prête.");
  console.log(LIGNE);
}

main().catch((erreur) => {
  console.error("Échec de la démo :", erreur instanceof Error ? erreur.message : String(erreur));
  process.exit(1);
});
