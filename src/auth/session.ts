import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FonctionEmploye, Role } from "../types.js";

export const NOM_COOKIE_SESSION = "perissos_session";
export const DUREE_SESSION_HEURES = 12;

export function genererMotDePasse(taille = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const octets = randomBytes(taille);
  let motDePasse = "";
  for (let index = 0; index < taille; index++) {
    motDePasse += alphabet[octets[index] % alphabet.length];
  }
  return motDePasse;
}

export interface ChargeSession {
  idCompte: string;
  employeId: string;
  nom: string;
  role: Role;
  exp: number;
}

const ROLE_PAR_FONCTION: Record<FonctionEmploye, Role> = {
  patron: "RESTAURANT_ADMIN",
  serveur: "SERVER",
  cuisinier: "KITCHEN",
  barman: "BAR",
  caissier: "CASHIER",
};

export function rolePourFonction(fonction: FonctionEmploye): Role {
  return ROLE_PAR_FONCTION[fonction];
}

function signer(corps: string, secret: string): string {
  return createHmac("sha256", secret).update(corps).digest("base64url");
}

export function creerJetonSession(
  charge: Omit<ChargeSession, "exp">,
  secret: string,
  dureeHeures: number = DUREE_SESSION_HEURES
): string {
  const complete: ChargeSession = {
    ...charge,
    exp: Math.floor(Date.now() / 1000) + dureeHeures * 3600,
  };
  const corps = Buffer.from(JSON.stringify(complete)).toString("base64url");
  return `${corps}.${signer(corps, secret)}`;
}

export function verifierJetonSession(jeton: string | undefined, secret: string): ChargeSession | null {
  if (!jeton) return null;
  const separateur = jeton.lastIndexOf(".");
  if (separateur <= 0) return null;
  const corps = jeton.slice(0, separateur);
  const signature = jeton.slice(separateur + 1);
  const signatureAttendue = signer(corps, secret);
  const tamponRecu = Buffer.from(signature);
  const tamponAttendu = Buffer.from(signatureAttendue);
  if (tamponRecu.length !== tamponAttendu.length || !timingSafeEqual(tamponRecu, tamponAttendu)) {
    return null;
  }
  try {
    const charge = JSON.parse(Buffer.from(corps, "base64url").toString("utf8")) as ChargeSession;
    if (typeof charge.exp !== "number" || charge.exp * 1000 < Date.now()) {
      return null;
    }
    if (charge.role !== "RESTAURANT_ADMIN" && charge.role !== "SERVER" && charge.role !== "KITCHEN" && charge.role !== "BAR" && charge.role !== "CASHIER") {
      return null;
    }
    return charge;
  } catch {
    return null;
  }
}

export function lireCookies(requete: { headers: { cookie?: string } }): Record<string, string> {
  const cookies: Record<string, string> = {};
  const entete = requete.headers.cookie;
  if (!entete) return cookies;
  for (const morceau of entete.split(";")) {
    const egal = morceau.indexOf("=");
    if (egal <= 0) continue;
    const cle = morceau.slice(0, egal).trim();
    const valeur = morceau.slice(egal + 1).trim();
    if (cle) cookies[cle] = decodeURIComponent(valeur);
  }
  return cookies;
}

export function enteteCookieSession(jeton: string, dureeHeures: number = DUREE_SESSION_HEURES): string {
  const maxAge = dureeHeures * 3600;
  return `${NOM_COOKIE_SESSION}=${encodeURIComponent(jeton)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function enteteCookieExpiration(): string {
  return `${NOM_COOKIE_SESSION}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
