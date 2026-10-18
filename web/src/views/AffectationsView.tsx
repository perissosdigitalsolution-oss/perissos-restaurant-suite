import { useState } from "react";
import Icon from "../components/Icon";
import type { AffectationsJourWeb, RoleWeb } from "../types";

export default function AffectationsView({
  affectations,
  role,
  onAffecter,
  onRetirer,
  onQuestion,
}: {
  affectations: AffectationsJourWeb | null;
  role: RoleWeb;
  onAffecter: (reservationCode: string, serveurId: string) => Promise<void>;
  onRetirer: (reservationCode: string) => Promise<void>;
  onQuestion: (question: string) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);

  if (!affectations) {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        Chargement des affectations…
      </div>
    );
  }

  const executer = async (action: () => Promise<void>) => {
    try {
      setErreur(null);
      await action();
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const sansServeur = affectations.reservations.filter((reservation) => !reservation.serveurId);
  const parServeur = (serveurId: string) =>
    affectations.reservations.filter((reservation) => reservation.serveurId === serveurId);
  const peutModifier = role === "RESTAURANT_ADMIN" || role === "SERVER";

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Affectations du service
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            {affectations.reservations.length} réservation(s) confirmée(s) ·{" "}
            <span
              className={
                sansServeur.length > 0
                  ? "font-semibold text-amber-600 dark:text-amber-400"
                  : "font-semibold text-emerald-600 dark:text-emerald-400"
              }
            >
              {sansServeur.length} sans serveur
            </span>
          </p>
        </div>
        {peutModifier && sansServeur.length > 0 && (
          <button
            onClick={() =>
              onQuestion(
                `Répartis les ${sansServeur.length} réservation(s) sans serveur de ce soir entre les serveurs disponibles.`
              )
            }
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
          >
            Répartir avec Chafik
          </button>
        )}
      </div>

      {erreur && (
        <div className="text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {erreur}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fadeUp">
          <div className="px-4 md:px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Icon
              nom="clipboard"
              className={`w-4 h-4 ${sansServeur.length > 0 ? "text-amber-600" : "text-emerald-600"}`}
            />
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">
              Réservations du jour
            </h3>
          </div>
          {affectations.reservations.length === 0 ? (
            <p className="p-5 text-sm text-gray-500 dark:text-gray-400">
              Aucune réservation confirmée aujourd'hui.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {affectations.reservations.map((reservation) => (
                <div
                  key={reservation.code}
                  className={`px-4 md:px-5 py-3 flex flex-wrap items-center gap-3 ${
                    !reservation.serveurId ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                  }`}
                >
                  <div className="w-14 text-center shrink-0">
                    <div className="font-display text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {reservation.heure}
                    </div>
                    <div className="font-mono text-[10px] text-gray-400">{reservation.code}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {reservation.nomClient}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {reservation.nombrePersonnes} pers.
                      {reservation.table ? ` · Table ${reservation.table}` : ""} ·{" "}
                      {reservation.telephone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {reservation.serveurId ? (
                      <>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                          {reservation.serveurNom}
                        </span>
                        {peutModifier && (
                          <button
                            onClick={() => void executer(() => onRetirer(reservation.code))}
                            className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition"
                            title="Retirer l'affectation"
                          >
                            <Icon nom="trash" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <select
                          value={selections[reservation.code] ?? ""}
                          onChange={(evenement) =>
                            setSelections({ ...selections, [reservation.code]: evenement.target.value })
                          }
                          className="text-xs px-2 py-1.5 rounded-lg bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Choisir un serveur…</option>
                          {affectations.serveurs.map((serveur) => (
                            <option key={serveur.id} value={serveur.id}>
                              {serveur.nom} ({parServeur(serveur.id).length})
                            </option>
                          ))}
                        </select>
                        {peutModifier && (
                          <button
                            onClick={() =>
                              void executer(() => {
                                const serveurId = selections[reservation.code];
                                if (!serveurId) {
                                  setErreur("Choisissez d'abord un serveur pour cette réservation.");
                                  return Promise.resolve();
                                }
                                return onAffecter(reservation.code, serveurId);
                              })
                            }
                            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition"
                          >
                            Affecter
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-3">
              Charge par serveur
            </h3>
            <div className="space-y-2.5">
              {affectations.serveurs.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Aucun serveur actif.</p>
              )}
              {affectations.serveurs.map((serveur) => {
                const tables = parServeur(serveur.id);
                const couverts = tables.reduce((somme, reservation) => somme + reservation.nombrePersonnes, 0);
                return (
                  <div key={serveur.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {serveur.nom
                        .split(" ")
                        .map((mot) => mot[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {serveur.nom}
                      </div>
                      <div className="h-1.5 mt-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                          style={{ width: `${Math.min(100, tables.length * 25)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-sm font-bold text-gray-900 dark:text-white">
                        {couverts}
                      </div>
                      <div className="text-[9px] text-gray-400">couverts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
