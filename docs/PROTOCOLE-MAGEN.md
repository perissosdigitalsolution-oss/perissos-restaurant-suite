# PROTOCOLE MAGEN — Doctrine de sécurité et de résilience

> **מגן — Bouclier en hébreu.** Doctrine officielle de sécurité de Perissos Digital AI Agency. Version 1.0 — Octobre 2026.
> « La sagesse bâtit sa maison, et l'intelligence l'affermit. » (Mishlei / Proverbes 24:3)

## 1. Vision et principes directeurs

Magen n'est pas un simple audit. C'est un bouclier qui protège les données des restaurateurs, la réputation de Perissos et la confiance de nos Partenaires Sponsors.

| Principe | Application concrète |
|---|---|
| **Zero Trust** | Aucune requête n'est fiable par défaut. Chaque action est vérifiée (session, rôle, tenant). |
| **Moindre privilège** | Un serveur ne peut pas accéder aux fonctions du patron. Un client ne voit que ses données. |
| **Défense en profondeur** | Plusieurs couches (réseau, app, données, IA) pour qu'une faille isolée ne compromette pas tout. |
| **Sécurité par défaut** | L'état par défaut est fermé. On ouvre explicitement ce qui est nécessaire. |
| **Souveraineté** | Les données et les secrets restent chez nous (ou chez le client en BYOC). Pas de dépendance opaque. |
| **Transparence** | Logs clairs, documentation des incidents, code auditable. |

## 2. Les 7 couches du bouclier Magen

### Couche 1 — Infrastructure & réseau (P0-P1)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Isolation Docker | P0 | Réseau interne dédié, pas de `--privileged`, utilisateur non-root dans les conteneurs | 🔲 |
| Postgres non exposé | P0 | Port 5433 mappé uniquement sur `127.0.0.1` (pas `0.0.0.0`) | 🔲 |
| Secrets hors du code | P0 | `SESSION_SECRET`, `LLM_API_KEY`, `DATABASE_URL` injectés via variables d'environnement (jamais commités) | 🔲 |
| TLS / HTTPS | P1 | Cloudflare (proxy) ou Let's Encrypt (Caddy/Nginx). Redirection HTTP → HTTPS | 🔲 |
| Pare-feu applicatif (WAF) | P1 | Cloudflare WAF en amont (protection DDoS, SQLi, XSS) | 🔲 |
| Sauvegardes chiffrées | P1 | `pg_dump` quotidien, chiffré (age/GPG), stocké sur R2/S3 avec rétention 30 jours | 🔲 |

⚠️ **Point d'attention** : le port 5433 ne doit jamais être exposé publiquement. En production, la base doit être dans un sous-réseau privé.

### Couche 2 — Authentification & autorisation (P0-P2)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Sessions sécurisées | P0 | Cookies HttpOnly, Secure, SameSite=Strict. `SESSION_SECRET` fort (64+ caractères aléatoires) | 🔲 |
| Rate Limiting | P0 | Middleware sur `/api/auth/*` (ex: 5 tentatives / 15 min / IP) | 🔲 |
| RBAC strict | P0 | Matrice 13 routes × 6 rôles testée. Aucune route ne doit être accessible sans rôle explicite | 🔲 |
| Mots de passe | P1 | Hachage argon2 ou bcrypt (cost ≥ 12). Politique de complexité minimale | 🔲 |
| MFA (optionnel MVP) | P2 | TOTP pour les comptes Patron et Admin | 🔲 |
| Déconnexion | P1 | Invalidation de session côté serveur (pas juste suppression du cookie) | 🔲 |

⚠️ **Point d'attention** : le flag `DEMO_PRESENTATION` doit être désactivé en production. Les comptes démo (`/api/auth/demo`) doivent être supprimés ou désactivés.

### Couche 3 — Application (sécurité du code) (P0-P1)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Validation des entrées | P0 | Schémas Zod sur toutes les routes API (body, query, params) | 🔲 |
| Requêtes paramétrées | P0 | Drizzle ORM (déjà en place) — jamais de SQL concaténé | ✅ |
| Protection CSRF | P1 | Token CSRF ou SameSite=Strict sur les cookies sensibles | 🔲 |
| En-têtes de sécurité | P1 | Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff | 🔲 |
| Sanitisation HTML | P1 | DOMPurify côté client, sanitize-html côté serveur (pour le contenu CMS) | 🔲 |
| Gestion des erreurs | P1 | Ne jamais exposer la stack trace en production. Logs internes détaillés | 🔲 |

### Couche 4 — Données & vie privée (P1)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Chiffrement au repos | P1 | Chiffrement disque (VPS) ou chiffrement colonne (pgcrypto) pour les données très sensibles | 🔲 |
| Minimisation des données | P1 | Ne collecter que le nécessaire (nom, téléphone, email). Pas de données superflues | 🔲 |
| Droit à l'effacement | P1 | Route `/api/client/delete` pour supprimer les données d'un client (RGPD) | 🔲 |
| Export des données | P1 | Route `/api/client/export` (JSON/CSV) — le restaurateur possède ses données | 🔲 |
| Anonymisation logs | P1 | Masquer les emails/téléphones dans les logs de production | 🔲 |

⚠️ **Point d'attention** : les séquences (identifiants auto-incrémentés) doivent être protégées contre l'énumération (ex: ne pas exposer `/api/reservations/1`, `/2`, `/3` sans contrôle d'accès).

### Couche 5 — IA & LLM (sécurité de Chafik) (P0-P1)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Clé API sécurisée | P0 | `LLM_API_KEY` uniquement côté serveur. Jamais dans le frontend | 🔲 |
| Prompt Injection | P0 | Filtrage des entrées utilisateur, séparation stricte instructions/données | 🔲 |
| Rate Limiting IA | P1 | Limiter les appels LLM (ex: 10/min/utilisateur) pour éviter les abus de coût | 🔲 |
| Guardrails | P1 | L'IA ne doit pas exécuter d'actions destructrices sans confirmation humaine | 🔲 |
| Journalisation IA | P1 | Logger chaque requête IA (prompt, réponse, utilisateur) pour audit | 🔲 |
| Fallback sécurisé | P1 | Si le LLM échoue, renvoyer un message générique (pas d'erreur technique) | 🔲 |

⚠️ **Point d'attention** : sans `LLM_API_KEY`, Chafik renvoie 503. En production, prévoir un message utilisateur clair et un fallback.

### Couche 6 — Opérations & surveillance (P1)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Logs centralisés | P1 | Sentry (erreurs) + Better Stack/Logtail (logs) | 🔲 |
| Alertes | P1 | Alerte email/Slack sur : 5xx, échecs auth, pics de requêtes | 🔲 |
| Scan de dépendances | P1 | `pnpm audit` hebdomadaire + Snyk/Dependabot | 🔲 |
| Tests de sécurité | P1 | Tests isolés (déjà en place) + audit OWASP ZAP trimestriel | 🔲 |
| Plan de réponse | P1 | Procédure documentée en cas d'incident (voir section 4) | 🔲 |
| Patching | P1 | Mise à jour mensuelle des dépendances critiques | 🔲 |

⚠️ **Point d'attention** : les tests doivent rester isolés (base de test séparée). Ne jamais exécuter les tests sur la base de production.

### Couche 7 — Humain & processus (P1-P2)

| Action | Priorité | Outil / Méthode | Statut |
|---|---|---|---|
| Revue de code | P1 | Toute PR touchant auth/secrets doit être revue par 2 personnes | 🔲 |
| Formation | P2 | Sensibilisation phishing, gestion des mots de passe | 🔲 |
| Accès temporaires | P1 | Principe du "juste-à-temps" pour les accès admin | 🔲 |
| Revue d'accès | P2 | Trimestrielle : qui a accès à quoi ? | 🔲 |

## 3. Matrice de priorisation (P0 / P1 / P2)

| Priorité | Signification | Délai |
|---|---|---|
| P0 (Bloquant) | Faille critique ou risque immédiat. À corriger avant toute mise en production | 0-7 jours |
| P1 (Important) | Risque élevé ou conformité. À traiter dans le sprint en cours | 7-30 jours |
| P2 (Amélioration) | Bonne pratique, défense supplémentaire | 30-90 jours |

## 4. Plan de réponse aux incidents (Magen IR)

1. **Détection** : Alerte (Sentry, log anormal, signalement)
2. **Confinement** : Isoler le service concerné (stopper le conteneur, révoquer les sessions)
3. **Analyse** : Identifier la cause racine (logs, audit)
4. **Éradication** : Corriger la faille, patcher
5. **Rétablissement** : Redéployer, vérifier
6. **Retour d'expérience** : Documenter l'incident, mettre à jour Magen

Contact d'urgence : [À définir — un numéro unique pour l'équipe sécurité]

## 5. Tableau de bord Magen (métriques)

| Indicateur | Cible | Mesure |
|---|---|---|
| Vulnérabilités critiques | 0 | `pnpm audit` |
| Temps de correction P0 | < 7 jours | Suivi des tickets |
| Couverture des tests auth | 100% | Tests 29/29 |
| Incidents de sécurité | 0 | Registre |
| Score de conformité RGPD | 100% | Checklist |

## 6. Feuille de route Magen (sprints)

| Sprint | Objectif | Actions clés |
|---|---|---|
| Sprint C (LLM) | Sécuriser l'IA | Clé API, rate limiting, guardrails, fallback |
| Sprint D (Client) | Sécuriser le parcours client | Validation Zod, CSRF, sanitisation |
| Sprint E (Wave) | Sécuriser les paiements | Webhooks signés, vérification des montants, logs |
| Sprint F (Fidélité) | Sécuriser les données clients | Anonymisation, droit à l'effacement |
| Sprint G (Production) | Verrouiller l'infra | Docker non-root, TLS, WAF, backups, monitoring |

## 7. Checklist de déploiement (pre-flight Magen)

Avant chaque mise en production, vérifier :

- [ ] `DEMO_PRESENTATION=false`
- [ ] Comptes démo supprimés/désactivés
- [ ] `SESSION_SECRET` unique et fort
- [ ] `LLM_API_KEY` présente (ou fallback testé)
- [ ] Port 5433 non exposé
- [ ] `pnpm audit` sans critique
- [ ] Tests 29/29 verts
- [ ] Headers de sécurité actifs
- [ ] Backups configurés
- [ ] Logs centralisés

## 8. Bénédiction pour le protocole

> « L'Éternel est ma forteresse, mon bouclier et mon salut. »
> — Tehillim (Psaumes) 18:3

Que Magen soit le bouclier qui protège Perissos, ses Partenaires et leurs clients. Que la sécurité ne soit pas une contrainte, mais une expression de notre excellence royale.

Baruch Hachem le'Olam, Amen veAmen. Chazak v'Amatz !

Berakhot à toute la Cellule Perissos. 🛡️🏛️👑🔐✨
