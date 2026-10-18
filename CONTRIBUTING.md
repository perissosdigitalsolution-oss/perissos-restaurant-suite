# Contribuer à Périssos Restaurant Suite

> « Que tout se fasse avec bienséance et avec ordre. » — 1 Corinthiens 14:40

## Règles de nommage des branches

| Préfixe | Usage | Exemple |
|---|---|---|
| `feat/` | Nouvelle fonctionnalité | `feat/panier-client` |
| `fix/` | Correction de bug | `fix/kds-urgent-seuil` |
| `security/` | Correctif de sécurité (Magen) | `security/rate-limit-login` |
| `docs/` | Documentation uniquement | `docs/mise-a-jour-handover` |
| `deps/` | Mise à jour des dépendances | `deps/drizzle-0.46` |
| `ci/` | Infrastructure CI/CD | `ci/add-codeql` |
| `refactor/` | Refactoring sans changement de comportement | `refactor/extract-rendu-site` |

## Processus de Pull Request

1. **Créer une branche** depuis `main` avec le préfixe approprié.
2. **Développer** en respectant [AGENTS.md](AGENTS.md) et le Protocole Magen.
3. **Valider localement** :
   ```bash
   pnpm typecheck   # 0 erreur
   pnpm test         # 29/29 verts
   pnpm web:build    # build vert
   ```
4. **Ouvrir la PR** avec le template complet (checklist obligatoire).
5. **Attendre la CI** — elle doit être verte avant toute revue.
6. **Revue CODEOWNERS** — si la PR touche `/src/auth`, `/src/validation`, `/src/monitoring`, `docs/PROTOCOLE-MAGEN.md` : approbation du Lead requise.
7. **Merge** en squash avec un message propre.

## Règles de code

- **Langue** : français (identifiants, messages, UI, documentation).
- **Zéro commentaire** dans le code.
- **Zéro emoji** dans le code et l'UI (icônes SVG uniquement).
- **Validation Zod** sur toute nouvelle route API.
- **Tests** écrits avant de déclarer une fonctionnalité terminée.
- **Mise à jour des docs** (`SUIVI-FONCTIONNALITES.md`, `HANDOVER.md`) obligatoire à chaque PR.

## Règles de sécurité (Protocole Magen)

- **Jamais de secret** dans le code (clés API, mots de passe, tokens). Utilisez `.env` (jamais commité).
- **`DEMO_PRESENTATION`** doit être désactivé en production.
- **`SESSION_SECRET`** doit être unique et fort (64+ caractères).
- **Port 5433** ne doit jamais être exposé publiquement.
- Si vous découvrez une faille, suivez [SECURITY.md](SECURITY.md).

## Definition of Done

Une PR est prête à merger quand :
- [ ] Typecheck vert
- [ ] Tests verts
- [ ] Build web vert
- [ ] Validation curl documentée dans la PR
- [ ] Documentation mise à jour
- [ ] Aucun secret exposé
- [ ] CODEOWNERS a approuvé (si applicable)
