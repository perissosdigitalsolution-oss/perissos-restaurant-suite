import Icon, { type NomIcone } from "../components/Icon";

export default function PlaceholderView({
  titre,
  description,
  icone,
}: {
  titre: string;
  description: string;
  icone: NomIcone;
}) {
  return (
    <div className="space-y-5 animate-fadeUp">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {titre}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">{description}</p>
      </div>
      <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-10 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mx-auto mb-3">
          <Icon nom={icone} className="w-7 h-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-1.5">{titre}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Cet module est opérationnel côté agent. L'interface complète sera disponible ici prochainement.
        </p>
      </div>
    </div>
  );
}
