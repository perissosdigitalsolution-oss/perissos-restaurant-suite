import Icon, { type NomIcone } from "../components/Icon";
import type { Vue } from "../components/Sidebar";
import { dateCourte, depuisQuand, jourCourt, jourLong } from "../format";
import type { DonneesRestaurant, Rapport } from "../types";

interface Kpi {
  cle: string;
  libelle: string;
  valeur: string;
  unite?: string;
  tendance: number | null;
  icone: NomIcone;
}

interface Action {
  libelle: string;
  action: string;
  question: string;
  vue?: Vue;
}

interface Evenement {
  icone: NomIcone;
  couleur: string;
  texte: string;
  quand: string;
}

export default function DashboardView({
  rapport,
  restaurant,
  onQuestion,
  onNaviguer,
}: {
  rapport: Rapport | null;
  restaurant: DonneesRestaurant | null;
  onQuestion: (question: string) => void;
  onNaviguer?: (vue: Vue) => void;
}) {
  if (!rapport) {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        Chargement du tableau de bord…
      </div>
    );
  }

  const couvertsReserves = (restaurant?.reservationsJour ?? [])
    .filter((reservation) => reservation.statut === "CONFIRMEE")
    .reduce((somme, reservation) => somme + reservation.nombrePersonnes, 0);
  const panierMoyen =
    rapport.chiffre.nombreFactures > 0 ? rapport.chiffre.chiffreAffaires / rapport.chiffre.nombreFactures : 0;

  const kpis: Kpi[] = [
    {
      cle: "ca-jour",
      libelle: "CA du jour",
      valeur: rapport.chiffreJour.chiffreAffairesFormate.replace(" FCFA", ""),
      unite: "FCFA",
      tendance: rapport.chiffreJour.variationPourcent,
      icone: "trending",
    },
    {
      cle: "couverts",
      libelle: "Couverts réservés",
      valeur: String(couvertsReserves),
      tendance: null,
      icone: "users",
    },
    {
      cle: "commandes",
      libelle: "Commandes en cours",
      valeur: String(rapport.service.commandesOuvertes),
      tendance: null,
      icone: "cart",
    },
    {
      cle: "panier",
      libelle: "Panier moyen (7j)",
      valeur: Math.round(panierMoyen).toLocaleString("fr-FR"),
      unite: "FCFA",
      tendance: rapport.chiffre.variationPourcent,
      icone: "receipt",
    },
  ];

  const maxAffluence = Math.max(1, ...rapport.affluence.map((point) => point.couverts));
  const meilleurPoint = rapport.affluence.reduce((meilleur, point) =>
    point.couverts > meilleur.couverts ? point : meilleur
  );

  const actions: Action[] = [];
  if (rapport.service.commandesParStatut.EN_CUISINE > 0 || rapport.service.commandesParStatut.EN_ATTENTE > 0) {
    actions.push({
      libelle: `${rapport.service.commandesParStatut.EN_ATTENTE} en attente · ${rapport.service.commandesParStatut.EN_CUISINE} en cuisine`,
      action: "Voir la cuisine",
      question: "Quelles commandes sont en cuisine et depuis combien de temps ?",
      vue: "cuisine",
    });
  }
  if (rapport.service.reservationsSansServeur > 0) {
    actions.push({
      libelle: `${rapport.service.reservationsSansServeur} réservation(s) sans serveur ce soir`,
      action: "Affecter",
      question: "Quelles réservations de ce soir sont encore sans serveur ? Répartis-les.",
      vue: "affectations",
    });
  }
  if (rapport.noShows.total > 0) {
    actions.push({
      libelle: `${rapport.noShows.total} client(s) non présenté(s) sur 14 jours`,
      action: "Relancer",
      question: "Quels clients ne se sont pas présentés récemment ? Comment puis-je les relancer ?",
    });
  }
  if (rapport.ventes.alertesStock.length > 0) {
    actions.push({
      libelle: `${rapport.ventes.alertesStock.length} plat(s) en stock bas (${rapport.ventes.alertesStock
        .map((alerte) => alerte.plat)
        .join(", ")})`,
      action: "Réapprovisionner",
      question: "Quels plats sont en stock bas ? Que recommandes-tu de réapprovisionner ?",
    });
  }
  if (rapport.ventes.ruptures.length > 0) {
    actions.push({
      libelle: `Rupture de stock : ${rapport.ventes.ruptures.map((rupture) => rupture.plat).join(", ")}`,
      action: "Voir",
      question: "Quels plats sont en rupture et que proposer à leurs place ?",
    });
  }
  if (rapport.clientsFideles.length > 0) {
    const fidele = rapport.clientsFideles[0];
    actions.push({
      libelle: `${fidele.nom} · ${fidele.passages} passages ce mois`,
      action: "Fidéliser",
      question: "Qui sont mes clients fidèles ce mois-ci ? Propose-moi des idées pour les fidéliser.",
    });
  }

  const topPlats = [...rapport.ventes.topPlats];
  const maxPart = Math.max(1, ...topPlats.map((plat) => plat.partPourcent));

  const insights = [
    {
      libelle: "Meilleur jour",
      valeur: meilleurPoint.couverts > 0 ? jourLong(meilleurPoint.date) : "—",
      detail:
        meilleurPoint.couverts > 0
          ? `${meilleurPoint.couverts} couverts · ${meilleurPoint.occupationPourcent} % d'occupation`
          : "Aucune réservation",
      icone: "trending" as NomIcone,
    },
    {
      libelle: "Plat star",
      valeur: topPlats[0]?.plat ?? "—",
      detail: topPlats[0] ? `${topPlats[0].quantite} ventes · ${topPlats[0].chiffreAffairesFormate}` : "Aucune vente",
      icone: "star" as NomIcone,
    },
    {
      libelle: "Client fidèle",
      valeur: rapport.clientsFideles[0]?.nom ?? "—",
      detail: rapport.clientsFideles[0]
        ? `${rapport.clientsFideles[0].passages} passages ce mois`
        : "Aucun client fidèle sur 30 jours",
      icone: "user" as NomIcone,
    },
  ];

  const evenements: Evenement[] = [
    ...(restaurant?.reservationsJour ?? []).map((reservation) => ({
      icone: "calendar" as NomIcone,
      couleur:
        "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
      texte: `Réservation du jour · ${reservation.nomClient} · ${reservation.nombrePersonnes} pers. · ${reservation.heure}`,
      quand: depuisQuand(reservation.creeLe),
    })),
    ...(restaurant?.reservationsAVenir ?? []).slice(0, 3).map((reservation) => ({
      icone: "calendar" as NomIcone,
      couleur:
        "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
      texte: `À venir · ${reservation.nomClient} · ${reservation.nombrePersonnes} pers. · ${dateCourte(
        reservation.date
      )} à ${reservation.heure}`,
      quand: depuisQuand(reservation.creeLe),
    })),
    ...rapport.ventes.alertesStock.map((alerte) => ({
      icone: "alert" as NomIcone,
      couleur: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
      texte: `Stock bas : ${alerte.plat} (${alerte.stockRestant} portion(s) restante(s))`,
      quand: "à l'instant",
    })),
    ...(rapport.noShows.total > 0
      ? [
          {
            icone: "user" as NomIcone,
            couleur: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
            texte: `${rapport.noShows.total} no-show(s) à relancer sur les 14 derniers jours`,
            quand: "14 derniers jours",
          },
        ]
      : []),
  ].slice(0, 7);

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Bonjour, Direction
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
          Voici l'état de{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{restaurant?.nom ?? "Périssos"}</span>{" "}
          aujourd'hui
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.cle}
            className="group relative bg-white dark:bg-gray-900/80 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm card-hover overflow-hidden animate-fadeUp"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <Icon nom={kpi.icone} className="w-4 h-4" />
                </div>
                {kpi.tendance !== null && (
                  <div
                    className={`flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                      kpi.tendance >= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                    }`}
                  >
                    <Icon nom={kpi.tendance >= 0 ? "trending" : "trendingDown"} className="w-3 h-3" />
                    {Math.abs(kpi.tendance)} %
                  </div>
                )}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{kpi.libelle}</div>
              <div className="font-display text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {kpi.valeur}
                {kpi.unite && <span className="text-xs font-normal text-gray-400 ml-1">{kpi.unite}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                Affluence des 7 derniers jours
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Couverts par jour</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Couverts
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {rapport.affluence.map((point) => (
              <div key={point.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition">
                  {point.couverts}
                </div>
                <div className="w-full relative h-full flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-900 to-emerald-600 group-hover:from-amber-600 group-hover:to-amber-400 transition-all duration-500 shadow-sm"
                    style={{ height: `${Math.max(3, (point.couverts / maxAffluence) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {jourCourt(point.date) || dateCourte(point.date)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <div className="flex items-center gap-2 mb-4">
            <Icon nom="alert" className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Actions requises</h3>
          </div>
          {actions.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2.5">
              Aucune action requise pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.libelle}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300">{action.libelle}</span>
                  <button
                    onClick={() =>
                      action.vue && onNaviguer ? onNaviguer(action.vue) : onQuestion(action.question)
                    }
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 whitespace-nowrap"
                  >
                    {action.action}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">
            Top plats de la semaine
          </h3>
          {topPlats.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Aucune vente sur les 7 derniers jours.</p>
          ) : (
            <div className="space-y-3">
              {topPlats.map((plat, index) => (
                <div key={plat.plat} className="flex items-center gap-3 group">
                  <span className="font-display text-base font-bold text-gray-300 dark:text-gray-600 w-4">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{plat.plat}</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {plat.quantite} · {plat.chiffreAffairesFormate}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 group-hover:from-amber-500 group-hover:to-amber-300 transition-all duration-500"
                        style={{ width: `${Math.max(4, (plat.partPourcent / maxPart) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white rounded-2xl p-5 shadow-lg noise relative overflow-hidden animate-fadeUp">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-400/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-4">
              <Icon nom="brain" className="w-4 h-4 text-amber-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Insights IA</span>
            </div>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.libelle}>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/60 mb-0.5">
                    <Icon nom={insight.icone} className="w-3 h-3" />
                    {insight.libelle}
                  </div>
                  <div className="font-display text-base font-bold capitalize">{insight.valeur}</div>
                  <div className="text-[11px] text-white/50">{insight.detail}</div>
                </div>
              ))}
            </div>
            {rapport.previsions.conseils.length > 0 && (
              <button
                onClick={() => onQuestion(`Prévisions d'affluence pour ${jourLong(rapport.previsions.dateCible)} : que me conseilles-tu ?`)}
                className="mt-4 w-full text-left text-[11px] text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl p-2.5 transition"
              >
                <span className="font-semibold text-amber-300">Prévision {rapport.previsions.jour} :</span>{" "}
                {rapport.previsions.conseils.join(" ")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Activité récente</h3>
          <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Mise à jour à chaque échange avec Chafik
          </span>
        </div>
        <div className="space-y-2">
          {evenements.map((evenement, index) => (
            <div
              key={`${evenement.texte}-${index}`}
              className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition animate-fadeUp"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${evenement.couleur}`}
              >
                <Icon nom={evenement.icone} className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-800 dark:text-gray-200">{evenement.texte}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{evenement.quand}</div>
              </div>
            </div>
          ))}
          {evenements.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Aucune activité récente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
