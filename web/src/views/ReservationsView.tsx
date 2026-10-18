import { useState } from "react";
import BadgeStatut from "../components/BadgeStatut";
import { dateCourte } from "../format";
import type { DonneesRestaurant, ReservationWeb } from "../types";

type Filtre = "tous" | "jour" | "avenir";

export default function ReservationsView({
  restaurant,
  onQuestion,
}: {
  restaurant: DonneesRestaurant | null;
  onQuestion: (question: string) => void;
}) {
  const [filtre, setFiltre] = useState<Filtre>("jour");
  const [statut, setStatut] = useState<"tous" | "CONFIRMEE" | "ANNULLEE" | "NO_SHOW">("tous");

  if (!restaurant) {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        Chargement des réservations…
      </div>
    );
  }

  const source: ReservationWeb[] =
    filtre === "jour"
      ? restaurant.reservationsJour
      : filtre === "avenir"
        ? restaurant.reservationsAVenir
        : [...restaurant.reservationsJour, ...restaurant.reservationsAVenir];
  const reservations = [...source]
    .filter((reservation) => statut === "tous" || reservation.statut === statut)
    .sort((a, b) =>
      a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date)
    );

  const filtres: Array<{ cle: Filtre; libelle: string }> = [
    { cle: "jour", libelle: "Aujourd'hui" },
    { cle: "avenir", libelle: "7 prochains jours" },
    { cle: "tous", libelle: "Tout afficher" },
  ];

  const statuts: Array<{ cle: "tous" | "CONFIRMEE" | "ANNULLEE" | "NO_SHOW"; libelle: string }> = [
    { cle: "tous", libelle: "Tous statuts" },
    { cle: "CONFIRMEE", libelle: "Confirmées" },
    { cle: "ANNULLEE", libelle: "Annulées" },
    { cle: "NO_SHOW", libelle: "No-shows" },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Réservations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            {restaurant.reservationsJour.length} aujourd'hui · {restaurant.reservationsAVenir.length} sur 7 jours
          </p>
        </div>
        <button
          onClick={() =>
            onQuestion("Aide-moi à organiser les réservations du week-end : quels créneaux sont encore libres ?")
          }
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
        >
          Organiser avec Chafik
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 animate-fadeUp">
        {filtres.map((option) => (
          <button
            key={option.cle}
            onClick={() => setFiltre(option.cle)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
              filtre === option.cle
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white dark:bg-gray-900/80 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-400"
            }`}
          >
            {option.libelle}
          </button>
        ))}
        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></span>
        {statuts.map((option) => (
          <button
            key={option.cle}
            onClick={() => setStatut(option.cle)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
              statut === option.cle
                ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300"
                : "bg-white dark:bg-gray-900/80 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-400"
            }`}
          >
            {option.libelle}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fadeUp">
        {reservations.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Aucune réservation pour ce filtre.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reservations.map((reservation) => (
              <div
                key={`${reservation.code}-${reservation.date}`}
                className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="w-16 text-center shrink-0">
                  <div className="font-mono text-[11px] font-bold text-gray-900 dark:text-white">
                    {dateCourte(reservation.date)}
                  </div>
                  <div className="font-display text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {reservation.heure}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {reservation.nomClient}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">{reservation.code}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {reservation.telephone} · {reservation.nombrePersonnes} pers.
                    {reservation.table ? ` · Table ${reservation.table}` : ""}
                    {reservation.notes ? ` · ${reservation.notes}` : ""}
                  </div>
                </div>
                <div className="hidden sm:block text-[11px] text-gray-400 w-24 text-right shrink-0">
                  créée le {dateCourte(reservation.creeLe)}
                </div>
                <BadgeStatut statut={reservation.statut} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
