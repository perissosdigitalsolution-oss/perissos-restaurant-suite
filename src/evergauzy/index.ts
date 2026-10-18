import type { ConfigurationApp } from "../config.js";
import type { AdaptateurDonneesRestaurant } from "./adaptateur.js";
import { AdaptateurMock } from "./adaptateur-mock.js";
import { AdaptateurPostgres } from "./adaptateur-postgres.js";
import { AdaptateurEverGauzy } from "./adaptateur-evergauzy.js";

export function creerAdaptateur(configuration: ConfigurationApp): AdaptateurDonneesRestaurant {
  if (configuration.evergauzy.mode === "live") {
    return new AdaptateurEverGauzy({
      ...configuration.evergauzy,
      organizationId: configuration.organizationId,
      tenantId: configuration.tenantId,
    });
  }
  if (configuration.evergauzy.mode === "postgres") {
    return new AdaptateurPostgres();
  }
  return new AdaptateurMock();
}
