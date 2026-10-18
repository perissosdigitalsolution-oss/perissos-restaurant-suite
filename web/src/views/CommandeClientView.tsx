import { useState } from "react";
import { appelApi } from "../api";
import Icon from "../components/Icon";
import { fcfa } from "../format";
import type { PlatMenuWeb } from "../types";

interface LignePanier {
  plat: string;
  quantite: number;
  prix: number;
}

const MODES: Array<{ cle: "sur_place" | "a_emporter" | "livraison"; libelle: string; description: string; icone: "store" | "cart" | "arrowRight" }> = [
  { cle: "sur_place", libelle: "Sur place", description: "Vous mangez au restaurant", icone: "store" },
  { cle: "a_emporter", libelle: "À emporter", description: "Vous récupérez votre commande", icone: "cart" },
  { cle: "livraison", libelle: "Livraison", description: "Livré à votre adresse", icone: "arrowRight" },
];

export default function CommandeClientView({
  plats,
}: {
  plats: PlatMenuWeb[];
}) {
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [mode, setMode] = useState<"sur_place" | "a_emporter" | "livraison">("sur_place");
  const [adresse, setAdresse] = useState("");
  const [table, setTable] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string; montantTotal: number } | null>(null);

  const ajouterAuPanier = (plat: PlatMenuWeb) => {
    setPanier((precedent) => {
      const existant = precedent.find((ligne) => ligne.plat === plat.nom);
      if (existant) {
        return precedent.map((ligne) =>
          ligne.plat === plat.nom ? { ...ligne, quantite: ligne.quantite + 1 } : ligne
        );
      }
      return [...precedent, { plat: plat.nom, quantite: 1, prix: plat.prix }];
    });
  };

  const retirerDuPanier = (plat: string) => {
    setPanier((precedent) => precedent.filter((ligne) => ligne.plat !== plat));
  };

  const modifierQuantite = (plat: string, quantite: number) => {
    if (quantite <= 0) {
      retirerDuPanier(plat);
      return;
    }
    setPanier((precedent) =>
      precedent.map((ligne) => (ligne.plat === plat ? { ...ligne, quantite } : ligne))
    );
  };

  const total = panier.reduce((somme, ligne) => somme + ligne.prix * ligne.quantite, 0);
  const nombreArticles = panier.reduce((somme, ligne) => somme + ligne.quantite, 0);

  const valider = async () => {
    if (panier.length === 0) {
      setErreur("Votre panier est vide.");
      return;
    }
    if (mode === "livraison" && adresse.trim().length < 5) {
      setErreur("Renseignez votre adresse de livraison (minimum 5 caractères).");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await appelApi<{ confirmation: boolean; commande: { id: string; montantTotal: number } }>(
        "/api/client/commander",
        {
          method: "POST",
          body: JSON.stringify({
            mode,
            tableId: mode === "sur_place" && table.trim() ? table.trim() : undefined,
            adresseLivraison: mode === "livraison" ? adresse.trim() : undefined,
            lignes: panier.map((ligne) => ({ plat: ligne.plat, quantite: ligne.quantite })),
          }),
        }
      );
      setConfirmation({ id: reponse.commande.id, montantTotal: reponse.commande.montantTotal });
      setPanier([]);
      setAdresse("");
      setTable("");
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setEnvoi(false);
    }
  };

  const reinitialiser = () => {
    setConfirmation(null);
    setErreur(null);
  };

  if (confirmation) {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-8 border border-emerald-200 dark:border-emerald-900 shadow-sm text-center animate-fadeUp">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-4">
            <Icon nom="check" className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Commande confirmée !
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Votre commande <span className="font-mono font-bold text-gray-900 dark:text-white">{confirmation.id}</span> a été
            envoyée en cuisine.
          </p>
          <p className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-4">
            {fcfa(confirmation.montantTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {mode === "sur_place"
              ? "Votre plat sera servi à votre table."
              : mode === "a_emporter"
                ? "Votre commande sera prête pour le retrait."
                : "Votre commande sera livrée à l'adresse indiquée."}
          </p>
          <button
            onClick={reinitialiser}
            className="mt-6 text-xs font-semibold px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
          >
            Nouvelle commande
          </button>
        </div>
      </div>
    );
  }

  const categories = [...new Set(plats.map((p) => p.categorie))];
  const categoriesLabels: Record<string, string> = {
    entree: "Entrées",
    plat: "Plats",
    grillades: "Grillades",
    accompagnement: "Accompagnements",
    boisson: "Boissons",
    dessert: "Desserts",
  };

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Commander en ligne
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
          Choisissez vos plats, votre mode de service, et validez — la cuisine est prévenue aussitôt.
        </p>
      </div>

      {erreur && (
        <div className="text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {erreur}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 space-y-4">
          {categories.map((cat) => (
            <div key={cat} className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 md:p-5 animate-fadeUp">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-3">
                {categoriesLabels[cat] ?? cat}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {plats
                  .filter((p) => p.categorie === cat && p.disponible)
                  .map((plat) => (
                    <div
                      key={plat.nom}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{plat.nom}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fcfa(plat.prix)}</div>
                        {plat.description && (
                          <div className="text-[11px] text-gray-400 mt-1 line-clamp-1">{plat.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => ajouterAuPanier(plat)}
                        disabled={plat.stockPortions === 0}
                        className="w-9 h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition flex-shrink-0"
                        title="Ajouter au panier"
                      >
                        <Icon nom="plus" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 sticky top-20 animate-fadeUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">
                Panier
              </h3>
              {nombreArticles > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  {nombreArticles}
                </span>
              )}
            </div>

            {panier.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                Votre panier est vide. Ajoutez des plats depuis la carte.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {panier.map((ligne) => (
                  <div key={ligne.plat} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{ligne.plat}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">{fcfa(ligne.prix * ligne.quantite)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => modifierQuantite(ligne.plat, ligne.quantite - 1)}
                        className="w-6 h-6 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition text-xs"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-gray-900 dark:text-white">{ligne.quantite}</span>
                      <button
                        onClick={() => modifierQuantite(ligne.plat, ligne.quantite + 1)}
                        className="w-6 h-6 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition text-xs"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => retirerDuPanier(ligne.plat)}
                      className="w-6 h-6 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-300 flex items-center justify-center transition"
                      title="Retirer"
                    >
                      <Icon nom="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {panier.length > 0 && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-4">
                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span>{fcfa(total)}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Mode de service</div>
                  <div className="grid grid-cols-3 gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m.cle}
                        onClick={() => setMode(m.cle)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition text-center ${
                          mode === m.cle
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-600"
                        }`}
                      >
                        <Icon nom={m.icone} className="w-4 h-4" />
                        <span className="text-[10px] font-bold">{m.libelle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "sur_place" && (
                  <label className="block mb-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Numéro de table (optionnel)</span>
                    <input
                      value={table}
                      onChange={(evenement) => setTable(evenement.target.value)}
                      placeholder="ex. T5"
                      className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                )}

                {mode === "livraison" && (
                  <label className="block mb-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Adresse de livraison</span>
                    <input
                      value={adresse}
                      onChange={(evenement) => setAdresse(evenement.target.value)}
                      placeholder="ex. Cocody, Rue des Jardins, Immeuble Le Baobab"
                      className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                )}

                <button
                  onClick={() => void valider()}
                  disabled={envoi}
                  className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  {envoi ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      Envoi en cuisine…
                    </>
                  ) : (
                    `Valider la commande · ${fcfa(total)}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
