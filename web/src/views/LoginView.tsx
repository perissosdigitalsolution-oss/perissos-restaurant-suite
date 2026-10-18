import { useEffect, useState } from "react";
import { appelApi } from "../api";
import Icon, { type NomIcone } from "../components/Icon";
import type { CompteSessionWeb } from "../types";

const LIBELLES_ROLES: Record<string, string> = {
  RESTAURANT_ADMIN: "Patron",
  SERVER: "Serveur",
  KITCHEN: "Cuisine",
  BAR: "Bar",
  CASHIER: "Caisse",
};

const ICONES_PROFILS: Record<string, NomIcone> = {
  patron: "user",
  serveur: "users",
  cuisine: "flame",
  bar: "coffee",
  caisse: "receipt",
};

interface ProfilDemoWeb {
  profil: string;
  nom: string;
  role: string;
}

export default function LoginView({
  onSucces,
  onModeDemo,
}: {
  onSucces: (compte: CompteSessionWeb) => void;
  onModeDemo: () => void;
}) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [profilsDemo, setProfilsDemo] = useState<ProfilDemoWeb[]>([]);

  useEffect(() => {
    appelApi<{ profils: ProfilDemoWeb[] }>("/api/auth/demo")
      .then((reponse) => setProfilsDemo(reponse.profils))
      .catch(() => setProfilsDemo([]));
  }, []);

  const seConnecter = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await appelApi<{ compte: CompteSessionWeb }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), motDePasse }),
      });
      onSucces(reponse.compte);
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setEnvoi(false);
    }
  };

  const entrerEnDemo = async (profil: string) => {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await appelApi<{ compte: CompteSessionWeb }>("/api/auth/demo", {
        method: "POST",
        body: JSON.stringify({ profil }),
      });
      onSucces(reponse.compte);
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f7f4] via-emerald-50/40 to-amber-50/30 dark:from-[#0c1210] dark:via-emerald-950/40 dark:to-[#0c1210] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fadeUp">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/25 mx-auto relative">
            <span className="font-display text-3xl font-black text-emerald-950">P</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0c1210]"></div>
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white tracking-tight mt-5">
            Périssos
          </h1>
          <p className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mt-1">
            Restaurant Suite
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Espace équipe — réservations, service, cuisine, caisse
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900/80 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 animate-fadeUp" style={{ animationDelay: "0.08s" }}>
          <form onSubmit={seConnecter} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Email professionnel</span>
              <div className="relative mt-1.5">
                <Icon nom="user" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(evenement) => setEmail(evenement.target.value)}
                  placeholder="prenom.nom@perissos.ci"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Mot de passe</span>
              <div className="relative mt-1.5">
                <Icon nom="settings" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={motDePasse}
                  onChange={(evenement) => setMotDePasse(evenement.target.value)}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition"
                />
              </div>
            </label>

            {erreur && (
              <div className="text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
                {erreur}
              </div>
            )}

            <button
              type="submit"
              disabled={envoi}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {envoi ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  Connexion en cours…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {profilsDemo.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3 text-center">
                Présentation — accès démo par profil
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {profilsDemo.map((profil) => (
                  <button
                    key={profil.profil}
                    onClick={() => void entrerEnDemo(profil.profil)}
                    disabled={envoi}
                    className="group flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition disabled:opacity-60"
                  >
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center">
                      <Icon nom={ICONES_PROFILS[profil.profil] ?? "user"} className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                      {LIBELLES_ROLES[profil.role] ?? profil.profil}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate max-w-full">{profil.nom}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-[11px] text-gray-400 mb-2">Pas de compte ou simplement en visite ?</p>
            <button
              onClick={onModeDemo}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300"
            >
              Continuer en tant qu'invité
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6 animate-fadeUp" style={{ animationDelay: "0.16s" }}>
          Périssos Restaurant Suite · <span className="gradient-gold font-semibold">Royal Digital Solution</span>
        </p>
      </div>
    </div>
  );
}
