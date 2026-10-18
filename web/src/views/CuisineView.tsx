import { useEffect } from "react";
import BadgeStatut from "../components/BadgeStatut";
import Icon from "../components/Icon";
import { depuisQuand } from "../format";
import type { CommandeWeb, RoleWeb, StatutCommandeWeb } from "../types";

const COLONNES: Array<{ cle: StatutCommandeWeb; titre: string; couleur: string }> = [
  {
    cle: "EN_ATTENTE",
    titre: "En attente",
    couleur: "from-amber-500/10 to-transparent border-amber-200 dark:border-amber-900",
  },
  {
    cle: "EN_CUISINE",
    titre: "En cuisine",
    couleur: "from-blue-500/10 to-transparent border-blue-200 dark:border-blue-900",
  },
  {
    cle: "PRETE",
    titre: "Prêtes",
    couleur: "from-violet-500/10 to-transparent border-violet-200 dark:border-violet-900",
  },
];

function minutesDepuis(commande: CommandeWeb): number {
  const ecart = Date.now() - new Date(`${commande.date}T${commande.heure}:00`).getTime();
  return Math.max(0, Math.round(ecart / 60000));
}

export default function CuisineView({
  commandes,
  role,
  onMajStatut,
  onRafraichir,
}: {
  commandes: CommandeWeb[];
  role: RoleWeb;
  onMajStatut: (id: string, statut: StatutCommandeWeb) => Promise<void>;
  onRafraichir: () => void;
}) {
  useEffect(() => {
    const minuteur = setInterval(onRafraichir, 15000);
    return () => clearInterval(minuteur);
  }, [onRafraichir]);

  const actives = commandes.filter(
    (commande) =>
      commande.statut === "EN_ATTENTE" || commande.statut === "EN_CUISINE" || commande.statut === "PRETE"
  );
  const cuisinier = role === "KITCHEN" || role === "RESTAURANT_ADMIN";

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Écran cuisine
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            {actives.length} ticket(s) en cours · mise à jour automatique toutes les 15 s
          </p>
        </div>
        <button
          onClick={onRafraichir}
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400 transition flex items-center gap-1.5"
        >
          <Icon nom="clock" className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {COLONNES.map((colonne, colonneIndex) => {
          const tickets = actives.filter((commande) => commande.statut === colonne.cle);
          return (
            <div
              key={colonne.cle}
              className={`rounded-2xl border bg-gradient-to-b p-3 md:p-4 animate-fadeUp ${colonne.couleur}`}
              style={{ animationDelay: `${colonneIndex * 0.06}s` }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-display text-sm font-bold text-gray-900 dark:text-white">
                  {colonne.titre}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                  {tickets.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {tickets.length === 0 && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 bg-white/60 dark:bg-gray-900/40 rounded-xl p-3 border border-dashed border-gray-200 dark:border-gray-700">
                    Rien dans cette colonne.
                  </p>
                )}
                {tickets.map((commande) => {
                  const age = minutesDepuis(commande);
                  const urgent = age >= 25 && commande.statut !== "PRETE";
                  return (
                    <div
                      key={commande.id}
                      className={`bg-white dark:bg-gray-900/90 rounded-xl p-3 border shadow-sm ${
                        urgent ? "border-red-300 dark:border-red-800" : "border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-gray-900 dark:text-white">
                            {commande.id}
                          </span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                            {commande.tableName ?? commande.tableId ?? "Sans table"}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            urgent
                              ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {depuisQuand(`${commande.date}T${commande.heure}:00`)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {commande.lignes.map((ligne, index) => (
                          <div
                            key={`${commande.id}-${index}`}
                            className="flex items-start justify-between gap-2 text-xs"
                          >
                            <span className="text-gray-800 dark:text-gray-100 font-medium">
                              {ligne.plat}
                            </span>
                            <span className="font-display font-bold text-gray-900 dark:text-white">
                              ×{ligne.quantite}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                        <div className="text-[10px] text-gray-400 min-w-0 truncate">
                          {commande.serveurNom ? `Serveur : ${commande.serveurNom}` : "Sans serveur"}
                          {commande.lignes.some((ligne) => ligne.notes) ? " · notes" : ""}
                        </div>
                        {cuisinier && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {commande.statut === "EN_ATTENTE" && (
                              <button
                                onClick={() => void onMajStatut(commande.id, "EN_CUISINE")}
                                className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                              >
                                Accepter
                              </button>
                            )}
                            {commande.statut === "EN_CUISINE" && (
                              <button
                                onClick={() => void onMajStatut(commande.id, "PRETE")}
                                className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition flex items-center gap-1"
                              >
                                <Icon nom="check" className="w-3 h-3" />
                                Prête
                              </button>
                            )}
                            {commande.statut === "PRETE" && (
                              <BadgeStatut statut="PRETE" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
