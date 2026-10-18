export default function BadgeStatut({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    CONFIRMEE: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
    ANNULLEE: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    NO_SHOW: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
    EN_ATTENTE: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
    EN_CUISINE: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
    PRETE: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300",
    SERVIE: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
    PAYEE: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  };
  const libelles: Record<string, string> = {
    CONFIRMEE: "Confirmée",
    ANNULLEE: "Annulée",
    NO_SHOW: "No-show",
    EN_ATTENTE: "En attente",
    EN_CUISINE: "En cuisine",
    PRETE: "Prête",
    SERVIE: "Servie",
    PAYEE: "Payée",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap ${styles[statut] ?? styles.ANNULLEE}`}>
      {libelles[statut] ?? statut}
    </span>
  );
}
