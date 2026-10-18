export function fcfa(valeur: number): string {
  return `${Math.round(valeur).toLocaleString("fr-FR")} FCFA`;
}

export function jourCourt(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

export function jourLong(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("fr-FR", { weekday: "long" });
}

export function dateCourte(iso: string): string {
  const date = new Date(iso.length > 10 ? iso : `${iso}T12:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function dateLongue(iso: string): string {
  const date = new Date(iso.length > 10 ? iso : `${iso}T12:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function depuisQuand(iso: string): string {
  if (iso.length <= 10) return dateCourte(iso);
  const ecart = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(ecart / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return `il y a ${jours} j`;
}
