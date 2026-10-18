import "dotenv/config";
import { normaliserTelephone } from "./utils.js";

export type ModeEverGauzy = "mock" | "postgres" | "live";

export interface ConfigLLM {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ConfigWhatsApp {
  token: string;
  numeroId: string;
  jetonVerification: string;
  secretApplication: string;
  port: number;
  telephonesAdmin: string[];
}

export interface ConfigEverGauzy {
  mode: ModeEverGauzy;
  baseUrl: string;
  apiToken: string;
  chemins: { reservations: string; tables: string; factures: string; produits: string };
}

export interface ConfigurationApp {
  restaurantNom: string;
  restaurantVille: string;
  organizationId: string;
  tenantId: string;
  portWeb: number;
  databaseUrl: string;
  sessionSecret: string;
  demoPresentation: boolean;
  sentryDsn: string;
  evergauzy: ConfigEverGauzy;
  llm: ConfigLLM;
  whatsapp: ConfigWhatsApp;
}

function env(nom: string, valeurDefaut = ""): string {
  const valeur = process.env[nom];
  return valeur && valeur.trim().length > 0 ? valeur.trim() : valeurDefaut;
}

export function chargerConfiguration(): ConfigurationApp {
  const identifiantCompte = env("CLOUDFLARE_ACCOUNT_ID");
  const baseUrlLLM =
    env("LLM_BASE_URL") ||
    (identifiantCompte ? `https://api.cloudflare.com/client/v4/accounts/${identifiantCompte}/ai/v1` : "");
  return {
    restaurantNom: env("RESTAURANT_NAME", "Périssos"),
    restaurantVille: env("RESTAURANT_VILLE", "Abidjan"),
    organizationId: env("ORGANIZATION_ID", "org-perissos"),
    tenantId: env("TENANT_ID", "tenant-perissos"),
    portWeb: Number(env("WEB_PORT", "4040")) || 4040,
    databaseUrl: env("DATABASE_URL", "postgres://perissos:dev_password@localhost:5433/perissos_restaurant"),
    sessionSecret: env("SESSION_SECRET", "perissos-dev-secret-a-changer"),
    demoPresentation: env("DEMO_PRESENTATION") === "1",
    sentryDsn: env("SENTRY_DSN"),
    evergauzy: {
      mode: env("EVERGAUZY_MODE", "postgres") === "live" ? "live" : env("EVERGAUZY_MODE", "postgres") === "mock" ? "mock" : "postgres",
      baseUrl: env("EVERGAUZY_BASE_URL"),
      apiToken: env("EVERGAUZY_API_TOKEN"),
      chemins: {
        reservations: env("EVERGAUZY_RESERVATIONS_PATH", "/api/reservations"),
        tables: env("EVERGAUZY_TABLES_PATH", "/api/tables"),
        factures: env("EVERGAUZY_INVOICES_PATH", "/api/invoices"),
        produits: env("EVERGAUZY_PRODUCTS_PATH", "/api/products"),
      },
    },
    llm: {
      baseUrl: baseUrlLLM,
      apiKey: env("LLM_API_KEY"),
      model: env("LLM_MODEL", "@cf/openai/gpt-oss-120b"),
    },
    whatsapp: {
      token: env("WHATSAPP_TOKEN"),
      numeroId: env("WHATSAPP_PHONE_NUMBER_ID"),
      jetonVerification: env("WHATSAPP_VERIFY_TOKEN", "perissos-chafik"),
      secretApplication: env("WHATSAPP_APP_SECRET"),
      port: Number(env("WHATSAPP_PORT", "3000")) || 3000,
      telephonesAdmin: env("WHATSAPP_ADMIN_PHONES")
        .split(",")
        .map((telephone) => normaliserTelephone(telephone.trim()))
        .filter((telephone) => telephone.length > 1),
    },
  };
}

export function verifierConfigurationLLM(configuration: ConfigurationApp): void {
  const manquantes: string[] = [];
  if (!configuration.llm.apiKey) manquantes.push("LLM_API_KEY");
  if (!configuration.llm.baseUrl) manquantes.push("LLM_BASE_URL ou CLOUDFLARE_ACCOUNT_ID");
  if (manquantes.length > 0) {
    throw new Error(
      `Configuration LLM incomplète (${manquantes.join(", ")}). Copiez .env.example vers .env puis renseignez ces valeurs.`
    );
  }
}
