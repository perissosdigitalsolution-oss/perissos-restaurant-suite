import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import type { PlatMenuWeb, RoleWeb } from "../types";

const CATEGORIES: Record<string, string> = {
  entree: "Entrées",
  plat: "Plats",
  grillades: "Grillades",
  accompagnement: "Accompagnements",
  boisson: "Boissons",
  dessert: "Desserts",
};

function Piment({ niveau }: { niveau: number }) {
  if (niveau <= 0) return null;
  const couleur = niveau >= 3 ? "bg-red-500" : niveau === 2 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <span className="flex items-center gap-1" title={`Piment ${niveau}/3`}>
      {[0, 1, 2].map((position) => (
        <span
          key={position}
          className={`w-1.5 h-1.5 rounded-full ${position < niveau ? couleur : "bg-gray-200 dark:bg-gray-700"}`}
        ></span>
      ))}
      <span className="text-[10px] text-gray-400">piment</span>
    </span>
  );
}

export default function MenuView({
  plats,
  role,
  onQuestion,
}: {
  plats: PlatMenuWeb[];
  role: RoleWeb;
  onQuestion: (question: string) => void;
}) {
  const [categorie, setCategorie] = useState<string>("toutes");

  const categories = useMemo(() => [...new Set(plats.map((plat) => plat.categorie))], [plats]);
  const visibles = useMemo(
    () => (categorie === "toutes" ? plats : plats.filter((plat) => plat.categorie === categorie)),
    [plats, categorie]
  );

  const demander = (plat: PlatMenuWeb) => {
    if (role === "CLIENT") {
      onQuestion(`Je souhaite réserver une table pour déguster ${plat.nom}. Que me conseilles-tu ?`);
    } else {
      onQuestion(`Stock de ${plat.nom} ? Est-ce que je peux le proposer ce soir ?`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Carte & menu
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
          {plats.length} plats ·{" "}
          {plats.filter((plat) => !plat.disponible || plat.stockPortions === 0).length} indisponible(s)
        </p>
      </div>

      <div className="flex flex-wrap gap-2 animate-fadeUp">
        <button
          onClick={() => setCategorie("toutes")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
            categorie === "toutes"
              ? "bg-emerald-700 border-emerald-700 text-white"
              : "bg-white dark:bg-gray-900/80 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
          }`}
        >
          Tout
        </button>
        {categories.map((cle) => (
          <button
            key={cle}
            onClick={() => setCategorie(cle)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
              categorie === cle
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white dark:bg-gray-900/80 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
            }`}
          >
            {CATEGORIES[cle] ?? cle}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {visibles.map((plat, index) => {
          const rupture = !plat.disponible || plat.stockPortions === 0;
          const stockBas = !rupture && plat.stockPortions !== null && plat.stockPortions <= 5;
          return (
            <div
              key={plat.nom}
              className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm card-hover flex flex-col gap-2 animate-fadeUp"
              style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {CATEGORIES[plat.categorie] ?? plat.categorie}
                </span>
                <span className="font-display text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {plat.prix.toLocaleString("fr-FR")} FCFA
                </span>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{plat.nom}</h3>
                {rupture && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold">
                    Indisponible
                  </span>
                )}
                {stockBas && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold">
                    Stock : {plat.stockPortions}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">{plat.description}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Piment niveau={plat.niveauPiment} />
                  {plat.allergenes.map((allergene) => (
                    <span
                      key={allergene}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold"
                    >
                      {allergene}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => demander(plat)}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                  title={role === "CLIENT" ? "Réserver avec Chafik" : "Vérifier le stock avec Chafik"}
                >
                  <Icon nom="sparkles" className="w-3 h-3" />
                  Chafik
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
