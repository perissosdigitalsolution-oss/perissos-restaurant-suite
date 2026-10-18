import { useMemo, useState } from "react";
import BadgeStatut from "../components/BadgeStatut";
import Icon from "../components/Icon";
import { fcfa, depuisQuand } from "../format";
import type { CommandeWeb, EmployeWeb, PlatMenuWeb, RoleWeb, StatutCommandeWeb } from "../types";

const TRANSITIONS: Record<RoleWeb, Partial<Record<StatutCommandeWeb, StatutCommandeWeb>>> = {
  RESTAURANT_ADMIN: { EN_ATTENTE: "EN_CUISINE", PRETE: "SERVIE", SERVIE: "PAYEE" },
  SERVER: { EN_ATTENTE: "EN_CUISINE", PRETE: "SERVIE", SERVIE: "PAYEE" },
  BAR: { EN_ATTENTE: "EN_CUISINE", PRETE: "SERVIE", SERVIE: "PAYEE" },
  KITCHEN: { EN_ATTENTE: "EN_CUISINE", EN_CUISINE: "PRETE" },
  CASHIER: { SERVIE: "PAYEE" },
  CLIENT: {},
};

const LIBELLES_CIBLE: Record<StatutCommandeWeb, string> = {
  EN_ATTENTE: "Envoyer en cuisine",
  EN_CUISINE: "Marquer prête",
  PRETE: "Marquer servie",
  SERVIE: "Encaisser",
  PAYEE: "Payée",
};

const FILTRES: Array<{ cle: "tous" | StatutCommandeWeb; libelle: string }> = [
  { cle: "tous", libelle: "Toutes" },
  { cle: "EN_ATTENTE", libelle: "En attente" },
  { cle: "EN_CUISINE", libelle: "En cuisine" },
  { cle: "PRETE", libelle: "Prêtes" },
  { cle: "SERVIE", libelle: "Servies" },
  { cle: "PAYEE", libelle: "Payées" },
];

export default function CommandesView({
  commandes,
  equipe,
  plats,
  role,
  onMajStatut,
  onAssigner,
  onCreer,
  onQuestion,
}: {
  commandes: CommandeWeb[];
  equipe: EmployeWeb[];
  plats: PlatMenuWeb[];
  role: RoleWeb;
  onMajStatut: (id: string, statut: StatutCommandeWeb) => Promise<void>;
  onAssigner: (id: string, serveurId?: string, cuisinierId?: string) => Promise<void>;
  onCreer: (tableId: string, serveurId: string, lignes: Array<{ plat: string; quantite: number }>) => Promise<void>;
  onQuestion: (question: string) => void;
}) {
  const [filtre, setFiltre] = useState<"tous" | StatutCommandeWeb>("tous");
  const [erreur, setErreur] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [table, setTable] = useState("");
  const [serveurForm, setServeurForm] = useState("");
  const [lignesForm, setLignesForm] = useState<Array<{ plat: string; quantite: number }>>([
    { plat: plats[0]?.nom ?? "", quantite: 1 },
  ]);

  const serveurs = equipe.filter((employe) => employe.fonction === "serveur" && employe.actif);
  const cuisiniers = equipe.filter((employe) => employe.fonction === "cuisinier" && employe.actif);
  const transitions = TRANSITIONS[role];

  const commandesFiltrees = useMemo(
    () => commandes.filter((commande) => filtre === "tous" || commande.statut === filtre),
    [commandes, filtre]
  );

  const executer = async (action: () => Promise<void>) => {
    try {
      setErreur(null);
      await action();
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const envoyerFormulaire = async () => {
    const lignes = lignesForm.filter((ligne) => ligne.plat && ligne.quantite > 0);
    if (!table.trim() || lignes.length === 0) {
      setErreur("Renseignez une table et au moins une ligne de commande.");
      return;
    }
    await executer(async () => {
      await onCreer(table.trim(), serveurForm, lignes);
      setTable("");
      setLignesForm([{ plat: plats[0]?.nom ?? "", quantite: 1 }]);
      setFormulaireOuvert(false);
    });
  };

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Commandes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            {commandes.filter((commande) => commande.statut !== "PAYEE").length} en cours ·{" "}
            {commandes.length} au total aujourd'hui
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(role === "RESTAURANT_ADMIN" || role === "SERVER" || role === "BAR") && (
            <button
              onClick={() => setFormulaireOuvert(!formulaireOuvert)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5"
            >
              <Icon nom={formulaireOuvert ? "x" : "plus"} className="w-3.5 h-3.5" />
              Nouvelle commande
            </button>
          )}
          <button
            onClick={() =>
              onQuestion(
                "Quelles commandes sont en cours et quelles tables attendent encore leur plat ?"
              )
            }
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400 transition"
          >
            Demander à Chafik
          </button>
        </div>
      </div>

      {erreur && (
        <div className="text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {erreur}
        </div>
      )}

      {formulaireOuvert && (
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900 shadow-sm animate-fadeUp space-y-3">
          <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">
            Nouvelle commande
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Table
              <input
                value={table}
                onChange={(evenement) => setTable(evenement.target.value)}
                placeholder="ex. T2"
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Serveur
              <select
                value={serveurForm}
                onChange={(evenement) => setServeurForm(evenement.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">— Choisir —</option>
                {serveurs.map((employe) => (
                  <option key={employe.id} value={employe.id}>
                    {employe.nom}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-2">
            {lignesForm.map((ligne, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={ligne.plat}
                  onChange={(evenement) =>
                    setLignesForm(
                      lignesForm.map((element, i) =>
                        i === index ? { ...element, plat: evenement.target.value } : element
                      )
                    )
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {plats
                    .filter((plat) => plat.disponible)
                    .map((plat) => (
                      <option key={plat.nom} value={plat.nom}>
                        {plat.nom} · {fcfa(plat.prix)}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={ligne.quantite}
                  onChange={(evenement) =>
                    setLignesForm(
                      lignesForm.map((element, i) =>
                        i === index ? { ...element, quantite: Math.max(1, Number(evenement.target.value)) } : element
                      )
                    )
                  }
                  className="w-16 px-2 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => setLignesForm(lignesForm.filter((_, i) => i !== index))}
                  className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/70 transition"
                  title="Retirer la ligne"
                >
                  <Icon nom="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setLignesForm([...lignesForm, { plat: plats[0]?.nom ?? "", quantite: 1 }])}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1"
            >
              <Icon nom="plus" className="w-3 h-3" /> Ajouter une ligne
            </button>
          </div>
          <button
            onClick={envoyerFormulaire}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
          >
            Envoyer la commande
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 animate-fadeUp">
        {FILTRES.map((option) => (
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
      </div>

      <div className="space-y-3">
        {commandesFiltrees.length === 0 && (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
            Aucune commande pour ce filtre.
          </div>
        )}
        {commandesFiltrees.map((commande, index) => {
          const cible = transitions[commande.statut];
          return (
            <div
              key={commande.id}
              className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeUp"
              style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {commande.id}
                    </span>
                    <BadgeStatut statut={commande.statut} />
                    <span className="text-[11px] text-gray-400">
                      {commande.heure} · {depuisQuand(`${commande.date}T${commande.heure}:00`)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {commande.tableName ?? commande.tableId ?? "Sans table"}
                    {commande.reservationCode ? (
                      <span className="ml-2 font-mono text-[10px] text-gray-400">
                        {commande.reservationCode}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {commande.lignes.map((ligne) => `${ligne.quantite}× ${ligne.plat}`).join(" · ")}
                  </div>
                  <div className="mt-1.5 text-[11px] text-gray-400">
                    Serveur : {commande.serveurNom ?? "—"} · Cuisine : {commande.cuisinierNom ?? "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-base font-bold text-gray-900 dark:text-white">
                    {fcfa(commande.montantTotal)}
                  </div>
                </div>
              </div>

              {(Object.keys(transitions).length > 0 || serveurs.length > 0 || cuisiniers.length > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
                  {serveurs.length > 0 && commande.statut !== "PAYEE" && (
                    <select
                      value={commande.serveurId ?? ""}
                      onChange={(evenement) =>
                        void executer(() => onAssigner(commande.id, evenement.target.value || undefined))
                      }
                      className="text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Serveur…</option>
                      {serveurs.map((employe) => (
                        <option key={employe.id} value={employe.id}>
                          {employe.nom}
                        </option>
                      ))}
                    </select>
                  )}
                  {cuisiniers.length > 0 && commande.statut !== "PAYEE" && (
                    <select
                      value={commande.cuisinierId ?? ""}
                      onChange={(evenement) =>
                        void executer(() =>
                          onAssigner(
                            commande.id,
                            undefined,
                            evenement.target.value || undefined
                          )
                        )
                      }
                      className="text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Cuisinier…</option>
                      {cuisiniers.map((employe) => (
                        <option key={employe.id} value={employe.id}>
                          {employe.nom}
                        </option>
                      ))}
                    </select>
                  )}
                  {cible && (
                    <button
                      onClick={() => void executer(() => onMajStatut(commande.id, cible))}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5"
                    >
                      {LIBELLES_CIBLE[commande.statut]}
                      <Icon nom="arrowRight" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
