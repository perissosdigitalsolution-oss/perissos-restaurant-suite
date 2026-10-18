# Pull Request

## Description
Décrivez brièvement les modifications de cette PR.

## Type de changement
- [ ] Bug fix (fix)
- [ ] Nouvelle fonctionnalité (feat)
- [ ] Refactoring
- [ ] Documentation
- [ ] Sécurité (security)

## Sprint / Feature concerné
(ex. Sprint D / F-D01 — Panier client)

## Checklist obligatoire

### Tests & Qualité
- [ ] `pnpm typecheck` passe (0 erreur)
- [ ] `pnpm test` passe (29/29 verts)
- [ ] `pnpm web:build` passe (build vert)
- [ ] Aucune régression sur les fonctionnalités existantes
- [ ] Tests nouveaux écrits pour la fonctionnalité (si applicable)

### Sécurité (Protocole Magen)
- [ ] Si la PR touche `/src/auth`, `/src/validation`, `/src/monitoring` : revue CODEOWNERS requise
- [ ] Aucun secret (clé API, mot de passe, token) commité
- [ ] Validation Zod appliquée sur toute nouvelle route API
- [ ] Pas de stack trace exposée en production

### Documentation
- [ ] `docs/SUIVI-FONCTIONNALITES.md` mis à jour (statut de la feature)
- [ ] `docs/HANDOVER.md` mis à jour (état courant + prochaine étape)
- [ ] `AGENTS.md` mis à jour si les commandes ou l'environnement changent

## Preuves (validation curl)
Si la fonctionnalité ajoute ou modifie une route API, collez les commandes curl de validation :
```
$ curl ...
→ attendu : ...
→ obtenu : ...
```

## Notes additionnelles
Toute information utile pour le relecteur.
