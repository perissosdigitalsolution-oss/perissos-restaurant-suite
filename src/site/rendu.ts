import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/client.js";
import { themes, themeFichiers, sitesRestaurant } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { AdaptateurDonneesRestaurant } from "../evergauzy/adaptateur.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = resolve(__dirname, "../../web/themes");

export interface DonneesSite {
  restaurant: { nom: string; ville: string };
  menu: Array<{ nom: string; prix: number; description: string }>;
  couleurs: { primaire: string; secondaire: string; fond: string; texte: string };
  hero?: string;
}

export async function listerThemes(): Promise<
  Array<{ id: string; nom: string; description: string; auteur: string; version: string; categorie: string; previewUrl: string | null; actif: boolean }>
> {
  const liste = await db.select().from(themes).where(eq(themes.actif, true));
  return liste.map((t) => ({
    id: t.id,
    nom: t.nom,
    description: t.description,
    auteur: t.auteur,
    version: t.version,
    categorie: t.categorie,
    previewUrl: t.previewUrl,
    actif: t.actif,
  }));
}

export async function obtenirTheme(id: string): Promise<{ id: string; fichiers: Array<{ chemin: string; contenu: string; type: string }> } | null> {
  const theme = await db.select().from(themes).where(eq(themes.id, id));
  if (theme.length === 0) return null;
  const fichiers = await db.select().from(themeFichiers).where(eq(themeFichiers.themeId, id)).orderBy(themeFichiers.ordre);
  return {
    id: theme[0].id,
    fichiers: fichiers.map((f) => ({ chemin: f.chemin, contenu: f.contenu, type: f.type })),
  };
}

export async function lireConfigSite(tenantId: string): Promise<{
  id: string;
  themeId: string | null;
  slug: string;
  config: Record<string, unknown>;
  statut: string;
  urlPublique: string | null;
} | null> {
  const liste = await db.select().from(sitesRestaurant).where(eq(sitesRestaurant.tenantId, tenantId));
  if (liste.length === 0) return null;
  const site = liste[0];
  return {
    id: site.id,
    themeId: site.themeId,
    slug: site.slug,
    config: (site.config as Record<string, unknown>) ?? {},
    statut: site.statut,
    urlPublique: site.urlPublique,
  };
}

export async function sauverConfigSite(
  tenantId: string,
  themeId: string,
  slug: string,
  config: Record<string, unknown>
): Promise<{ id: string; slug: string }> {
  const existant = await db.select().from(sitesRestaurant).where(eq(sitesRestaurant.tenantId, tenantId));
  if (existant.length > 0) {
    await db
      .update(sitesRestaurant)
      .set({ themeId, slug, config, statut: "brouillon", majLe: new Date() })
      .where(eq(sitesRestaurant.tenantId, tenantId));
    return { id: existant[0].id, slug };
  }
  const [insere] = await db
    .insert(sitesRestaurant)
    .values({ tenantId, themeId, slug, config, statut: "brouillon" })
    .returning({ id: sitesRestaurant.id, slug: sitesRestaurant.slug });
  return { id: insere.id, slug: insere.slug };
}

export function rendreTemplate(html: string, donnees: DonneesSite): string {
  const menuHtml = donnees.menu
    .map(
      (plat) =>
        `<div class="plat"><div class="top"><h3>${echapper(plat.nom)}</h3><span class="prix">${plat.prix.toLocaleString("fr-FR")} FCFA</span></div><p class="desc">${echapper(plat.description)}</p></div>`
    )
    .join("\n");

  const remplacements: Record<string, string> = {
    "{{restaurant.nom}}": echapper(donnees.restaurant.nom),
    "{{restaurant.ville}}": echapper(donnees.restaurant.ville),
    "{{couleurs.primaire}}": donnees.couleurs.primaire,
    "{{couleurs.secondaire}}": donnees.couleurs.secondaire,
    "{{couleurs.fond}}": donnees.couleurs.fond,
    "{{couleurs.texte}}": donnees.couleurs.texte,
    "{{menu}}": menuHtml,
    "{{hero}}": donnees.hero ?? "",
  };

  let resultat = html;
  for (const [cle, valeur] of Object.entries(remplacements)) {
    resultat = resultat.split(cle).join(valeur);
  }
  return resultat;
}

function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function publierSite(
  tenantId: string,
  adaptateur: AdaptateurDonneesRestaurant
): Promise<{ slug: string; html: string }> {
  const site = await lireConfigSite(tenantId);
  if (!site || !site.themeId) {
    throw new Error("Aucun thème sélectionné pour ce site.");
  }
  const theme = await obtenirTheme(site.themeId);
  if (!theme) {
    throw new Error(`Thème introuvable : ${site.themeId}.`);
  }
  const fichierHtml = theme.fichiers.find((f) => f.chemin === "index.html");
  if (!fichierHtml) {
    throw new Error("Le thème ne contient pas de fichier index.html.");
  }
  const config = site.config as Record<string, unknown>;
  const couleurs = (config.couleurs as DonneesSite["couleurs"]) ?? {
    primaire: "#064E3B",
    secondaire: "#D4AF37",
    fond: "#FDFCF7",
    texte: "#1F2937",
  };
  const menu = await adaptateur.listerMenu();
  const donnees: DonneesSite = {
    restaurant: { nom: "Périssos", ville: "Abidjan" },
    menu: menu.map((p) => ({ nom: p.nom, prix: p.prix, description: p.description })),
    couleurs,
    hero: typeof config.hero === "string" ? config.hero : undefined,
  };
  const html = rendreTemplate(fichierHtml.contenu, donnees);
  await db
    .update(sitesRestaurant)
    .set({ statut: "publie", urlPublique: `/site/${site.slug}`, majLe: new Date() })
    .where(eq(sitesRestaurant.tenantId, tenantId));
  return { slug: site.slug, html };
}

export async function obtenirSitePublie(slug: string): Promise<string | null> {
  const liste = await db.select().from(sitesRestaurant).where(eq(sitesRestaurant.slug, slug));
  if (liste.length === 0 || liste[0].statut !== "publie") return null;
  const site = liste[0];
  if (!site.themeId) return null;
  const theme = await obtenirTheme(site.themeId);
  if (!theme) return null;
  const fichierHtml = theme.fichiers.find((f) => f.chemin === "index.html");
  if (!fichierHtml) return null;
  const config = (site.config as Record<string, unknown>) ?? {};
  const couleurs = (config.couleurs as DonneesSite["couleurs"]) ?? {
    primaire: "#064E3B",
    secondaire: "#D4AF37",
    fond: "#FDFCF7",
    texte: "#1F2937",
  };
  const adaptateur = (await import("../evergauzy/index.js")).creerAdaptateur(
    (await import("../config.js")).chargerConfiguration()
  );
  const menu = await adaptateur.listerMenu();
  const donnees: DonneesSite = {
    restaurant: { nom: "Périssos", ville: "Abidjan" },
    menu: menu.map((p) => ({ nom: p.nom, prix: p.prix, description: p.description })),
    couleurs,
    hero: typeof config.hero === "string" ? config.hero : undefined,
  };
  return rendreTemplate(fichierHtml.contenu, donnees);
}
