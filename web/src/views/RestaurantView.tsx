import BadgeStatut from "../components/BadgeStatut";
import Icon, { type NomIcone } from "../components/Icon";
import { dateCourte } from "../format";
import type { DonneesRestaurant } from "../types";

const COULEURS: Record<string, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  violet: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
};

export default function RestaurantView({
  restaurant,
  onQuestion,
}: {
  restaurant: DonneesRestaurant | null;
  onQuestion: (question: string) => void;
}) {
  if (!restaurant) {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        Chargement du restaurant…
      </div>
    );
  }

  const stats: Array<{ label: string; value: string; icone: NomIcone; couleur: string }> = [
    { label: "Tables", value: String(restaurant.capacite.nombreTables), icone: "grid", couleur: "emerald" },
    { label: "Couverts de la salle", value: String(restaurant.capacite.couverts), icone: "users", couleur: "blue" },
    {
      label: "Réservations du jour",
      value: String(restaurant.reservationsJour.length),
      icone: "calendar",
      couleur: "violet",
    },
    {
      label: "À venir (7j)",
      value: String(restaurant.reservationsAVenir.length),
      icone: "clock",
      couleur: "amber",
    },
  ];

  const jour = [...restaurant.reservationsJour].sort((a, b) => a.heure.localeCompare(b.heure));
  const aVenir = [...restaurant.reservationsAVenir].sort((a, b) =>
    a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date)
  );

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {restaurant.nom}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
          Restaurant · {restaurant.ville} · Service du {dateCourte(restaurant.aujourdhui)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm card-hover animate-fadeUp"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${COULEURS[stat.couleur]}`}>
              <Icon nom={stat.icone} className="w-4 h-4" />
            </div>
            <div className="font-display text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Service du jour</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold">
              {jour.length} réservation(s)
            </span>
          </div>
          {jour.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Aucune réservation pour aujourd'hui.</p>
          ) : (
            <div className="space-y-2">
              {jour.map((reservation) => (
                <div
                  key={reservation.code}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="w-12 text-center font-display text-base font-bold text-gray-900 dark:text-white">
                    {reservation.heure}
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {reservation.nomClient}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {reservation.nombrePersonnes} pers.
                      {reservation.table ? ` · Table ${reservation.table}` : ""} · {reservation.code}
                    </div>
                  </div>
                  <BadgeStatut statut={reservation.statut} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">À venir (7 jours)</h3>
            <button
              onClick={() =>
                onQuestion("Quelles sont les prochaines réservations et comment gérer les créneaux du week-end ?")
              }
              className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Demander à Chafik
            </button>
          </div>
          {aVenir.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Aucune réservation à venir.</p>
          ) : (
            <div className="space-y-2">
              {aVenir.map((reservation) => (
                <div
                  key={reservation.code}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="w-11 text-center">
                    <div className="font-mono text-[11px] font-bold text-gray-900 dark:text-white">
                      {dateCourte(reservation.date)}
                    </div>
                    <div className="text-[9px] text-gray-400">{reservation.heure}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {reservation.nomClient}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {reservation.nombrePersonnes} personnes · {reservation.code}
                    </div>
                  </div>
                  <BadgeStatut statut={reservation.statut} />
                  <Icon nom="chevronRight" className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
