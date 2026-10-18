import { useState } from "react";
import { appelApi } from "../api";
import Icon from "../components/Icon";

interface ThemeWeb {
  id: string;
  nom: string;
  description: string;
  auteur: string;
  version: string;
  categorie: string;
  previewUrl: string | null;
  actif: boolean;
}

interface SiteWeb {
  id: string;
  themeId: string | null;
  slug: string;
  config: Record<string, unknown>;
  statut: string;
  urlPublique: string | null;
}

const COULEURS_PAR_DEFAUT: Record<string, { primaire: string; secondaire: string; fond: string; texte: string }> = {
  simple: { primaire: "#064E3B", secondaire: "#D4AF37", fond: "#FDFCF7", texte: "#1F2937" },
  elegant: { primaire: "#1F2937", secondaire: "#D4AF37", fond: "#FDFCF7", texte: "#374151" },
  modern: { primaire: "#0F172A", secondaire: "#F97316", fond: "#F8FAFC", texte: "#1E293B" },
};

export default function SiteWebView({
  role,
  onQuestion,
}: {
  role: string;
  onQuestion: (question: string) => void;
}) {
  const [themes, setThemes] = useState<ThemeWeb[]>([]);
  const [site, setSite] = useState<SiteWeb | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [themeSelectionne, setThemeSelectionne] = useState<string>("");
  const [slug, setSlug] = useState("");
  const [couleurs, setCouleurs] = useState({ primaire: "#064E3B", secondaire: "#D4AF37", fond: "#FDFCF7", texte: "#1F2937" });
  const [hero, setHero] = useState("");
  const [publication, setPublication] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const themesReponse = await appelApi<{ themes: ThemeWeb[] }>("/api/site/themes");
      setThemes(themesReponse.themes);
      const siteReponse = await appelApi<{ site: SiteWeb | null }>("/api/site");
      const siteCharge = siteReponse.site;
      setSite(siteCharge);
      if (siteCharge) {
        setThemeSelectionne(siteCharge.themeId ?? "");
        setSlug(siteCharge.slug ?? "");
        const config = siteCharge.config ?? {};
        if (config.couleurs) setCouleurs(config.couleurs as typeof couleurs);
        if (typeof config.hero === "string") setHero(config.hero);
      }
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setChargement(false);
    }
  };

  useState(() => {
    void charger();
  });

  const choisirTheme = (id: string) => {
    setThemeSelectionne(id);
    if (COULEURS_PAR_DEFAUT[id]) setCouleurs(COULEURS_PAR_DEFAUT[id]);
  };

  const sauver = async () => {
    if (!themeSelectionne || !slug.trim()) {
      setErreur("Choisissez un thème et renseignez le slug (ex. perissos).");
      return;
    }
    try {
      setErreur(null);
      setMessage(null);
      await appelApi("/api/site", {
        method: "PUT",
        body: JSON.stringify({
          themeId: themeSelectionne,
          slug: slug.trim(),
          config: { couleurs, hero: hero.trim() || undefined },
        }),
      });
      setMessage("Configuration enregistrée. Vous pouvez prévisualiser ou publier.");
      await charger();
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const publier = async () => {
    try {
      setErreur(null);
      setMessage(null);
      setPublication(true);
      const reponse = await appelApi<{ url: string }>("/api/site/publier", { method: "POST" });
      setMessage(`Site publié ! Accessible sur ${reponse.url}`);
      await charger();
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setPublication(false);
    }
  };

  if (chargement) {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        Chargement du site web…
      </div>
    );
  }

  if (role !== "RESTAURANT_ADMIN") {
    return (
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
        La configuration du site web est réservée à la direction.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Mon site web
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Choisissez un thème, personnalisez, publiez — votre vitrine en ligne, sans commission.
          </p>
        </div>
        {site?.statut === "publie" && site.urlPublique && (
          <a
            href={site.urlPublique}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5"
          >
            <Icon nom="arrowRight" className="w-3.5 h-3.5" />
            Voir le site publié
          </a>
        )}
      </div>

      {erreur && (
        <div className="text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {erreur}
        </div>
      )}
      {message && (
        <div className="text-xs md:text-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 animate-fadeUp">
        <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4">
          1. Choisissez un thème
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => choisirTheme(theme.id)}
              className={`group text-left rounded-2xl border-2 overflow-hidden transition-all ${
                themeSelectionne === theme.id
                  ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600"
              }`}
            >
              <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Icon nom="store" className="w-10 h-10 text-gray-300 dark:text-gray-500" />
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{theme.nom}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {theme.description}
                </div>
                <div className="text-[10px] text-gray-400 mt-1.5">
                  {theme.auteur} · v{theme.version}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 animate-fadeUp">
        <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4">
          2. Personnalisez
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-xs text-gray-500 dark:text-gray-400">
            Slug (URL publique)
            <input
              value={slug}
              onChange={(evenement) => setSlug(evenement.target.value)}
              placeholder="ex. perissos"
              className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          {(["primaire", "secondaire", "fond", "texte"] as const).map((cle) => (
            <label key={cle} className="text-xs text-gray-500 dark:text-gray-400">
              Couleur {cle}
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={couleurs[cle]}
                  onChange={(evenement) => setCouleurs({ ...couleurs, [cle]: evenement.target.value })}
                  className="w-10 h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <input
                  value={couleurs[cle]}
                  onChange={(evenement) => setCouleurs({ ...couleurs, [cle]: evenement.target.value })}
                  className="flex-1 px-2 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </label>
          ))}
        </div>
        <label className="block mt-4 text-xs text-gray-500 dark:text-gray-400">
          Photo hero (URL)
          <input
            value={hero}
            onChange={(evenement) => setHero(evenement.target.value)}
            placeholder="https://…/photo-restaurant.jpg"
            className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
      </div>

      <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 animate-fadeUp flex flex-wrap items-center gap-3">
        <button
          onClick={() => void sauver()}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 transition"
        >
          Enregistrer le brouillon
        </button>
        <button
          onClick={() => void publier()}
          disabled={publication || !themeSelectionne || !slug.trim()}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white transition flex items-center gap-1.5"
        >
          {publication ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              Publication…
            </>
          ) : (
            "Publier le site"
          )}
        </button>
        {site?.statut === "publie" && site.urlPublique && (
          <a
            href={site.urlPublique}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1.5"
          >
            <Icon nom="arrowRight" className="w-3.5 h-3.5" />
            Voir le site publié ({site.urlPublique})
          </a>
        )}
        <button
          onClick={() => onQuestion("Aide-moi à choisir un thème pour mon site web et à le personnaliser.")}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400 transition"
        >
          Demander à Chafik
        </button>
      </div>
    </div>
  );
}
