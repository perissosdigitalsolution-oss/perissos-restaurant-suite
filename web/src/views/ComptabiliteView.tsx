import Icon from "../components/Icon";
import { dateCourte, fcfa } from "../format";
import type { Rapport } from "../types";

export default function ComptabiliteView({
  rapport,
  onQuestion,
}: {
  rapport: Rapport | null;
  onQuestion: (question: string) => void;
}) {
  if (!rapport) {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        Chargement de la comptabilité…
      </div>
    );
  }

  const panierMoyen =
    rapport.chiffre.nombreFactures > 0 ? rapport.chiffre.chiffreAffaires / rapport.chiffre.nombreFactures : 0;

  const cartes = [
    {
      libelle: "CA du jour",
      valeur: rapport.chiffreJour.chiffreAffairesFormate,
      detail: `${rapport.chiffreJour.nombreFactures} facture(s) · ${dateCourte(rapport.chiffreJour.du)}`,
      variation: rapport.chiffreJour.variationPourcent,
      icone: "trending" as const,
    },
    {
      libelle: "CA des 7 derniers jours",
      valeur: rapport.chiffre.chiffreAffairesFormate,
      detail: `${rapport.chiffre.nombreFactures} facture(s) · ${dateCourte(rapport.chiffre.du)} → ${dateCourte(rapport.chiffre.au)}`,
      variation: rapport.chiffre.variationPourcent,
      icone: "receipt" as const,
    },
    {
      libelle: "Panier moyen (7j)",
      valeur: fcfa(panierMoyen),
      detail: "CA des 7 jours / nombre de factures",
      variation: null,
      icone: "store" as const,
    },
    {
      libelle: "No-shows (14j)",
      valeur: String(rapport.noShows.total),
      detail: "Réservations non honorées",
      variation: null,
      icone: "alert" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Comptabilité
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Chiffre d'affaires, ventes et alertes — réservé à la direction
          </p>
        </div>
        <button
          onClick={() =>
            onQuestion("Analyse mon chiffre d'affaires de la semaine et donne-moi trois pistes pour l'augmenter.")
          }
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
        >
          Analyser avec Chafik
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeUp">
        {cartes.map((carte, index) => (
          <div
            key={carte.libelle}
            className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm card-hover"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Icon nom={carte.icone} className="w-4 h-4" />
              </div>
              {carte.variation !== null && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    carte.variation >= 0
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                  }`}
                >
                  {carte.variation >= 0 ? "+" : ""}
                  {carte.variation} %
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{carte.libelle}</div>
            <div className="font-display text-lg font-bold text-gray-900 dark:text-white">{carte.valeur}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{carte.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">
            Ventes par plat (7 jours)
          </h3>
          {rapport.ventes.topPlats.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Aucune vente sur la période.</p>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                <span>Plat</span>
                <span className="text-right w-16">Qté</span>
                <span className="text-right w-24">Chiffre</span>
              </div>
              {rapport.ventes.topPlats.map((plat) => (
                <div
                  key={plat.plat}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm border-t border-gray-50 dark:border-gray-800 pt-2"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{plat.plat}</span>
                  <span className="text-right w-16 text-gray-600 dark:text-gray-300">{plat.quantite}</span>
                  <span className="text-right w-24 font-semibold text-gray-900 dark:text-white">
                    {plat.chiffreAffairesFormate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">No-shows à relancer</h3>
            <span className="text-[11px] text-gray-400">14 derniers jours</span>
          </div>
          {rapport.noShows.reservations.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Aucun no-show sur la période.</p>
          ) : (
            <div className="space-y-2">
              {rapport.noShows.reservations.map((reservation) => (
                <div
                  key={`${reservation.code}-${reservation.date}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {reservation.nomClient}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {reservation.telephone} · {dateCourte(reservation.date)} à {reservation.heure} ·{" "}
                      {reservation.nombrePersonnes} pers.
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onQuestion(
                        `Propose un message de relance pour ${reservation.nomClient} (${reservation.telephone}), no-show du ${reservation.date}.`
                      )
                    }
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                  >
                    Relancer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(rapport.ventes.alertesStock.length > 0 || rapport.ventes.ruptures.length > 0) && (
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <div className="flex items-center gap-2 mb-3">
            <Icon nom="alert" className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Alertes de stock</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {rapport.ventes.alertesStock.map((alerte) => (
              <span
                key={alerte.plat}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
              >
                {alerte.plat} : {alerte.stockRestant} restant(s), seuil {alerte.seuil}
              </span>
            ))}
            {rapport.ventes.ruptures.map((rupture) => (
              <span
                key={rupture.plat}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              >
                Rupture : {rupture.plat}
              </span>
            ))}
          </div>
        </div>
      )}

      {rapport.previsions.conseils.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white rounded-2xl p-5 shadow-lg noise relative overflow-hidden animate-fadeUp">
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-3">
              <Icon nom="brain" className="w-4 h-4 text-amber-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Prévision d'affluence · {rapport.previsions.jour} {dateCourte(rapport.previsions.dateCible)}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-white/80">
              <p>
                Staff recommandé :{" "}
                <strong className="text-white">
                  {rapport.previsions.serveursRecommandes} serveurs
                </strong>{" "}
                (habituels : {rapport.previsions.serveursHabituels}) · occupation estimée{" "}
                <strong className="text-white">{rapport.previsions.tauxOccupationDinerPourcent} %</strong>
              </p>
              {rapport.previsions.conseils.map((conseil) => (
                <p key={conseil} className="text-white/70">
                  {conseil}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
