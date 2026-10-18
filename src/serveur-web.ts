import { createHash } from "node:crypto";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { chargerConfiguration, verifierConfigurationLLM } from "./config.js";
import { creerAdaptateur } from "./evergauzy/index.js";
import { AgentChafik } from "./agent/agent-chafik.js";
import { executerOutil } from "./outils/executeur.js";
import type { ContexteOutil } from "./outils/gestionnaires.js";
import type { MessageLLM } from "./llm/client-llm.js";
import type { FonctionEmploye, Role, ReservationRecord, SessionContext } from "./types.js";
import { ajouterJours, prochainJour, toISODate } from "./utils.js";
import { db } from "./db/client.js";
import { comptes, employes } from "./db/schema.js";
import { initialiserSentry, capturerErreur, fermerSentry } from "./monitoring/sentry.js";
import { valider, schemaLogin, schemaCompteCreation, schemaCompteReinitialisation, schemaCompteStatut, schemaSiteConfig, schemaImportTheme, schemaCommandeClient } from "./validation/schemas.js";
import { lireConfigSite, listerThemes, obtenirSitePublie, obtenirTheme, publierSite, sauverConfigSite } from "./site/rendu.js";
import {
  NOM_COOKIE_SESSION,
  creerJetonSession,
  enteteCookieExpiration,
  enteteCookieSession,
  genererMotDePasse,
  lireCookies,
  rolePourFonction,
  verifierJetonSession,
} from "./auth/session.js";

const racineProjet = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TYPES_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

interface EntreeSessionWeb {
  session: SessionContext;
  historique: MessageLLM[];
}

function lireCorps(requete: http.IncomingMessage): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const morceaux: Buffer[] = [];
    requete.on("data", (morceau: Buffer) => morceaux.push(morceau));
    requete.on("end", () => resoudre(Buffer.concat(morceaux).toString("utf8")));
    requete.on("error", rejeter);
  });
}

function envoyerJson(
  reponse: http.ServerResponse,
  code: number,
  donnees: unknown,
  entetesSupplementaires: Record<string, string> = {}
): void {
  reponse.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cache-Control": code === 200 ? "private, no-store" : "no-store",
    ...entetesSupplementaires,
  });
  reponse.end(JSON.stringify(donnees));
}

function versReservationWeb(reservation: ReservationRecord) {
  return {
    code: reservation.code,
    date: reservation.date,
    heure: reservation.heure,
    nombrePersonnes: reservation.nombrePersonnes,
    nomClient: reservation.nomClient,
    telephone: reservation.telephone,
    statut: reservation.statut,
    table: reservation.tableId,
    notes: reservation.notes,
    creeLe: reservation.creeLe,
  };
}

const ROLES_SERVICE: Role[] = ["RESTAURANT_ADMIN", "SERVER", "KITCHEN", "BAR", "CASHIER"];

const PROFILS_DEMO: Array<{ profil: string; email: string }> = [
  { profil: "patron", email: "amadou.ba@perissos.ci" },
  { profil: "serveur", email: "awa.kone@perissos.ci" },
  { profil: "cuisine", email: "mariam.toure@perissos.ci" },
  { profil: "bar", email: "bintou.sanogo@perissos.ci" },
  { profil: "caisse", email: "serge.kouadio@perissos.ci" },
];

async function main(): Promise<void> {
  initialiserSentry();
  const configuration = chargerConfiguration();
  const adaptateur = creerAdaptateur(configuration);
  const agent = new AgentChafik({ configuration, adaptateur });
  const distWeb = path.join(racineProjet, "web", "dist");
  const sessionsWeb = new Map<string, EntreeSessionWeb>();

  let llmConfigure = true;
  try {
    verifierConfigurationLLM(configuration);
  } catch {
    llmConfigure = false;
  }

  function obtenirSessionWeb(idSession: string, role: Role, nomUtilisateur: string): EntreeSessionWeb {
    let entree = sessionsWeb.get(idSession);
    if (!entree) {
      entree = {
        session: {
          idSession: `web-${idSession}`,
          nomUtilisateur,
          role,
          canal: "web",
          organizationId: configuration.organizationId,
          tenantId: configuration.tenantId,
        },
        historique: [],
      };
      sessionsWeb.set(idSession, entree);
    } else {
      entree.session.role = role;
      entree.session.nomUtilisateur = nomUtilisateur;
      if (entree.historique.length > 24) {
        entree.historique.splice(0, entree.historique.length - 24);
      }
    }
    return entree;
  }

  function sessionApi(role: Role, nom: string): SessionContext {
    return {
      idSession: "web-api",
      nomUtilisateur: nom,
      role,
      canal: "web",
      organizationId: configuration.organizationId,
      tenantId: configuration.tenantId,
    };
  }

  const tentativesParIp = new Map<string, { nombre: number; reinitialisation: number }>();
  function limiterTentatives(adresse: string, limite: number, fenetreMs: number): boolean {
    const maintenant = Date.now();
    const entree = tentativesParIp.get(adresse);
    if (!entree || maintenant > entree.reinitialisation) {
      tentativesParIp.set(adresse, { nombre: 1, reinitialisation: maintenant + fenetreMs });
      return true;
    }
    if (entree.nombre >= limite) return false;
    entree.nombre += 1;
    return true;
  }

  function adresseClient(requete: http.IncomingMessage): string {
    const ip = requete.socket.remoteAddress ?? "inconnu";
    return createHash("sha256").update(ip).digest("hex").slice(0, 16);
  }

  function lireContexteRole(
    requete: http.IncomingMessage
  ): { role: Role; nom: string; connecte: boolean; idCompte: string | null } {
    const cookies = lireCookies(requete);
    const charge = verifierJetonSession(cookies[NOM_COOKIE_SESSION], configuration.sessionSecret);
    if (charge) {
      return { role: charge.role, nom: charge.nom, connecte: true, idCompte: charge.idCompte };
    }
    return { role: "CLIENT", nom: "Invité", connecte: false, idCompte: null };
  }

  async function regrouperClients(
    debut: string,
    fin: string
  ): Promise<Array<{ nom: string; telephone: string; passages: number; derniereDate: string }>> {
    const reservations = await adaptateur.listerReservations({ dateDebut: debut, dateFin: fin });
    const parClient = new Map<string, { nom: string; telephone: string; passages: number; derniereDate: string }>();
    for (const reservation of reservations) {
      const existant = parClient.get(reservation.telephone) ?? {
        nom: reservation.nomClient,
        telephone: reservation.telephone,
        passages: 0,
        derniereDate: reservation.date,
      };
      existant.passages += 1;
      if (reservation.date > existant.derniereDate) {
        existant.derniereDate = reservation.date;
      }
      parClient.set(reservation.telephone, existant);
    }
    return [...parClient.values()].sort((a, b) => b.passages - a.passages || a.nom.localeCompare(b.nom));
  }

  async function servirStatique(reponse: http.ServerResponse, cheminDemande: string): Promise<void> {
    if (!existsSync(distWeb)) {
      reponse.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      reponse.end("Frontend non construit. Lancez « npm run web:build » puis relancez.");
      return;
    }
    let cheminFichier =
      cheminDemande === "/" ? path.join(distWeb, "index.html") : path.join(distWeb, cheminDemande);
    cheminFichier = path.normalize(cheminFichier);
    if (!cheminFichier.startsWith(distWeb)) {
      reponse.writeHead(403);
      reponse.end();
      return;
    }
    if (!existsSync(cheminFichier) || statSync(cheminFichier).isDirectory()) {
      cheminFichier = path.join(distWeb, "index.html");
    }
    try {
      const contenu = await readFile(cheminFichier);
      const extension = path.extname(cheminFichier).toLowerCase();
      reponse.writeHead(200, { "Content-Type": TYPES_MIME[extension] ?? "application/octet-stream", "Cache-Control": "no-cache" });
      reponse.end(contenu);
    } catch {
      reponse.writeHead(404);
      reponse.end();
    }
  }

  const serveur = http.createServer((requete, reponse) => {
    reponse.setHeader("X-Content-Type-Options", "nosniff");
    reponse.setHeader("X-Frame-Options", "DENY");
    reponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    reponse.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    void (async () => {
      const url = new URL(requete.url ?? "/", `http://${requete.headers.host ?? "localhost"}`);
      const chemin = url.pathname;

      if (requete.method === "OPTIONS") {
        reponse.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        });
        reponse.end();
        return;
      }

      if (chemin.startsWith("/site/") && requete.method === "GET") {
        const slug = chemin.slice("/site/".length);
        if (slug && !slug.includes("..")) {
          const html = await obtenirSitePublie(slug);
          if (html) {
            reponse.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
            reponse.end(html);
            return;
          }
        }
        reponse.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        reponse.end("Site introuvable.");
        return;
      }

      if (chemin.startsWith("/api/")) {
        try {
          if (chemin === "/api/auth/login" && requete.method === "POST") {
            const adresse = adresseClient(requete);
            if (!limiterTentatives(adresse, 8, 60_000)) {
              envoyerJson(reponse, 429, { erreur: "Trop de tentatives de connexion. Réessayez dans une minute." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { email?: string; motDePasse?: string };
            const validation = valider(schemaLogin, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const email = validation.donnees.email;
            const motDePasse = validation.donnees.motDePasse;
            const lignes = await db
              .select({
                id: comptes.id,
                motDePasseHash: comptes.motDePasseHash,
                actif: comptes.actif,
                employeId: comptes.employeId,
                nom: employes.nom,
                fonction: employes.fonction,
              })
              .from(comptes)
              .innerJoin(employes, eq(comptes.employeId, employes.id))
              .where(eq(comptes.email, email));
            const compte = lignes[0];
            if (!compte || !compte.actif || !(await bcrypt.compare(motDePasse, compte.motDePasseHash))) {
              envoyerJson(reponse, 401, { erreur: "Identifiants invalides." });
              return;
            }
            const role = rolePourFonction(compte.fonction as FonctionEmploye);
            const jeton = creerJetonSession(
              { idCompte: compte.id, employeId: compte.employeId, nom: compte.nom, role },
              configuration.sessionSecret
            );
            await db.update(comptes).set({ dernierAcces: new Date() }).where(eq(comptes.id, compte.id));
            envoyerJson(
              reponse,
              200,
              { compte: { email, nom: compte.nom, employeId: compte.employeId, role } },
              { "Set-Cookie": enteteCookieSession(jeton) }
            );
            return;
          }

          if (chemin === "/api/auth/logout" && requete.method === "POST") {
            envoyerJson(reponse, 200, { deconnecte: true }, { "Set-Cookie": enteteCookieExpiration() });
            return;
          }

          if (chemin === "/api/auth/session" && requete.method === "GET") {
            const cookies = lireCookies(requete);
            const charge = verifierJetonSession(cookies[NOM_COOKIE_SESSION], configuration.sessionSecret);
            if (!charge) {
              envoyerJson(reponse, 401, { erreur: "Aucune session active." });
              return;
            }
            envoyerJson(reponse, 200, {
              compte: { nom: charge.nom, employeId: charge.employeId, role: charge.role },
              expireLe: new Date(charge.exp * 1000).toISOString(),
            });
            return;
          }

          if (chemin === "/api/auth/demo" && requete.method === "GET") {
            if (!configuration.demoPresentation) {
              envoyerJson(reponse, 404, { erreur: "Route inconnue." });
              return;
            }
            const lignes = await db
              .select({
                email: comptes.email,
                actif: comptes.actif,
                nom: employes.nom,
                fonction: employes.fonction,
              })
              .from(comptes)
              .innerJoin(employes, eq(comptes.employeId, employes.id));
            const profils = PROFILS_DEMO.flatMap((cible) => {
              const compte = lignes.find((ligne) => ligne.email === cible.email);
              if (!compte || !compte.actif) return [];
              return [
                {
                  profil: cible.profil,
                  nom: compte.nom,
                  role: rolePourFonction(compte.fonction as FonctionEmploye),
                },
              ];
            });
            envoyerJson(reponse, 200, { profils });
            return;
          }

          if (chemin === "/api/auth/demo" && requete.method === "POST") {
            if (!configuration.demoPresentation) {
              envoyerJson(reponse, 404, { erreur: "Route inconnue." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { profil?: string };
            const cible = PROFILS_DEMO.find((element) => element.profil === corps.profil);
            if (!cible) {
              envoyerJson(reponse, 400, { erreur: "Profil démo inconnu." });
              return;
            }
            const lignes = await db
              .select({
                id: comptes.id,
                actif: comptes.actif,
                employeId: comptes.employeId,
                nom: employes.nom,
                fonction: employes.fonction,
              })
              .from(comptes)
              .innerJoin(employes, eq(comptes.employeId, employes.id))
              .where(eq(comptes.email, cible.email));
            const compte = lignes[0];
            if (!compte || !compte.actif) {
              envoyerJson(reponse, 401, { erreur: "Compte démo indisponible." });
              return;
            }
            const role = rolePourFonction(compte.fonction as FonctionEmploye);
            const jeton = creerJetonSession(
              { idCompte: compte.id, employeId: compte.employeId, nom: compte.nom, role },
              configuration.sessionSecret
            );
            await db.update(comptes).set({ dernierAcces: new Date() }).where(eq(comptes.id, compte.id));
            envoyerJson(
              reponse,
              200,
              { compte: { email: cible.email, nom: compte.nom, employeId: compte.employeId, role } },
              { "Set-Cookie": enteteCookieSession(jeton) }
            );
            return;
          }

          if (chemin === "/api/comptes" && requete.method === "GET") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La gestion des comptes est réservée à la direction." });
              return;
            }
            const lignes = await db
              .select({
                id: comptes.id,
                email: comptes.email,
                actif: comptes.actif,
                dernierAcces: comptes.dernierAcces,
                employeId: comptes.employeId,
                nom: employes.nom,
                fonction: employes.fonction,
              })
              .from(comptes)
              .innerJoin(employes, eq(comptes.employeId, employes.id))
              .orderBy(employes.nom);
            envoyerJson(reponse, 200, {
              comptes: lignes.map((ligne) => ({
                id: ligne.id,
                email: ligne.email,
                actif: ligne.actif,
                dernierAcces: ligne.dernierAcces ? ligne.dernierAcces.toISOString() : null,
                employeId: ligne.employeId,
                nom: ligne.nom,
                fonction: ligne.fonction,
              })),
            });
            return;
          }

          if (chemin === "/api/comptes" && requete.method === "POST") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La gestion des comptes est réservée à la direction." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { employeId?: string; email?: string };
            const validation = valider(schemaCompteCreation, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const employeId = validation.donnees.employeId;
            const email = validation.donnees.email;
            const employe = await db.select().from(employes).where(eq(employes.id, employeId));
            if (employe.length === 0) {
              envoyerJson(reponse, 400, { erreur: `Membre d'équipe introuvable : ${corps.employeId}.` });
              return;
            }
            const existant = await db.select({ id: comptes.id }).from(comptes).where(eq(comptes.employeId, employeId));
            if (existant.length > 0) {
              envoyerJson(reponse, 400, { erreur: `${employe[0].nom} possède déjà un compte d'accès.` });
              return;
            }
            const emailPris = await db.select({ id: comptes.id }).from(comptes).where(eq(comptes.email, email));
            if (emailPris.length > 0) {
              envoyerJson(reponse, 400, { erreur: "Cet email est déjà utilisé par un autre compte." });
              return;
            }
            const motDePasse = genererMotDePasse();
            const hash = await bcrypt.hash(motDePasse, 10);
            await db.insert(comptes).values({ employeId, email, motDePasseHash: hash });
            envoyerJson(reponse, 200, {
              compte: { email, nom: employe[0].nom, employeId },
              motDePasseInitial: motDePasse,
            });
            return;
          }

          if (chemin === "/api/comptes/reinitialiser" && requete.method === "POST") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La gestion des comptes est réservée à la direction." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { id?: string };
            const validation = valider(schemaCompteReinitialisation, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const idCompte = validation.donnees.id;
            const cible = await db.select().from(comptes).where(eq(comptes.id, idCompte));
            if (cible.length === 0) {
              envoyerJson(reponse, 400, { erreur: "Compte introuvable." });
              return;
            }
            const motDePasse = genererMotDePasse();
            const hash = await bcrypt.hash(motDePasse, 10);
            await db.update(comptes).set({ motDePasseHash: hash, majLe: new Date() }).where(eq(comptes.id, idCompte));
            envoyerJson(reponse, 200, { confirmation: true, motDePasseTemporaire: motDePasse });
            return;
          }

          if (chemin === "/api/comptes/statut" && requete.method === "POST") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La gestion des comptes est réservée à la direction." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { id?: string; actif?: boolean };
            const validation = valider(schemaCompteStatut, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const idCompte = validation.donnees.id;
            const actif = validation.donnees.actif;
            if (idCompte === contexte.idCompte) {
              envoyerJson(reponse, 400, { erreur: "Impossible de modifier le statut de votre propre compte." });
              return;
            }
            const cible = await db
              .update(comptes)
              .set({ actif, majLe: new Date() })
              .where(eq(comptes.id, idCompte))
              .returning({ id: comptes.id });
            if (cible.length === 0) {
              envoyerJson(reponse, 400, { erreur: "Compte introuvable." });
              return;
            }
            envoyerJson(reponse, 200, { confirmation: true, actif: corps.actif });
            return;
          }

          if (chemin === "/api/site/themes" && requete.method === "GET") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "Le marché de thèmes est réservé à la direction." });
              return;
            }
            const themes = await listerThemes();
            envoyerJson(reponse, 200, { themes });
            return;
          }

          if (chemin === "/api/site" && requete.method === "GET") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La configuration du site est réservée à la direction." });
              return;
            }
            const site = await lireConfigSite(configuration.tenantId);
            envoyerJson(reponse, 200, { site });
            return;
          }

          if (chemin === "/api/site" && requete.method === "PUT") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La configuration du site est réservée à la direction." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { themeId?: string; slug?: string; config?: Record<string, unknown> };
            const validation = valider(schemaSiteConfig, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const resultat = await sauverConfigSite(configuration.tenantId, validation.donnees.themeId, validation.donnees.slug, validation.donnees.config ?? {});
            envoyerJson(reponse, 200, { site: resultat });
            return;
          }

          if (chemin === "/api/site/publier" && requete.method === "POST") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "La publication du site est réservée à la direction." });
              return;
            }
            const resultat = await publierSite(configuration.tenantId, adaptateur);
            envoyerJson(reponse, 200, { confirmation: true, slug: resultat.slug, url: `/site/${resultat.slug}` });
            return;
          }

          if (chemin === "/api/site/themes/import" && requete.method === "POST") {
            const contexte = lireContexteRole(requete);
            if (contexte.role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "L'import de thème est réservé à la direction." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { id?: string; nom?: string; description?: string; contenu?: string };
            const validation = valider(schemaImportTheme, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const idTheme = validation.donnees.id;
            const nomTheme = validation.donnees.nom;
            const descriptionTheme = validation.donnees.description;
            const contenuTheme = validation.donnees.contenu;
            const { db } = await import("./db/client.js");
            const { themes: themesTable, themeFichiers: themeFichiersTable } = await import("./db/schema.js");
            const { eq } = await import("drizzle-orm");
            const existant = await db.select().from(themesTable).where(eq(themesTable.id, idTheme));
            if (existant.length > 0) {
              envoyerJson(reponse, 400, { erreur: `Un thème avec l'identifiant « ${corps.id} » existe déjà.` });
              return;
            }
            await db.insert(themesTable).values({
              id: idTheme,
              nom: nomTheme,
              description: descriptionTheme ?? "",
              auteur: "Importé",
              version: "1.0.0",
              categorie: "restaurant",
              actif: true,
            });
            await db.insert(themeFichiersTable).values({
              themeId: idTheme,
              chemin: "index.html",
              contenu: contenuTheme,
              type: "html",
              ordre: 0,
            });
            envoyerJson(reponse, 200, { confirmation: true, id: idTheme, nom: nomTheme });
            return;
          }

          if (chemin === "/api/client/commander" && requete.method === "POST") {
            const corps = JSON.parse(await lireCorps(requete)) as unknown;
            const validation = valider(schemaCommandeClient, corps);
            if (!validation.succes) {
              envoyerJson(reponse, 400, { erreur: validation.erreur });
              return;
            }
            const donnees = validation.donnees;
            if (donnees.mode === "livraison" && (!donnees.adresseLivraison || donnees.adresseLivraison.trim().length < 5)) {
              envoyerJson(reponse, 400, { erreur: "Adresse de livraison obligatoire (minimum 5 caractères)." });
              return;
            }
            const tableId = donnees.mode === "sur_place" ? (donnees.tableId ?? null) : null;
            const commande = await adaptateur.creerCommande({
              tableId,
              serveurId: null,
              mode: donnees.mode,
              adresseLivraison: donnees.mode === "livraison" ? donnees.adresseLivraison!.trim() : null,
              lignes: donnees.lignes,
              idempotencyKey: donnees.idempotencyKey,
            });
            envoyerJson(reponse, 200, {
              confirmation: true,
              commande: {
                id: commande.id,
                date: commande.date,
                heure: commande.heure,
                mode: commande.mode,
                adresseLivraison: commande.adresseLivraison,
                statut: commande.statut,
                lignes: commande.lignes,
                montantTotal: commande.montantTotal,
              },
            });
            return;
          }

          if (chemin === "/api/restaurant" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            const equipe = role !== "CLIENT";
            const maintenant = new Date();
            const isoJour = toISODate(maintenant);
            const tables = await adaptateur.listerTables();
            const [reservationsJour, reservationsAVenir] = await Promise.all([
              adaptateur.listerReservations({ dateDebut: isoJour, dateFin: isoJour }),
              adaptateur.listerReservations({
                dateDebut: toISODate(ajouterJours(maintenant, 1)),
                dateFin: toISODate(ajouterJours(maintenant, 7)),
                statut: "CONFIRMEE",
              }),
            ]);
            envoyerJson(reponse, 200, {
              nom: configuration.restaurantNom,
              ville: configuration.restaurantVille,
              aujourdhui: isoJour,
              capacite: {
                nombreTables: tables.length,
                couverts: tables.reduce((somme, table) => somme + table.capacite, 0),
              },
              equipe,
              reservationsJour: equipe ? reservationsJour.map(versReservationWeb) : [],
              reservationsAVenir: equipe ? reservationsAVenir.map(versReservationWeb) : [],
            });
            return;
          }

          if (chemin === "/api/menu" && requete.method === "GET") {
            const plats = await adaptateur.listerMenu();
            envoyerJson(reponse, 200, {
              plats: plats.map((plat) => ({
                nom: plat.nom,
                categorie: plat.categorie,
                prix: plat.prix,
                description: plat.description,
                niveauPiment: plat.niveauPiment,
                allergenes: plat.allergenes,
                disponible: plat.disponible,
                stockPortions: plat.stockPortions,
              })),
            });
            return;
          }

          if (chemin === "/api/rapport" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            const maintenant = new Date();
            const session: SessionContext = {
              idSession: "web-rapport",
              nomUtilisateur: "Tableau de bord",
              role,
              canal: "web",
              organizationId: configuration.organizationId,
              tenantId: configuration.tenantId,
            };
            const contexte: ContexteOutil = { adaptateur, session, maintenant };
            const chiffre = await executerOutil(
              "obtenir_chiffre_affaires",
              JSON.stringify({ periode: "semaine" }),
              contexte
            );
            if (!chiffre.succes) {
              envoyerJson(reponse, 403, {
                erreur: "Les rapports financiers sont réservés à la direction. Basculez en rôle Patron.",
              });
              return;
            }
            const ventes = await executerOutil("analyser_ventes", JSON.stringify({ periode: "semaine" }), contexte);
            const previsions = await executerOutil(
              "previsions_affluence",
              JSON.stringify({ date_cible: toISODate(prochainJour(maintenant, 6)) }),
              contexte
            );
            const noShows = await executerOutil(
              "liste_reservations",
              JSON.stringify({
                statut: "NO_SHOW",
                date_debut: toISODate(ajouterJours(maintenant, -14)),
                date_fin: toISODate(ajouterJours(maintenant, -1)),
              }),
              contexte
            );
            const chiffreJour = await executerOutil(
              "obtenir_chiffre_affaires",
              JSON.stringify({ periode: "aujourdhui" }),
              contexte
            );
            const tables = await adaptateur.listerTables();
            const capaciteCouverts = tables.reduce((somme, table) => somme + table.capacite, 0);
            const debutAffluence = toISODate(ajouterJours(maintenant, -6));
            const finAffluence = toISODate(maintenant);
            const reservationsAffluence = await adaptateur.listerReservations({
              dateDebut: debutAffluence,
              dateFin: finAffluence,
              statut: "CONFIRMEE",
            });
            const affluence: Array<{ date: string; couverts: number; occupationPourcent: number }> = [];
            for (let decalage = -6; decalage <= 0; decalage++) {
              const iso = toISODate(ajouterJours(maintenant, decalage));
              const couverts = reservationsAffluence
                .filter((reservation) => reservation.date === iso)
                .reduce((somme, reservation) => somme + reservation.nombrePersonnes, 0);
              affluence.push({
                date: iso,
                couverts,
                occupationPourcent:
                  capaciteCouverts > 0
                    ? Math.round((Math.min(couverts, capaciteCouverts) / capaciteCouverts) * 1000) / 10
                    : 0,
              });
            }
            const clientsFideles = await regrouperClients(
              toISODate(ajouterJours(maintenant, -30)),
              finAffluence
            );
            const isoJourService = toISODate(maintenant);
            const [commandesJour, affectationsJour, resasConfirmeesJour, employesService] = await Promise.all([
              adaptateur.listerCommandes({ date: isoJourService }),
              adaptateur.listerAffectations(isoJourService),
              adaptateur.listerReservations({ dateDebut: isoJourService, dateFin: isoJourService, statut: "CONFIRMEE" }),
              adaptateur.listerEmployes(),
            ]);
            const compteParStatut: Record<string, number> = {
              EN_ATTENTE: 0,
              EN_CUISINE: 0,
              PRETE: 0,
              SERVIE: 0,
              PAYEE: 0,
            };
            for (const commande of commandesJour) {
              compteParStatut[commande.statut] = (compteParStatut[commande.statut] ?? 0) + 1;
            }
            const reservationsSansServeur = resasConfirmeesJour.filter(
              (reservation) => !affectationsJour.some((affectation) => affectation.reservationCode === reservation.code)
            ).length;
            envoyerJson(reponse, 200, {
              chiffre: JSON.parse(chiffre.contenu),
              chiffreJour: JSON.parse(chiffreJour.contenu),
              ventes: JSON.parse(ventes.contenu),
              previsions: JSON.parse(previsions.contenu),
              noShows: JSON.parse(noShows.contenu),
              affluence,
              capaciteCouverts,
              clientsFideles: clientsFideles.slice(0, 10),
              service: {
                commandesParStatut: compteParStatut,
                commandesOuvertes: commandesJour.filter((commande) => commande.statut !== "PAYEE").length,
                montantEnCours: commandesJour
                  .filter((commande) => commande.statut === "SERVIE")
                  .reduce((somme, commande) => somme + commande.montantTotal, 0),
                reservationsSansServeur,
                reservationsConfirmees: resasConfirmeesJour.length,
                serveursActifs: employesService.filter(
                  (employe) => employe.fonction === "serveur" && employe.actif
                ).length,
              },
            });
            return;
          }

          if (chemin === "/api/clients" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            if (role === "CLIENT") {
              envoyerJson(reponse, 403, {
                erreur: "La liste des clients est réservée à l'équipe du restaurant.",
              });
              return;
            }
            const maintenant = new Date();
            const clients = await regrouperClients(
              toISODate(ajouterJours(maintenant, -30)),
              toISODate(maintenant)
            );
            envoyerJson(reponse, 200, { clients });
            return;
          }

          if (chemin === "/api/equipe" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            if (!ROLES_SERVICE.includes(role)) {
              envoyerJson(reponse, 403, { erreur: "L'équipe est visible par les membres du restaurant uniquement." });
              return;
            }
            const employes = await adaptateur.listerEmployes();
            envoyerJson(reponse, 200, { employes });
            return;
          }

          if (chemin === "/api/equipe" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            const corps = JSON.parse(await lireCorps(requete)) as {
              nom?: string;
              fonction?: string;
              telephone?: string;
            };
            const resultat = await executerOutil(
              "creer_membre_equipe",
              JSON.stringify({ nom: corps.nom, fonction: corps.fonction, telephone: corps.telephone }),
              { adaptateur, session: sessionApi(role, "Équipe web"), maintenant: new Date() }
            );
            if (!resultat.succes) {
              envoyerJson(reponse, resultat.contenu.startsWith("ACCÈS REFUSÉ") ? 403 : 400, {
                erreur: resultat.contenu,
              });
              return;
            }
            envoyerJson(reponse, 200, JSON.parse(resultat.contenu));
            return;
          }

          if (chemin === "/api/commandes" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            if (!ROLES_SERVICE.includes(role)) {
              envoyerJson(reponse, 403, { erreur: "Les commandes sont réservées à l'équipe du restaurant." });
              return;
            }
            const date = url.searchParams.get("date") ?? toISODate(new Date());
            const statutBrut = url.searchParams.get("statut");
            const statut =
              statutBrut === "EN_ATTENTE" ||
              statutBrut === "EN_CUISINE" ||
              statutBrut === "PRETE" ||
              statutBrut === "SERVIE" ||
              statutBrut === "PAYEE"
                ? statutBrut
                : undefined;
            const table = url.searchParams.get("table") ?? undefined;
            const [commandes, employes, tables] = await Promise.all([
              adaptateur.listerCommandes({ date, statut, tableId: table }),
              adaptateur.listerEmployes(),
              adaptateur.listerTables(),
            ]);
            const nomEmploye = (id: string | null) =>
              id ? (employes.find((employe) => employe.id === id)?.nom ?? id) : null;
            envoyerJson(reponse, 200, {
              date,
              commandes: commandes.map((commande) => ({
                id: commande.id,
                date: commande.date,
                heure: commande.heure,
                tableId: commande.tableId,
                tableName: commande.tableId
                  ? (tables.find((tableInfo) => tableInfo.id === commande.tableId)?.nom ?? commande.tableId)
                  : null,
                reservationCode: commande.reservationCode,
                serveurId: commande.serveurId,
                serveurNom: nomEmploye(commande.serveurId),
                cuisinierId: commande.cuisinierId,
                cuisinierNom: nomEmploye(commande.cuisinierId),
                statut: commande.statut,
                mode: commande.mode,
                lignes: commande.lignes,
                montantTotal: commande.montantTotal,
              })),
            });
            return;
          }

          if (chemin === "/api/commandes" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            const corps = JSON.parse(await lireCorps(requete)) as {
              tableId?: string;
              reservationCode?: string;
              serveurId?: string;
              lignes?: Array<{ plat: string; quantite: number; notes?: string }>;
            };
            const resultat = await executerOutil(
              "creer_commande",
              JSON.stringify({
                table: corps.tableId,
                reservation_code: corps.reservationCode,
                serveur: corps.serveurId,
                lignes: corps.lignes ?? [],
              }),
              { adaptateur, session: sessionApi(role, "Service web"), maintenant: new Date() }
            );
            if (!resultat.succes) {
              envoyerJson(reponse, resultat.contenu.startsWith("ACCÈS REFUSÉ") ? 403 : 400, {
                erreur: resultat.contenu,
              });
              return;
            }
            envoyerJson(reponse, 200, JSON.parse(resultat.contenu));
            return;
          }

          if (chemin === "/api/commandes/statut" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            const corps = JSON.parse(await lireCorps(requete)) as { id?: string; statut?: string };
            const resultat = await executerOutil(
              "maj_statut_commande",
              JSON.stringify({ id_commande: corps.id, statut: corps.statut }),
              { adaptateur, session: sessionApi(role, "Service web"), maintenant: new Date() }
            );
            if (!resultat.succes) {
              envoyerJson(reponse, resultat.contenu.startsWith("ACCÈS REFUSÉ") ? 403 : 400, {
                erreur: resultat.contenu,
              });
              return;
            }
            envoyerJson(reponse, 200, JSON.parse(resultat.contenu));
            return;
          }

          if (chemin === "/api/commandes/assignation" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            const corps = JSON.parse(await lireCorps(requete)) as {
              id?: string;
              serveurId?: string;
              cuisinierId?: string;
            };
            const resultat = await executerOutil(
              "assigner_commande",
              JSON.stringify({
                id_commande: corps.id,
                serveur: corps.serveurId,
                cuisinier: corps.cuisinierId,
              }),
              { adaptateur, session: sessionApi(role, "Service web"), maintenant: new Date() }
            );
            if (!resultat.succes) {
              envoyerJson(reponse, resultat.contenu.startsWith("ACCÈS REFUSÉ") ? 403 : 400, {
                erreur: resultat.contenu,
              });
              return;
            }
            envoyerJson(reponse, 200, JSON.parse(resultat.contenu));
            return;
          }

          if (chemin === "/api/affectations" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            if (role !== "RESTAURANT_ADMIN" && role !== "SERVER" && role !== "KITCHEN") {
              envoyerJson(reponse, 403, { erreur: "Les affectations de service sont réservées à la salle et à la direction." });
              return;
            }
            const date = url.searchParams.get("date") ?? toISODate(new Date());
            const [affectations, reservations, employes] = await Promise.all([
              adaptateur.listerAffectations(date),
              adaptateur.listerReservations({ dateDebut: date, dateFin: date, statut: "CONFIRMEE" }),
              adaptateur.listerEmployes(),
            ]);
            const serveurs = employes.filter((employe) => employe.fonction === "serveur" && employe.actif);
            const nomServeur = (id: string) => employes.find((employe) => employe.id === id)?.nom ?? id;
            envoyerJson(reponse, 200, {
              date,
              serveurs,
              reservations: reservations.map((reservation) => {
                const affectation = affectations.find((element) => element.reservationCode === reservation.code);
                return {
                  code: reservation.code,
                  heure: reservation.heure,
                  date: reservation.date,
                  table: reservation.tableId,
                  nomClient: reservation.nomClient,
                  telephone: reservation.telephone,
                  nombrePersonnes: reservation.nombrePersonnes,
                  serveurId: affectation ? affectation.serveurId : null,
                  serveurNom: affectation ? nomServeur(affectation.serveurId) : null,
                };
              }),
            });
            return;
          }

          if (chemin === "/api/affectations" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            const corps = JSON.parse(await lireCorps(requete)) as {
              reservationCode?: string;
              serveurId?: string;
              date?: string;
            };
            const resultat = await executerOutil(
              "affecter_reservation",
              JSON.stringify({
                code_reservation: corps.reservationCode,
                serveur: corps.serveurId,
                date: corps.date ?? toISODate(new Date()),
              }),
              { adaptateur, session: sessionApi(role, "Service web"), maintenant: new Date() }
            );
            if (!resultat.succes) {
              envoyerJson(reponse, resultat.contenu.startsWith("ACCÈS REFUSÉ") ? 403 : 400, {
                erreur: resultat.contenu,
              });
              return;
            }
            envoyerJson(reponse, 200, JSON.parse(resultat.contenu));
            return;
          }

          if (chemin === "/api/affectations/retirer" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            if (role !== "RESTAURANT_ADMIN" && role !== "SERVER") {
              envoyerJson(reponse, 403, { erreur: "Seuls la direction et les serveurs peuvent retirer une affectation." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { reservationCode?: string; date?: string };
            try {
              await adaptateur.retirerAffectation(
                corps.date ?? toISODate(new Date()),
                String(corps.reservationCode ?? "")
              );
              envoyerJson(reponse, 200, { confirmation: true });
            } catch (erreur) {
              envoyerJson(reponse, 400, {
                erreur: erreur instanceof Error ? erreur.message : String(erreur),
              });
            }
            return;
          }

          if (chemin === "/api/planning" && requete.method === "GET") {
            const { role } = lireContexteRole(requete);
            if (!ROLES_SERVICE.includes(role)) {
              envoyerJson(reponse, 403, { erreur: "Le planning est réservé à l'équipe du restaurant." });
              return;
            }
            const maintenant = new Date();
            const debut = url.searchParams.get("dateDebut") ?? toISODate(maintenant);
            const fin = url.searchParams.get("dateFin") ?? toISODate(ajouterJours(maintenant, 7));
            const [shifts, employes] = await Promise.all([
              adaptateur.listerPlanning(debut, fin),
              adaptateur.listerEmployes(),
            ]);
            envoyerJson(reponse, 200, {
              debut,
              fin,
              shifts: shifts.map((shift) => {
                const employe = employes.find((element) => element.id === shift.employeId);
                return {
                  ...shift,
                  employeNom: employe?.nom ?? shift.employeId,
                  employeFonction: employe?.fonction ?? "serveur",
                };
              }),
            });
            return;
          }

          if (chemin === "/api/planning" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            const corps = JSON.parse(await lireCorps(requete)) as {
              employeId?: string;
              date?: string;
              debut?: string;
              fin?: string;
              poste?: string;
            };
            const resultat = await executerOutil(
              "creer_shift",
              JSON.stringify({
                date: corps.date,
                employe: corps.employeId,
                debut: corps.debut,
                fin: corps.fin,
                poste: corps.poste,
              }),
              { adaptateur, session: sessionApi(role, "Direction"), maintenant: new Date() }
            );
            if (!resultat.succes) {
              envoyerJson(reponse, resultat.contenu.startsWith("ACCÈS REFUSÉ") ? 403 : 400, {
                erreur: resultat.contenu,
              });
              return;
            }
            envoyerJson(reponse, 200, JSON.parse(resultat.contenu));
            return;
          }

          if (chemin === "/api/planning/supprimer" && requete.method === "POST") {
            const { role } = lireContexteRole(requete);
            if (role !== "RESTAURANT_ADMIN") {
              envoyerJson(reponse, 403, { erreur: "Seule la direction peut supprimer un shift." });
              return;
            }
            const corps = JSON.parse(await lireCorps(requete)) as { id?: string };
            try {
              await adaptateur.supprimerShift(String(corps.id ?? ""));
              envoyerJson(reponse, 200, { confirmation: true });
            } catch (erreur) {
              envoyerJson(reponse, 400, {
                erreur: erreur instanceof Error ? erreur.message : String(erreur),
              });
            }
            return;
          }

           if (chemin === "/api/chat" && requete.method === "POST") {
             if (!llmConfigure) {
               envoyerJson(reponse, 503, {
                 erreur:
                   "Le service LLM n'est pas configuré : renseignez LLM_API_KEY (et CLOUDFLARE_ACCOUNT_ID ou LLM_BASE_URL) dans le fichier .env, puis relancez. Le tableau de bord reste utilisable.",
               });
               return;
             }
             const contexteRole = lireContexteRole(requete);
             const corps = JSON.parse(await lireCorps(requete)) as {
               idSession?: string;
               nom?: string;
               message?: string;
             };
             const entree = obtenirSessionWeb(
               String(corps.idSession ?? "anonyme"),
               contexteRole.role,
               String(corps.nom ?? contexteRole.nom)
             );
             const message = String(corps.message ?? "").trim();
             if (!message) {
               envoyerJson(reponse, 400, { erreur: "Message vide." });
               return;
             }
            try {
              const reponseAgent = await agent.repondre(entree.session, message, entree.historique);
              envoyerJson(reponse, 200, {
                reponse: reponseAgent.reponse,
                appels: reponseAgent.appels.map((appel) => ({ nom: appel.nom, succes: appel.succes })),
              });
            } catch (erreur) {
              envoyerJson(reponse, 502, {
                erreur: erreur instanceof Error ? erreur.message : String(erreur),
              });
            }
            return;
          }

          envoyerJson(reponse, 404, { erreur: "Route inconnue." });
        } catch (erreur) {
          envoyerJson(reponse, 500, {
            erreur: erreur instanceof Error ? erreur.message : String(erreur),
          });
        }
        return;
      }

      if (requete.method === "GET") {
        await servirStatique(reponse, chemin);
        return;
      }
      reponse.writeHead(404);
      reponse.end();
    })().catch((erreur) => {
      capturerErreur(erreur);
      console.error(`[web] Erreur serveur : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      if (!reponse.headersSent) {
        reponse.writeHead(500);
        reponse.end();
      }
    });
  });

  serveur.listen(configuration.portWeb, () => {
    console.log("══════════════════════════════════════════════════════════");
    console.log(`CHAFIK — interface web du restaurant ${configuration.restaurantNom}`);
    console.log(`Adresse         : http://localhost:${configuration.portWeb}`);
    console.log(`Données         : mode ${configuration.evergauzy.mode}`);
    console.log(`Chat LLM        : ${llmConfigure ? `opérationnel (${configuration.llm.model})` : "NON configuré — renseignez LLM_API_KEY dans .env"}`);
    console.log(
      `Frontend servi  : ${existsSync(distWeb) ? "web/dist" : "absent — lancez « npm run web:build » ou « npm run web:dev »"}`
    );
    console.log(`Webhook WhatsApp: npm run whatsapp (port ${configuration.whatsapp.port})`);
    console.log("══════════════════════════════════════════════════════════");
  });

  process.on("SIGTERM", () => {
    void fermerSentry().then(() => process.exit(0));
  });
  process.on("SIGINT", () => {
    void fermerSentry().then(() => process.exit(0));
  });
}

main().catch((erreur) => {
  console.error("Impossible de démarrer le serveur web :", erreur instanceof Error ? erreur.message : String(erreur));
  process.exit(1);
});
