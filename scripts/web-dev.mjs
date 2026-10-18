import { spawn } from "node:child_process";

const processus = [
  { nom: "api", couleur: "\x1b[32m", commande: "npx", args: ["tsx", "src/serveur-web.ts"] },
  { nom: "web", couleur: "\x1b[36m", commande: "npx", args: ["vite"], repertoire: "web" },
];

const enfants = processus.map((definition) => {
  const enfant = spawn(definition.commande, definition.args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    ...(definition.repertoire ? { cwd: definition.repertoire } : {}),
  });
  const prefixer = (flux: NodeJS.WriteStream) => (donnees: Buffer) => {
    flux.write(`${definition.couleur}[${definition.nom}]\x1b[0m ${donnees.toString().trim()}\n`);
  };
  enfant.stdout.on("data", prefixer(process.stdout));
  enfant.stderr.on("data", prefixer(process.stderr));
  enfant.on("exit", (code) => {
    console.log(`[${definition.nom}] processus arrêté (code ${code})`);
  });
  return enfant;
});

function arreter(): void {
  for (const enfant of enfants) {
    enfant.kill();
  }
  process.exit(0);
}

process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
