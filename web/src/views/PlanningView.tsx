import { useMemo, useState } from "react";
import Icon, { type NomIcone } from "../components/Icon";
import { dateLongue, jourCourt } from "../format";
import type { EmployeWeb, PosteShiftWeb, RoleWeb, ShiftWeb } from "../types";

const POSTES: Array<{ cle: PosteShiftWeb; libelle: string; icone: NomIcone }> = [
  { cle: "salle", libelle: "Salle", icone: "users" },
  { cle: "cuisine", libelle: "Cuisine", icone: "flame" },
  { cle: "bar", libelle: "Bar", icone: "coffee" },
  { cle: "caisse", libelle: "Caisse", icone: "receipt" },
];

const LIBELLE_POSTE: Record<PosteShiftWeb, string> = {
  salle: "Salle",
  cuisine: "Cuisine",
  bar: "Bar",
  caisse: "Caisse",
};

export default function PlanningView({
  planning,
  equipe,
  role,
  onCreerShift,
  onSupprimerShift,
}: {
  planning: ShiftWeb[];
  equipe: EmployeWeb[];
  role: RoleWeb;
  onCreerShift: (employeId: string, date: string, debut: string, fin: string, poste: PosteShiftWeb) => Promise<void>;
  onSupprimerShift: (id: string) => Promise<void>;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const actif = equipe.filter((employe) => employe.actif);
  const isoAujourdhui = new Date().toISOString().slice(0, 10);
  const [employeForm, setEmployeForm] = useState("");
  const [dateForm, setDateForm] = useState(isoAujourdhui);
  const [debutForm, setDebutForm] = useState("18:00");
  const [finForm, setFinForm] = useState("23:00");
  const [posteForm, setPosteForm] = useState<PosteShiftWeb>("salle");
  const peutAdministrer = role === "RESTAURANT_ADMIN";

  const parJour = useMemo(() => {
    const groupes = new Map<string, ShiftWeb[]>();
    for (const shift of planning) {
      const liste = groupes.get(shift.date) ?? [];
      liste.push(shift);
      groupes.set(shift.date, liste);
    }
    return [...groupes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [planning]);

  const executer = async (action: () => Promise<void>) => {
    try {
      setErreur(null);
      await action();
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const envoyer = () => {
    if (!employeForm) {
      setErreur("Choisissez un membre de l'équipe.");
      return;
    }
    void executer(async () => {
      await onCreerShift(employeForm, dateForm, debutForm, finForm, posteForm);
      setFormulaireOuvert(false);
    });
  };

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Planning de l'équipe
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            {planning.length} shift(s) sur les 7 prochains jours
          </p>
        </div>
        {peutAdministrer && (
          <button
            onClick={() => setFormulaireOuvert(!formulaireOuvert)}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5"
          >
            <Icon nom={formulaireOuvert ? "x" : "plus"} className="w-3.5 h-3.5" />
            Planifier un shift
          </button>
        )}
      </div>

      {erreur && (
        <div className="text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {erreur}
        </div>
      )}

      {formulaireOuvert && peutAdministrer && (
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900 shadow-sm animate-fadeUp">
          <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-3">
            Nouveau shift
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Membre
              <select
                value={employeForm}
                onChange={(evenement) => setEmployeForm(evenement.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">— Choisir —</option>
                {actif.map((employe) => (
                  <option key={employe.id} value={employe.id}>
                    {employe.nom} ({employe.fonction})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Date
              <input
                type="date"
                value={dateForm}
                onChange={(evenement) => setDateForm(evenement.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Début
              <input
                type="time"
                value={debutForm}
                onChange={(evenement) => setDebutForm(evenement.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Fin
              <input
                type="time"
                value={finForm}
                onChange={(evenement) => setFinForm(evenement.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Poste
              <select
                value={posteForm}
                onChange={(evenement) => setPosteForm(evenement.target.value as PosteShiftWeb)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {POSTES.map((option) => (
                  <option key={option.cle} value={option.cle}>
                    {option.libelle}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={envoyer}
            className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
          >
            Enregistrer le shift
          </button>
        </div>
      )}

      <div className="space-y-4">
        {parJour.length === 0 && (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm text-sm text-gray-500 dark:text-gray-400 animate-fadeUp">
            Aucun shift planifié sur la période.
          </div>
        )}
        {parJour.map(([date, shifts], index) => (
          <div
            key={date}
            className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fadeUp"
            style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
          >
            <div className="px-4 md:px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                {jourCourt(date)}
              </span>
              <span className="font-display text-sm font-bold text-gray-900 dark:text-white">
                {dateLongue(date)}
              </span>
              {date === isoAujourdhui && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  AUJOURD'HUI
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {shifts.map((shift) => {
                const poste = POSTES.find((element) => element.cle === shift.poste);
                return (
                  <div key={shift.id} className="px-4 md:px-5 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Icon nom={poste?.icone ?? "users"} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {shift.employeNom}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {LIBELLE_POSTE[shift.poste]} · {shift.employeFonction}
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 shrink-0">
                      {shift.debut} – {shift.fin}
                    </div>
                    {peutAdministrer && (
                      <button
                        onClick={() => void executer(() => onSupprimerShift(shift.id))}
                        className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition shrink-0"
                        title="Supprimer le shift"
                      >
                        <Icon nom="trash" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
