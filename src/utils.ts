const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export type Periode = "aujourdhui" | "semaine" | "mois";

export function toISODate(date: Date): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

export function depuisISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function ajouterJours(date: Date, nombre: number): Date {
  const copie = new Date(date);
  copie.setDate(copie.getDate() + nombre);
  return copie;
}

export function nomJourFr(iso: string): string {
  return JOURS_FR[depuisISODate(iso).getDay()];
}

export function formatDateFr(iso: string): string {
  const date = depuisISODate(iso);
  return `${JOURS_FR[date.getDay()]} ${date.getDate()} ${MOIS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatHeureFr(heure: string): string {
  return heure.replace(":", "h");
}

export function formatFCFA(montant: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(montant))} FCFA`;
}

export function formatPourcent(valeur: number): string {
  return `${valeur > 0 ? "+" : ""}${valeur.toFixed(1).replace(".", ",")}%`;
}

export function heureValide(heure: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(heure);
}

export function heureEnMinutes(heure: string): number {
  const [heures, minutes] = heure.split(":").map(Number);
  return heures * 60 + minutes;
}

export function minutesEnHeure(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function normaliserTelephone(valeur: string): string {
  const nettoye = valeur.replace(/[^\d+]/g, "");
  return nettoye.startsWith("+") ? nettoye : `+${nettoye}`;
}

export function bornesPeriode(dateReference: Date, periode: Periode): { debut: Date; fin: Date } {
  const fin = new Date(dateReference.getFullYear(), dateReference.getMonth(), dateReference.getDate());
  if (periode === "aujourdhui") {
    return { debut: new Date(fin), fin };
  }
  const jours = periode === "semaine" ? 7 : 30;
  return { debut: ajouterJours(fin, -(jours - 1)), fin };
}

export function bornesPeriodePrecedente(debut: Date, fin: Date): { debut: Date; fin: Date } {
  const longueur = Math.round((fin.getTime() - debut.getTime()) / 86_400_000) + 1;
  const finPrecedente = ajouterJours(debut, -1);
  return { debut: ajouterJours(finPrecedente, -(longueur - 1)), fin: finPrecedente };
}

export function mulberry32(graine: number): () => number {
  let etat = graine;
  return () => {
    etat |= 0;
    etat = (etat + 0x6d2b79f5) | 0;
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function tirageAleatoire<T>(elements: T[], aleatoire: () => number): T {
  return elements[Math.floor(aleatoire() * elements.length)];
}

export function tiragePondere<T>(entrees: Array<[T, number]>, aleatoire: () => number): T {
  const total = entrees.reduce((somme, [, poids]) => somme + poids, 0);
  let seuil = aleatoire() * total;
  for (const [valeur, poids] of entrees) {
    seuil -= poids;
    if (seuil < 0) return valeur;
  }
  return entrees[entrees.length - 1][0];
}

export function genererCodeReservation(aleatoire: () => number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffixe = "";
  for (let index = 0; index < 4; index++) {
    suffixe += alphabet[Math.floor(aleatoire() * alphabet.length)];
  }
  return `PRS-${suffixe}`;
}

export function prochainJour(dateDepart: Date, jourCible: number): Date {
  const resultat = new Date(dateDepart.getFullYear(), dateDepart.getMonth(), dateDepart.getDate());
  while (resultat.getDay() !== jourCible) {
    resultat.setDate(resultat.getDate() + 1);
  }
  return resultat;
}
