import { useEffect, useState } from "react";
import Icon from "./Icon";
import type { RoleWeb } from "../types";

export default function TopBar({
  role,
  sombre,
  basculerSombre,
  notifications,
  onRecherche,
  onParametres,
  setOuvertMobile,
  nomUtilisateur,
  modeDemo,
  onConnexion,
  onDeconnexion,
}: {
  role: RoleWeb;
  sombre: boolean;
  basculerSombre: () => void;
  notifications: number;
  onRecherche: (question: string) => void;
  onParametres: () => void;
  setOuvertMobile: (ouvert: boolean) => void;
  nomUtilisateur: string | null;
  modeDemo: boolean;
  onConnexion: () => void;
  onDeconnexion: () => void;
}) {
  const [heure, setHeure] = useState(new Date());
  const [requete, setRequete] = useState("");

  useEffect(() => {
    const minuteur = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(minuteur);
  }, []);

  const minutes = heure.getHours() * 60 + heure.getMinutes();
  const ouvert = minutes >= 11 * 60 && minutes < 22 * 60 + 30;

  const envoyer = () => {
    const question = requete.trim();
    if (!question) return;
    onRecherche(question);
    setRequete("");
  };

  return (
    <header className="glass sticky top-0 z-20 border-b border-gray-200/60 dark:border-white/10">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => setOuvertMobile(true)}
          className="lg:hidden w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300"
        >
          <Icon nom="menu" className="w-4 h-4" />
        </button>
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Icon nom="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={requete}
              onChange={(evenement) => setRequete(evenement.target.value)}
              onKeyDown={(evenement) => evenement.key === "Enter" && envoyer()}
              placeholder="Rechercher… ou posez votre question à Chafik"
              className="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nomUtilisateur ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  {nomUtilisateur
                    .split(" ")
                    .map((mot) => mot[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 max-w-32 truncate">
                  {nomUtilisateur}
                </span>
              </div>
              <button
                onClick={onDeconnexion}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-300 transition"
                title="Se déconnecter"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {modeDemo && (
                <>
                  <span className="hidden sm:inline text-[11px] font-semibold text-gray-400">
                    Mode invité
                  </span>
                  <button
                    onClick={onConnexion}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
                  >
                    Connexion
                  </button>
                </>
              )}
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-100 dark:border-emerald-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
              {heure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              {ouvert ? "· Ouvert" : "· Fermé"}
            </span>
          </div>
          <button
            onClick={basculerSombre}
            className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-amber-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title={sombre ? "Mode clair" : "Mode sombre"}
          >
            <Icon nom={sombre ? "sun" : "moon"} className="w-4 h-4" />
          </button>
          <button
            className="relative w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title="Notifications"
          >
            <Icon nom="bell" className="w-4 h-4" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifications > 9 ? "9+" : notifications}
              </span>
            )}
          </button>
          {role === "RESTAURANT_ADMIN" && (
            <button
              onClick={onParametres}
              className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              title="Paramètres"
            >
              <Icon nom="settings" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
