# Périssos Restaurant Suite

> Une seule plateforme au lieu de 5 à 7 outils — dès 32 000 FCFA/mois.
> La plateforme tout-en-un des restaurants d'Abidjan.

## Stack technique

| Composant | Version |
|---|---|
| Node.js | 24.x |
| PostgreSQL | 16 (Docker, port 5433) |
| ORM | Drizzle 0.45 |
| Frontend | React 18 + Vite 5 + Tailwind 3 |
| Tests | Vitest 2 |
| Validation | Zod 4 |
| Monitoring | Sentry (DSN conditionnel) |
| Agent IA | Chafik — 21 outils function calling |

## Lancer en local

### Prérequis
- Docker Desktop (ou Docker Engine)
- Node.js 24+
- pnpm (`npm install -g pnpm`)

### Démarrage

```bash
pnpm install

docker compose up -d
# attendre "healthy" avec docker compose ps

pnpm db:migrate
pnpm db:seed

pnpm web:build
pnpm web:start
```

Le portail tourne sur http://localhost:4040
Le site public sur http://localhost:4040/site/perissos

### Comptes démo (mot de passe : `demo1234`)

| Email | Rôle |
|---|---|
| amadou.ba@perissos.ci | Patron (RESTAURANT_ADMIN) |
| awa.kone@perissos.ci | Serveur |
| mariam.toure@perissos.ci | Cuisine |
| bintou.sanogo@perissos.ci | Bar |
| serge.kouadio@perissos.ci | Caisse |

### Tests

```bash
pnpm test
```

29 tests Vitest s'exécutent sur la base dédiée `perissos_restaurant_test` (jamais sur la base de dev).

## Sécurité

Ce projet suit le **Protocole Magen** — doctrine de sécurité à 7 couches.

- 🔒 [docs/PROTOCOLE-MAGEN.md](docs/PROTOCOLE-MAGEN.md) — doctrine complète
- 🔒 [SECURITY.md](SECURITY.md) — comment signaler une faille
- 🔒 [CONTRIBUTING.md](CONTRIBUTING.md) — règles de contribution

## Documentation

| Document | Rôle |
|---|---|
| [AGENTS.md](AGENTS.md) | Protocole de travail des agents IA |
| [docs/VISION.md](docs/VISION.md) | Vision, mission, décisions verrouillées |
| [docs/SUIVI-FONCTIONNALITES.md](docs/SUIVI-FONCTIONNALITES.md) | Registre des fonctionnalités |
| [docs/POLITIQUE-TESTS.md](docs/POLITIQUE-TESTS.md) | Standards de tests, Definition of Done |
| [docs/POLITIQUE-DOCUMENTATION.md](docs/POLITIQUE-DOCUMENTATION.md) | Règles de documentation |
| [docs/HANDOVER.md](docs/HANDOVER.md) | État courant, passation, leçons |
| [docs/ALIGNEMENT-COMMERCIAL.md](docs/ALIGNEMENT-COMMERCIAL.md) | Promesses PDF vs code |
| [docs/WORKFLOW-MCP.md](docs/WORKFLOW-MCP.md) | Réplication de thèmes via MCP |
| [docs/RAPPORT-DEPLOIEMENT.md](docs/RAPPORT-DEPLOIEMENT.md) | État complet pour le pilote |

## Licence

Propriété de Royal Digital Solution. Tous droits réservés.

---

Basé en Côte d'Ivoire · support local en français
