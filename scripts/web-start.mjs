import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync, openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dossierJournaux = path.join(racine, "logs");
const fichierPid = path.join(dossierJournaux, "web-api.pid");
const fichierJournal = path.join(dossierJournaux, "web-api.log");

mkdirSync(dossierJournaux, { recursive: true });

if (existsSync(fichierPid)) {
  const pidExistant = Number(readFileSync(fichierPid, "utf8").trim());
  try {
    process.kill(pidExistant, 0);
    console.log(`Le portail tourne déjà (pid ${pidExistant}).`);
    console.log("Adresse : http://localhost:4040 · Arrêt : npm run web:stop");
    process.exit(0);
  } catch {
    console.log("Ancien processus détecté mais inactif, redémarrage…");
  }
}

const journal = openSync(fichierJournal, "a");
const enfant = spawn("npx", ["tsx", "src/serveur-web.ts"], {
  cwd: racine,
  detached: true,
  stdio: ["ignore", journal, journal],
  shell: process.platform === "win32",
});
enfant.unref();
writeFileSync(fichierPid, String(enfant.pid));

console.log(`Portail démarré (pid ${enfant.pid}).`);
console.log("Adresse : http://localhost:4040");
console.log(`Journal : ${fichierJournal}`);
console.log("Arrêt   : npm run web:stop");
