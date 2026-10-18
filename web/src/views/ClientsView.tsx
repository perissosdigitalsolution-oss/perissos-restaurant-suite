import Icon from "../components/Icon";
import { dateCourte } from "../format";
import type { ClientFidele } from "../types";

export default function ClientsView({
  clients,
  onQuestion,
}: {
  clients: ClientFidele[];
  onQuestion: (question: string) => void;
}) {
  const fidèles = clients.filter((client) => client.passages >= 3);
  const totalPassages = clients.reduce((somme, client) => somme + client.passages, 0);

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Clients
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Base des 30 derniers jours · {clients.length} client(s) · {totalPassages} passage(s)
          </p>
        </div>
        <button
          onClick={() =>
            onQuestion(
              "Analyse mes clients sur les 30 derniers jours : qui sont les fidèles, qui risque de ne pas revenir ?"
            )
          }
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
        >
          Analyser avec Chafik
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-fadeUp">
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-2">
            <Icon nom="users" className="w-4 h-4" />
          </div>
          <div className="font-display text-xl font-bold text-gray-900 dark:text-white">{clients.length}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">Clients sur 30 jours</div>
        </div>
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
            <Icon nom="star" className="w-4 h-4" />
          </div>
          <div className="font-display text-xl font-bold text-gray-900 dark:text-white">{fidèles.length}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">Clients fidèles (3+ passages)</div>
        </div>
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
            <Icon nom="calendar" className="w-4 h-4" />
          </div>
          <div className="font-display text-xl font-bold text-gray-900 dark:text-white">{totalPassages}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">Passages cumulés</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fadeUp">
        {clients.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Aucun client enregistré sur les 30 derniers jours.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_160px_80px_90px] gap-3 px-4 md:px-5 py-2.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold bg-gray-50/70 dark:bg-gray-800/40">
              <span>Client</span>
              <span className="hidden md:block">Téléphone</span>
              <span className="text-right">Passages</span>
              <span className="hidden md:block text-right">Dernier</span>
            </div>
            {clients.map((client) => (
              <div
                key={client.telephone}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_160px_80px_90px] gap-3 items-center px-4 md:px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {client.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {client.nom}
                  </span>
                  {client.passages >= 3 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                      Fidèle
                    </span>
                  )}
                </div>
                <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {client.telephone}
                </span>
                <span className="text-right text-sm font-bold text-gray-900 dark:text-white">
                  {client.passages}
                </span>
                <span className="hidden md:block text-right text-xs text-gray-400">
                  {dateCourte(client.derniereDate)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
