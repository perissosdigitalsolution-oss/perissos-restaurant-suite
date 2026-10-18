import type { CreneauAlternatif, ReservationRecord, TableInfo } from "../types.js";
import { heureEnMinutes, minutesEnHeure } from "../utils.js";

const DUREE_SERVICE_MINUTES = 90;
const OUVERTURE_MINUTES = 11 * 60;
const FERMETURE_MINUTES = 22 * 60 + 30;

export interface ResultatCalculDisponibilite {
  disponible: boolean;
  tablesLibres: TableInfo[];
  tableRecommandee: TableInfo | null;
  creneauxAlternatifs: CreneauAlternatif[];
}

export function enConflit(
  reservations: ReservationRecord[],
  tableId: string,
  date: string,
  heure: string,
  codeExclu?: string
): boolean {
  const minutesCibles = heureEnMinutes(heure);
  return reservations.some((reservation) => {
    if (reservation.statut !== "CONFIRMEE") return false;
    if (reservation.tableId !== tableId) return false;
    if (reservation.date !== date) return false;
    if (codeExclu && reservation.code === codeExclu) return false;
    return Math.abs(heureEnMinutes(reservation.heure) - minutesCibles) < DUREE_SERVICE_MINUTES;
  });
}

function proposerCreneauxAlternatifs(
  tables: TableInfo[],
  reservations: ReservationRecord[],
  date: string,
  nombrePersonnes: number,
  heureReference: string,
  codeExclu?: string
): CreneauAlternatif[] {
  const minutesCibles = heureEnMinutes(heureReference);
  const resultats: CreneauAlternatif[] = [];
  for (const ecart of [30, 60, 90, 120]) {
    for (const signe of [-1, 1]) {
      const minutes = minutesCibles + signe * ecart;
      if (minutes < OUVERTURE_MINUTES || minutes > FERMETURE_MINUTES) continue;
      const heure = minutesEnHeure(minutes);
      const libre = tables.some(
        (table) =>
          table.capacite >= nombrePersonnes && !enConflit(reservations, table.id, date, heure, codeExclu)
      );
      if (libre && !resultats.some((creneau) => creneau.heure === heure)) {
        resultats.push({ heure });
      }
      if (resultats.length >= 3) return resultats;
    }
  }
  return resultats;
}

export function calculerDisponibilite(
  tables: TableInfo[],
  reservations: ReservationRecord[],
  date: string,
  heure: string,
  nombrePersonnes: number,
  codeExclu?: string
): ResultatCalculDisponibilite {
  const tablesLibres = tables
    .filter(
      (table) =>
        table.capacite >= nombrePersonnes && !enConflit(reservations, table.id, date, heure, codeExclu)
    )
    .sort((a, b) => a.capacite - b.capacite);
  return {
    disponible: tablesLibres.length > 0,
    tablesLibres,
    tableRecommandee: tablesLibres[0] ?? null,
    creneauxAlternatifs:
      tablesLibres.length > 0
        ? []
        : proposerCreneauxAlternatifs(tables, reservations, date, nombrePersonnes, heure, codeExclu),
  };
}
