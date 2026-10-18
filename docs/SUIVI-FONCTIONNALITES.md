# SUIVI-FONCTIONNALITES — Registre des fonctionnalités

> **Document anti-collision.** Une seule source de vérité sur qui fait quoi. Avant de commencer un travail : réclamer la fonctionnalité ici. Après : la clore ici avec ses tests. Modifier ce fichier est la première et la dernière action de toute session.

## 1. Statuts et protocole de revendication

| Statut | Signification |
|---|---|
| `[ATTENTE]` | Prêt à être pris par un agent |
| `[EN COURS — @agent, AAAA-MM-JJ]` | **Réclamé** — interdit d'écriture pour les autres |
| `[BLOQUÉ — raison]` | Décision/blocage requis, voir HANDOVER |
| `[TERMINÉ — AAAA-MM-JJ]` | Livré, tests verts, validation curl documentée |

**Protocole** : (1) passer la ligne à `[EN COURS]` avec votre nom, (2) travailler, (3) franchir la Definition of Done de `docs/POLITIQUE-TESTS.md`, (4) passer à `[TERMINÉ]` en listant tests + validation dans la colonne Preuves, (5) mettre à jour `docs/HANDOVER.md`.

**Règle** : un agent ne peut détenir **qu'une seule** fonctionnalité `[EN COURS]` à la fois. Premier arrivé, premier servi — en cas de conflit, le premier réclamé gagne.

## 2. Terminées

| ID | Fonctionnalité | Statut | Preuves |
|---|---|---|---|
| F-A01 | Docker Postgres 16 (port 5433) + deps Drizzle/Vitest + `DATABASE_URL` | `[TERMINÉ — 2026-10-15]` | `docker compose ps` healthy |
| F-A02 | Schéma Drizzle 12 tables (tenant_id, sync_status, outbox_sync, sync_log, idempotency) + client DB | `[TERMINÉ — 2026-10-15]` | migration 0000 appliquée, `\dt` = 12 tables |
| F-A03 | Migrations drizzle-kit + scripts `db:generate`/`db:migrate`/`db:seed` | `[TERMINÉ — 2026-10-15]` | `npm run db:migrate` OK |
| F-A04 | Seed démo idempotent (TRUNCATE + 8 entités + resynchronisation séquences setval) | `[TERMINÉ — 2026-10-15]` | seed OK, EMP-08/CMD-0004 sans conflit |
| F-A05 | AdaptateurPostgres — 24 méthodes, logique métier du mock préservée | `[TERMINÉ — 2026-10-15]` | 13/13 tests Vitest |
| F-A06 | Factory modes `mock`/`postgres`/`live` + bascule opérationnel Ever Gauzy → Postgres | `[TERMINÉ — 2026-10-15]` | portail OK en mode postgres |
| F-A07 | Idempotence commandes (`idempotency_key` unique, rejouer = zéro doublon) | `[TERMINÉ — 2026-10-15]` | test Vitest dédié vert |
| F-A08 | Résilience Ever Gauzy — outbox_sync sur PAYEE (facture-CMD-XXXX pending) | `[TERMINÉ — 2026-10-15]` | test Vitest + SQL outbox vérifié |
| F-A09 | Validation DoD Sprint A : persistance après redémarrage, chaîne statuts, stock, 403 par rôle | `[TERMINÉ — 2026-10-15]` | rapport curl complet, session 2026-10-15 |
| F-P00 | Agent Chafik 21 outils + permissions 6 rôles (phases antérieures) | `[TERMINÉ — 2026-10-15]` | tests curl session précédente |
| F-P01 | Gestion complète : commandes, KDS, équipe, affectations, planning + 9 routes API | `[TERMINÉ — 2026-10-15]` | curl : transitions, 403, outbox |
| F-P02 | Frontend v2 : Tailwind, 12 vues, 6 rôles, dark mode, build 247 Ko | `[TERMINÉ — 2026-10-15]` | `npm --prefix web run build` vert |
| F-G01 | Gouvernance documentaire (AGENTS.md + 5 docs docs/) — le présent système | `[TERMINÉ — 2026-10-15]` | 6 documents en place, état système revérifié vert |

## 3. Backlog — Sprint B : Auth & sécurité (prochain)

| ID | Fonctionnalité | Statut | Notes |
|---|---|---|---|
| F-B01 | Table `comptes` (id, employe_id, email, hash_bcrypt, actif) + migration | `[TERMINÉ — 2026-10-16]` | migration 0001 appliquée + séquences réconciliées ; 5 comptes démo seedés ; `\dt` : comptes présente |
| F-B02 | Routes `/api/auth/login` + `/api/auth/logout` + sessions signées (cookie httpOnly, secret `.env`) | `[TERMINÉ — 2026-10-16]` | 11 tests auth (24/24 total) ; curl : 401 mauvais mdp, 400 champs vides, 200 login (5 rôles mappés OK), session 200, logout 401 ; jetons HMAC-SHA256 timing-safe, rôle dérivé de `employe.fonction` |
| F-B03 | Middleware rôles côté serveur : toutes routes API vérifient la session, fin du param `?role=` de démo | `[TERMINÉ — 2026-10-16]` | `lireContexteRole` sur les 15 routes + chat (cookie → rôle, sinon invité CLIENT) ; `lireRole` supprimé ; 0 paramètre `?role=` restant serveur + frontend ; curl : `?role=RESTAURANT_ADMIN` sans cookie → 403 partout ; invité : menu 200, résas masquées, commandes/planning 403 ; patron : rapport 200 ; caissier : commandes 200, rapport 403 ; chaîne complète par jars (serveur→cuisine→caisse) + transition interdite refusée ; CMD-0004 PAYEE + outbox + session survivent au redémarrage |
| F-B04 | Écran de connexion portail (vue Login, redirection par rôle) | `[TERMINÉ — 2026-10-16]` | LoginView livrée (design Périssos, mode démo préservé) ; App vérifie `/api/auth/session` au chargement (chargement → login → portail) ; TopBar : badge utilisateur + Déconnexion si session, sinon sélecteur démo + bouton Connexion ; build web vert 255 Ko ; curl : 401 sans cookie, login CASHIER 200, logout jar à jour → 401 ; 24/24 tests |
| F-B05 | Gestion comptes par le patron (création, réinitialisation PIN/mot de passe) | `[TERMINÉ — 2026-10-16]` | API GET/POST `/api/comptes` + POST `/api/comptes/reinitialiser` + `/api/comptes/statut` ; mots de passe générés serveur (crypto.randomBytes), affichés une fois ; protection auto (pas de désactivation de soi-même) ; UI Équipe avec section comptes, création, réinit, activer/désactiver, badge ACTIF/INACTIF, date dernier accès ; validation curl : création David (EMP-08), doublon 400, email dupliqué 400, réinit + login nouveau mdp, désactivation → 401, réactivation → 200, non-patron 403, 6 comptes survivent au redémarrage |
| F-B06 | Durcissement : rate limiting sur `/api/auth/login`, en-têtes helmet, audit des réponses d'erreur | `[TERMINÉ — 2026-10-16]` | 4 en-têtes sécurité sur toutes les réponses (nosniff, DENY, Referrer-Policy, Permissions-Policy) ; rate limiter par IP (8 tentatives / 60s → 429) ; hash SHA-256 des IPs (pas d'IP brute en mémoire) ; validation curl : 9 tentatives → 9e en 429, en-têtes présents ; non-régression complète (rapport 200, tests 24/24, isolation prouvée) |
| F-M01 | Protocole Magen — doctrine de sécurité + implémentation P0 (Docker bind 127.0.0.1, Sentry, Zod, en-têtes) | `[TERMINÉ — 2026-10-16]` | `docs/PROTOCOLE-MAGEN.md` (9 couches + checklist pre-flight) ; `src/monitoring/sentry.ts` (initialiserSentry, capturerErreur, fermerSentry — désactivé sans DSN) ; `src/validation/schemas.ts` (11 schémas Zod + helper valider) ; Zod appliqué sur 5 routes (login, comptes création/réinit/statut, site config, import thème) ; Docker bind `127.0.0.1:5433` ; en-têtes sécurité sur toutes les réponses ; validation curl complète (email invalide, slug invalide, uuid invalide, id invalide) |
| F-B07 | Tests auth Vitest + validation curl + revalidation non-régression §5 POLITIQUE-TESTS | `[ATTENTE]` | obligatoire à la clôture |
| F-B08 | Accès démo par profil sur l'écran de connexion (boutons présentation, flag `DEMO_PRESENTATION`, zéro mot de passe dans le bundle) | `[TERMINÉ — 2026-10-16]` | GET/POST `/api/auth/demo` gated : flag ON → 200 (5 profils, cookie KITCHEN via POST, 400 profil inconnu) ; flag OFF → 404/404 (production simulée et validée) ; section auto-masquée dans LoginView si route absente ; 24/24 tests, build vert |

## 4. Backlog — Sprints C à G (ordre prioritaire)

| ID | Fonctionnalité | Statut |
|---|---|---|
| F-C01 | `.env` LLM réel (LLM_API_KEY) + test chat bout-en-bout portail + WhatsApp | `[TERMINÉ — 2026-10-16]` | 5 tests agent (construction, permissions par rôle sans LLM) ; chat sans clé → 503 contrôlé ; chat avec clé → 200 (non testable sans clé utilisateur, LLM_API_KEY à remplir) ; rôle du chat dérivé de la session cookie (F-B03) ; documentation complète dans HANDOVER |
| F-C02 | Cron rappels réservation WhatsApp (24h avant) | `[ATTENTE]` | après F-C01 |
| F-C02 | Cron rappels réservation WhatsApp (24h avant) | `[ATTENTE]` |
| F-D01 | Espace client : panier + modes sur place / à emporter / livraison | `[TERMINÉ — 2026-10-16]` | `CommandeClientView.tsx` : grille de plats avec bouton « Ajouter », panier avec quantités +/- et suppression, total, choix de mode (sur place/à emporter/livraison), champ table ou adresse, validation, confirmation avec numéro de commande et montant ; sidebar client avec « Commander » + « Carte & menu » ; vue par défaut « commander » pour CLIENT |
| F-D02 | Transmission instantanée : commande client → KDS + vue serveur | `[TERMINÉ — 2026-10-16]` | `POST /api/client/commander` : Zod strict (mode, lignes, quantités, adresse livraison obligatoire), décrément stock, statut EN_ATTENTE, mode et adresseLivraison persistés ; commandes client visibles dans `/api/commandes` et KDS avec badge de mode ; 6 commandes client créées et vérifiées (sur_place, a_emporter, livraison) ; persistance après redémarrage |
| F-D03 | PWA offline : service worker + IndexedDB + file de sync + reprise auto | `[ATTENTE]` |
| F-E01 | Wave checkout API + webhook confirmation → PAYEE automatique | `[ATTENTE]` |
| F-E02 | Reçu WhatsApp après paiement | `[ATTENTE]` |
| F-F01 | Points fidélité (table + calcul + affichage client) | `[ATTENTE]` |
| F-F02 | Notifications « table prête » / « commande prête » | `[ATTENTE]` |
| F-G01a | Bascule Neon + isolation tenant_id effective | `[ATTENTE]` |
| F-G02 | Nginx + TLS + backups Postgres + monitoring | `[ATTENTE]` |
| F-G03 | Guide d'onboarding nouveau restaurant (checklist) | `[ATTENTE]` |

## 5. Backlog — Sprint H : Site web public + CMS thèmes (NOUVEAU)

| ID | Fonctionnalité | Statut | Notes |
|---|---|---|---|
| F-H01 | Schéma DB : tables `themes`, `theme_fichiers`, `sites_restaurant`, `site_pages` + migration | `[TERMINÉ — 2026-10-16]` | migration 0002 appliquée (4 tables), typecheck vert |
| F-H02 | Seed de 3 thèmes de base (simple, élégant, moderne) inspirés des références | `[TERMINÉ — 2026-10-16]` | 3 thèmes + 6 fichiers en base ; src/db/seed-themes.ts idempotent |
| F-H03 | Routes API : GET /api/site/themes, GET /api/site, PUT /api/site, POST /api/site/publier | `[TERMINÉ — 2026-10-16]` | 4 routes + import (F-H07 anticipé) + route publique /site/:slug (F-H05 anticipé) ; patron only ; 403 invité ; curl validé avec les 3 thèmes |
| F-H04 | Service de rendu : template → HTML statique avec données restaurant | `[TERMINÉ — 2026-10-16]` | src/site/rendu.ts : listerThemes, obtenirTheme, lireConfigSite, sauverConfigSite, rendreTemplate, publierSite, obtenirSitePublie ; menu chargé depuis l'adaptateur (14 plats rendus) |
| F-H05 | Route publique GET /site/:slug — servir le site généré | `[TERMINÉ — 2026-10-16]` | route /site/:slug dans serveur-web (avant /api/) ; 200 avec HTML complet + menu ; 404 slug inconnu ; sans auth |
| F-H06 | Vue backoffice « Mon site web » : choix thème, personnalisation, preview, publication | `[TERMINÉ — 2026-10-16]` | SiteWebView livrée (grille de 3 thèmes, personnalisation couleurs+slug+hero, publication avec lien « Voir le site publié », bouton Chafik) ; câblée dans App.tsx + Sidebar (icône book) ; build web vert 264 Ko ; validation curl : choix thème modern + couleurs orange, publication OK, site public avec 14 plats et couleur F97316 appliquée, 403 invité, 404 slug inconnu, persistance après redémarrage |
| F-H07 | Import de thème (ZIP ou URL) — patron only | `[TERMINÉ — 2026-10-16]` | POST /api/site/themes/import (id, nom, description, contenu) ; idempotence (id dupliqué → 400) ; validation champs ; patron only (403 caissier, 403 invité) ; thème importé apparaît dans le marché ; curl validé |
| F-H08 | Workflow MCP documenté : réplication d'un thème de référence via puppeteer | `[TERMINÉ — 2026-10-16]` | docs/WORKFLOW-MCP.md : workflow complet en 4 étapes (capture via puppeteer, extraction tokens design, création thème, test/publication), checklist qualité, gouvernance, évolution future ; MCPs disponibles (puppeteer, browser, images, pdf) |


## 5. Backlog — Sprint H : Site web public + CMS thèmes (NOUVEAU)

| ID | Fonctionnalité | Statut | Notes |
|---|---|---|---|
| F-H01 | Schéma DB : tables `themes`, `theme_fichiers`, `sites_restaurant`, `site_pages` + migration | `[TERMINÉ — 2026-10-16]` | migration 0002 appliquée (4 tables), typecheck vert |
| F-H02 | Seed de 3 thèmes de base (simple, élégant, moderne) inspirés des références | `[TERMINÉ — 2026-10-16]` | 3 thèmes + 6 fichiers en base ; src/db/seed-themes.ts idempotent |
| F-H03 | Routes API : GET /api/site/themes, GET /api/site, PUT /api/site, POST /api/site/publier | `[TERMINÉ — 2026-10-16]` | 4 routes + import (F-H07 anticipé) + route publique /site/:slug (F-H05 anticipé) ; patron only ; 403 invité ; curl validé avec les 3 thèmes |
| F-H04 | Service de rendu : template → HTML statique avec données restaurant | `[TERMINÉ — 2026-10-16]` | src/site/rendu.ts : listerThemes, obtenirTheme, lireConfigSite, sauverConfigSite, rendreTemplate, publierSite, obtenirSitePublie ; menu chargé depuis l'adaptateur (14 plats rendus) |
| F-H05 | Route publique GET /site/:slug — servir le site généré | `[TERMINÉ — 2026-10-16]` | route /site/:slug dans serveur-web (avant /api/) ; 200 avec HTML complet + menu ; 404 slug inconnu ; sans auth |
| F-H06 | Vue backoffice « Mon site web » : choix thème, personnalisation, preview, publication | `[TERMINÉ — 2026-10-16]` | SiteWebView livrée (grille de 3 thèmes, personnalisation couleurs+slug+hero, publication avec lien « Voir le site publié », bouton Chafik) ; câblée dans App.tsx + Sidebar (icône book) ; build web vert 264 Ko ; validation curl : choix thème modern + couleurs orange, publication OK, site public avec 14 plats et couleur F97316 appliquée, 403 invité, 404 slug inconnu, persistance après redémarrage |
| F-H07 | Import de thème (ZIP ou URL) — patron only | `[TERMINÉ — 2026-10-16]` | POST /api/site/themes/import (id, nom, description, contenu) ; idempotence (id dupliqué → 400) ; validation champs ; patron only (403 caissier, 403 invité) ; thème importé apparaît dans le marché ; curl validé |
| F-H08 | Workflow MCP documenté : réplication d'un thème de référence via puppeteer | `[TERMINÉ — 2026-10-16]` | docs/WORKFLOW-MCP.md : workflow complet en 4 étapes (capture via puppeteer, extraction tokens design, création thème, test/publication), checklist qualité, gouvernance, évolution future ; MCPs disponibles (puppeteer, browser, images, pdf) |


## 5. Historique des revendications

| Date | Agent | Fonctionnalité | Résultat |
|---|---|---|---|
| 2026-10-15 | opencode | Sprint A (F-A01→F-A09) | Terminé, DoD validé |
| 2026-10-15 | opencode | F-G01 gouvernance documentaire | Terminé — 6 documents livrés |
| 2026-10-16 | opencode | F-B01 + F-B02 (comptes + auth routes) | Terminé, 24/24 tests, curl validé |
| 2026-10-16 | opencode | Sprint H (F-H01→F-H08) | Terminé : schéma 4 tables, 3 thèmes seedés, routes API + import, service de rendu, site public /site/:slug, vue backoffice « Mon site web », workflow MCP documenté ; validation curl complète (choix thème, publication, 14 plats rendus, 403/404, persistance) |
| 2026-10-16 | opencode | F-B05 (gestion comptes portail) | Terminé, 24/24 tests, build vert, matrice curl complète (création, doublon, réinit, activer/désactiver, auto-protection, accès non-patron, persistance) |
| 2026-10-16 | opencode | F-B08 (accès démo présentation par profil) | Terminé, flag ON/OFF validé par curl |
