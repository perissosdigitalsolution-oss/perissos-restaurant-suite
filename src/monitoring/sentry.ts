import * as Sentry from "@sentry/node";
import { chargerConfiguration } from "../config.js";

let sentryInitialise = false;

export function initialiserSentry(): void {
  const dsn = process.env.SENTRY_DSN || chargerConfiguration().sentryDsn;
  if (!dsn) {
    console.log("[Sentry] DSN non configuré — monitoring désactivé (dev).");
    return;
  }
  const configuration = chargerConfiguration();
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    beforeSend(event) {
      if (event.request?.data) {
        const donnees = event.request.data as Record<string, unknown>;
        if (typeof donnees.email === "string") donnees.email = "[masqué]";
        if (typeof donnees.telephone === "string") donnees.telephone = "[masqué]";
        if (typeof donnees.motDePasse === "string") donnees.motDePasse = "[masqué]";
      }
      return event;
    },
  });
  sentryInitialise = true;
  console.log(`[Sentry] Initialisé — environnement: ${process.env.NODE_ENV ?? "development"}`);
}

export function capturerErreur(erreur: unknown, contexte?: Record<string, unknown>): void {
  if (!sentryInitialise) return;
  Sentry.captureException(erreur, { extra: contexte });
}

export async function fermerSentry(): Promise<void> {
  if (!sentryInitialise) return;
  await Sentry.close(2000);
}
