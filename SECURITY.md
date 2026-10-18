# Politique de sécurité — Périssos Restaurant Suite

> Conforme au **Protocole Magen** — doctrine de sécurité et de résilience. Voir [docs/PROTOCOLE-MAGEN.md](docs/PROTOCOLE-MAGEN.md).

## Comment signaler une faille

**Ne ouvrez JAMAIS une issue publique pour une faille de sécurité.**

1. Envoyez un email à `contact@perissos.digital` avec le sujet `[MAGEN] Signalement`.
2. Décrivez la faille : composant concerné, étapes de reproduction, impact potentiel.
3. Vous recevrez un accusé de réception sous 48h.
4. Le Protocole Magen IR (réponse aux incidents) sera déclenché : détection → confinement → analyse → éradication → rétablissement → retour d'expérience.

## Périmètre couvert

| Composant | Version | Priorité |
|---|---|---|
| API backend (`src/serveur-web.ts`) | en cours | P0 |
| Authentification (`src/auth/`) | en cours | P0 |
| Validation (`src/validation/`) | en cours | P0 |
| Base de données (`src/db/`) | en cours | P0 |
| Agent IA (`src/agent/`, `src/llm/`) | en cours | P0 |
| Frontend (`web/`) | en cours | P1 |
| Site public (`src/site/`) | en cours | P1 |
| Infrastructure (Docker, Caddy) | en cours | P1 |

## Secrets et clés

| Secret | Stockage | Exposition |
|---|---|---|
| `SESSION_SECRET` | `.env` (jamais commité) | Serveur uniquement |
| `LLM_API_KEY` | `.env` | Serveur uniquement — jamais dans le frontend |
| `DATABASE_URL` | `.env` | Serveur uniquement — bind 127.0.0.1 |
| `WHATSAPP_TOKEN` | `.env` | Serveur uniquement |
| `SENTRY_DSN` | `.env` | Publique (DSN), mais PII masquée |

## Checklist pre-flight (avant chaque déploiement)

- [ ] `DEMO_PRESENTATION` vide ou absent
- [ ] Comptes démo supprimés ou désactivés
- [ ] `SESSION_SECRET` unique et fort (64+ caractères)
- [ ] `LLM_API_KEY` présente (ou fallback testé)
- [ ] Port 5433 bindé sur `127.0.0.1` uniquement
- [ ] `pnpm audit` sans vulnérabilité critique
- [ ] Tests verts (29/29)
- [ ] En-têtes de sécurité actifs
- [ ] Backups configurés
- [ ] Logs centralisés (Sentry DSN configuré)

## Contact

- **Email sécurité** : contact@perissos.digital
- **WhatsApp urgence** : +225 07 99 28 75 55
- **Basé en Côte d'Ivoire** — support local en français
