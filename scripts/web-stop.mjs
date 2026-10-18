import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fichierPid = path.join(racine, "logs", "web-api.pid");

if (process.platform !== "win32") {
  spawnSync("pkill", ["-f", "serveur-web"], { stdio: "ignore" });
}

if (existsSync(fichierPid)) {
  const pid = Number(readFileSync(fichierPid, "utf8").trim());
  try {
    process.kill(pid);
  } catch {
    console.log("Le processus n'était déjà plus actif.");
  }
  rmSync(fichierPid, { force: true });
}

console.log("Portail arrêté.");
