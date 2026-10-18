import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { themes, themeFichiers } from "./schema.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = resolve(__dirname, "../../web/themes");

const THEMES: Array<{ id: string; fichiers: string[] }> = [
  { id: "simple", fichiers: ["theme.json", "index.html"] },
  { id: "elegant", fichiers: ["theme.json", "index.html"] },
  { id: "modern", fichiers: ["theme.json", "index.html"] },
];

async function seedThemes(): Promise<void> {
  for (const theme of THEMES) {
    const themeJson = JSON.parse(readFileSync(resolve(THEMES_DIR, theme.id, "theme.json"), "utf-8"));
    await db.insert(themes).values({
      id: themeJson.id,
      nom: themeJson.nom,
      description: themeJson.description,
      auteur: themeJson.auteur,
      version: themeJson.version,
      categorie: themeJson.categorie,
      previewUrl: themeJson.previewUrl,
      actif: true,
    }).onConflictDoNothing();

    for (const fichier of theme.fichiers) {
      const contenu = readFileSync(resolve(THEMES_DIR, theme.id, fichier), "utf-8");
      const type = fichier.endsWith(".html") ? "html" : fichier.endsWith(".css") ? "css" : fichier.endsWith(".js") ? "js" : "json";
      await db.insert(themeFichiers).values({
        themeId: themeJson.id,
        chemin: fichier,
        contenu,
        type,
        ordre: theme.fichiers.indexOf(fichier),
      }).onConflictDoNothing();
    }
    console.log(`✓ Thème "${themeJson.nom}" (${themeJson.id}) — ${theme.fichiers.length} fichiers`);
  }
  console.log("\nSeed thèmes terminé.");
}

seedThemes().catch((erreur) => {
  console.error("Erreur seed thèmes:", erreur);
  process.exit(1);
});
