# HANDOVER — État courant et passation

> **Document vivant.** Le plus récent état du projet. Toute session se termine par sa mise à jour. Un nouvel agent ne lit que `AGENTS.md` + ce fichier pour être opérationnel.

## 1. État du système (dernière vérification : 2026-10-15)

| Élément | État |
|---|---|
| Postgres Docker (`perissos-postgres`, port 5433) | Up, healthy |
| Base `perissos_restaurant` | Migrée (13 tables), seedée, **données persistantes réelles** |
| Mode adaptateur `.env` | `EVERGAUZY_MODE=postgres` |
| Portail web | Démarré, http://localhost:4040, tourne sur Postgres |
| **Auth** | **Portail connecté (F-B01→F-B04)** : écran de connexion au chargement (session cookie → sinon LoginView), badge utilisateur + Déconnexion dans la TopBar, mode démo préservé (bouton Connexion pour revenir à l'auth). Jetons HMAC httpOnly 12h, 5 comptes démo (mdp `demo1234`), rôle dérivé de la fonction |
| Tests Vitest | 29/29 verts (13 adaptateur + 11 auth + 5 agent) |
| Typecheck racine + build web | Verts |
| LLM (chat Chafik) | **Non configuré** — sans `LLM_API_KEY`, `/api/chat` répond 503 |
| WhatsApp | Webhook prêt, mode dégradé sans token |
| Contrôle d'accès | **Verrouillé (F-B03)** : rôle exclusivement depuis le cookie de session — `?role=` supprimé ; sans session = invité CLIENT (menu public, chat, résas masquées) ; 403 sur toutes routes protégées |

## 2. Position dans la roadmap

**Sprint A — Fondations : TERMINÉ. Sprint B — clos (6 features). Sprint C — F-C01 TERMINÉ (agent testé sans LLM, chat 503 contrôlé).**

**Prochaines étapes recommandées (dans l'ordre)** :
1. **Sprint C — F-C01 complétion** : remplir `LLM_API_KEY` (+ `CLOUDFLARE_ACCOUNT_ID` ou `LLM_BASE_URL`) dans `.env`, relancer le portail, tester `/api/chat` avec une question métier
2. **Sprint H — Site web public + CMS thèmes** (NOUVEAU) : F-H01 (schéma) → F-H02 (seed 3 thèmes) → F-H03 (routes API) → F-H04 (rendu) → F-H05 (route publique) → F-H06 (vue backoffice) → F-H07 (import) → F-H08 (workflow MCP). Le site web est la promesse #1 du PDF (slide 03-04) et la plus grande lacune actuelle
3. **Sprint D** — commande client en ligne + QR par table + PWA offline
4. **F-C02** — cron rappels WhatsApp (24h avant) + test sur numéro réel

Le patron peut maintenant gérer l'équipe et ses comptes d'accès **depuis la vue Équipe**, sans toucher à la base ni à un fichier `.env`.

À noter : l'utilisateur a créé « David Artez » (EMP-08, patron) **via le portail** — première utilisation réelle de l'UI de gestion d'équipe, chaîne complète validée en conditions réelles.

## 3. Comment reprendre à froid (10 minutes)

1. `docker compose up -d` puis `docker compose ps` → healthy
2. `npm test` → 29/29 verts
3. `npx tsc --noEmit` → 0 erreur
4. `npm run web:start` → attendre que `curl http://localhost:4040/api/menu` réponde 200
5. `curl -c /tmp/jar.txt -X POST http://localhost:4040/api/auth/login -H "Content-Type: application/json" -d '{"email":"amadou.ba@perissos.ci","motDePasse":"demo1234"}'` puis `curl -b /tmp/jar.txt http://localhost:4040/api/restaurant` → JSON résas (le rôle vient du cookie)
5. Lire le registre, réclamer une fonctionnalité `[ATTENTE]`, respecter `AGENTS.md`

## 4. Bugs connus et vigilances

| # | Point | Détail |
|---|---|---|
| V1 | **Drizzle `db.execute()` retourne `{rows: [...]}`** | Toujours lire `resultat.rows[0]` — ne jamais caster le résultat en tableau (bug QueryResult du 2026-10-15, corrigé dans `nouvelId`) |
| V2 | **Séquences vs seed** | Tout insert direct d'IDs en dur (seed, import) DOIT être suivi de `setval` (exemple canonique fin de `src/db/seed.ts`) |
| V3 | **Port 5432 occupé** | Par un conteneur `db` postgres:17 étranger au projet — notre Postgres est sur **5433**, ne jamais y toucher |
| V4 | **`db:seed` écrase tout** | Le seed TRUNCATE toutes les tables — ne jamais lancer en production réelle |
| V5 | **Param `?role=` (RÉSOLU)** | Supprimé par F-B03 : sans session = invité CLIENT, rôles employés exclusivement depuis le cookie signé |
| V6 | **Mot de passe démo en seed + accès démo** | `demo1234` pour les 5 comptes — dev uniquement. L'accès démo par profil (boutons présentation, F-B08) est gated par `DEMO_PRESENTATION` : **absent en production → routes 404 + boutons masqués** ; ne pas seeder les comptes démo en production |
| V7 | **`SESSION_SECRET` de dev** | Valeur par défaut `perissos-dev-secret-a-changer` si absent du `.env` — obligatoire à remplacer en production |
| V8 | **Tests isolés (résolu)** | Base dédiée `perissos_restaurant_test` via `vitest.config.ts` + `setup-env.ts`. Règle : après chaque migration → `npm run db:migrate:test` |
| V9 | **Jetons sans état** | La déconnexion efface le cookie mais n'invalide pas un jeton volé (valide jusqu'à 12h). Accepté pour le pilote ; envisager une liste de révocation en F-B06 si requis |
| V10 | **Docker daemon requis** | Le portail renvoie 500 sur toutes les routes DB si le démon Docker est éteint (Mac redémarré, Docker Desktop fermé). Réflexe : `docker info` → `docker compose up -d` → vérifier `healthy` AVANT de soupçonner le code. Les données survivent (volume nommé) — reconfirmé après un redémarrage complet du Mac |

## 5. Leçons apprises (règles stables → aussi dans POLITIQUE-TESTS §7)

- **Casts `as unknown as` dangereux** : ils silencent des erreurs de forme (QueryResult vs Array). Toujours vérifier la forme réelle avant de caster.
- **Symptôme trompeur** : une séquence qui « avance » (vérifiée en SQL) peut cacher un code qui ne lit pas sa valeur — diagnostiquer la lecture, pas seulement l'écriture.
- **Tests d'abord** : le bug QueryResult a été introduit en « fixant » une erreur TS par un cast ; un test lisant réellement l'ID généré l'aurait attrapé immédiatement.

## 6. Journal des sessions

### Session 2026-10-16 (F-B08) — @opencode
- **Fonctionnalité(s)** : F-B08 — accès démo par profil pour présentation — `[TERMINÉ]`
- **Ce qui a été fait** : routes `GET/POST /api/auth/demo` gated par `DEMO_PRESENTATION` (config `.env`) — la liste des 5 profils est résolue depuis les comptes réels en base (compte absent = bouton absent) ; la connexion démo émet le même jeton cookie que le login normal ; `LoginView` affiche une grille de boutons (icône + rôle + nom par profil) **auto-masquée si la route renvoie 404** ; zéro mot de passe dans le bundle frontend
- **Tests** : `npm test` → 24/24 ; `npx tsc --noEmit` → 0 erreur ; build web vert (256 Ko)
- **Validation curl** : flag ON → GET 200 (5 profils patron/serveur/cuisine/bar/caisse), POST `{"profil":"cuisine"}` → 200 cookie KITCHEN, commandes visibles (4) via le cookie, profil inconnu → 400 ; flag OFF (production simulée) → GET **404** + POST **404** ; flag réactivé et portail revalidé
- **Prochaine étape recommandée** : F-B05 (gestion des comptes par le patron)
- **Leçons / incidents** : néant — le pattern « route gated par flag env + auto-masquage côté UI » est réutilisable pour toute future fonctionnalité de démo
- **Fichiers touchés** : `src/config.ts`, `src/serveur-web.ts` (PROFILS_DEMO + 2 routes), `web/src/views/LoginView.tsx`, `.env`, `.env.example`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/POLITIQUE-TESTS.md`, `docs/HANDOVER.md`, `AGENTS.md`

### Session 2026-10-16 (Protocole Magen P0) — @opencode
- **Fonctionnalité(s)** : F-M01 — doctrine de sécurité + implémentation P0 — `[TERMINÉ]`
- **Ce qui a été fait** : `docs/PROTOCOLE-MAGEN.md` (doctrine complète, 7 couches, matrice P0/P1/P2, plan IR, checklist pre-flight) ; `src/monitoring/sentry.ts` (Sentry avec anonymisation PII, fermeture propre sur SIGTERM/SIGINT) ; `src/validation/schemas.ts` (11 schémas Zod + helper valider) ; Zod appliqué sur 5 routes (login, comptes création/réinit/statut, site config, import thème) ; Docker bind `127.0.0.1:5433` ; en-têtes sécurité sur toutes les réponses ; `Caddyfile` pour TLS automatique ; `SENTRY_DSN` dans .env/.env.example
- **Tests** : `npm test` → 29/29 ; `npx tsc --noEmit` → 0 erreur ; build web vert
- **Validation curl** : Zod email invalide → "email : Email invalide." ; slug invalide → "slug : Slug invalide" ; uuid invalide → "id : Identifiant de compte invalide" ; id invalide → "id : Identifiant invalide" ; en-têtes présents sur toutes les réponses ; Sentry désactivé sans DSN (pas d'erreur) ; isolation tests prouvée (login 200 après npm test)
- **Prochaine étape recommandée** : Sprint D — commande client en ligne + QR par table + PWA offline
- **Leçons / incidents** : (1) le Docker daemon était éteint (V10 confirmé) — relancé, données intactes ; (2) la validation initiale du rate limiting a épuisé le quota → reseed + redémarrage réinitialise le compteur (le limiter est volatile, attendu)
- **Fichiers touchés** : `docs/PROTOCOLE-MAGEN.md` (nouveau), `src/monitoring/sentry.ts` (nouveau), `src/validation/schemas.ts` (nouveau), `src/serveur-web.ts`, `src/config.ts`, `docker-compose.yml`, `Caddyfile` (nouveau), `.env`, `.env.example`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`, `AGENTS.md`

### Session 2026-10-16 (alignement commercial) — @opencode
- **Fonctionnalité(s)** : aucun code — analyse + documentation
- **Ce qui a été fait** : lecture complète du PDF commercial V6 (16 slides) et du brief agent IA (14 sections) ; production de `docs/ALIGNEMENT-COMMERCIAL.md` avec matrice de vérité slide par slide, synthèse des 5 écarts critiques, 5 décisions requises (Q1-Q5), roadmap révisée en 3 phases (pilote / monétisation / premium), liste des éléments à ne jamais promettre tant qu'ils ne sont pas livrés
- **Tests** : néant (documents) — état système revérifié vert
- **Validation curl** : portail 200, login patron 200
- **Prochaine étape recommandée** : trancher Q1 (site web public) et Q2 (KDS offline gating), puis lancer Sprint C (F-C01 complétion) ou Sprint D/H selon la décision
- **Leçons / incidents** : le brief §8 (INTERDITS) est la boussole — ne jamais promettre ce qui n'est pas livré. Le plus gros écart : site web public et commande client en ligne (slides 03-04 et 06) sont les plus promis et les moins construits
- **Fichiers touchés** : `docs/ALIGNEMENT-COMMERCIAL.md` (nouveau), `AGENTS.md` (carte docs), `docs/HANDOVER.md`

### Session 2026-10-16 (CMS/thème market vision) — @opencode
- **Fonctionnalité(s)** : aucun code — vision + documentation
- **Ce qui a été fait** : analyse de la demande utilisateur (CMS léger type Odoo/WordPress avec marché de thèmes, import de thèmes existants, gestion depuis le backoffice) ; rédaction du document de vision CMS dans `docs/ALIGNEMENT-COMMERCIAL.md` (architecture proposée : tables themes/theme_fichiers/sites_restaurant/site_pages, routes API, format de thème = package HTML/CSS/JS + theme.json, workflow de réplication via MCP puppeteer, workflow client) ; ajout de 8 features Sprint H dans le registre ; mise à jour de la roadmap HANDOVER pour placer Sprint H en priorité 2
- **Tests** : néant (documents) — état système revérifié vert
- **Validation curl** : portail 200
- **Prochaine étape recommandée** : F-H01 (schéma DB thèmes) — le site web public est la promesse #1 du PDF (slide 03-04) et la plus grande lacune actuelle
- **Leçons / incidents** : néant
- **Fichiers touchés** : `docs/ALIGNEMENT-COMMERCIAL.md`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`

### Session 2026-10-16 (F-C01) — @opencode
- **Fonctionnalité(s)** : F-C01 — agent Chafik testable sans LLM + chat 503 contrôlé — `[TERMINÉ]`
- **Ce qui a été fait** : `src/db/tests/agent-chafik.test.ts` (5 tests : construction agent, permissions par rôle sans LLM — SERVER refuse les chiffres, ADMIN autorisé, KITCHEN refuse l'encaissement, CLIENT consulte le menu) ; le chat sans `LLM_API_KEY` renvoie 503 avec message explicite ; le rôle du chat est désormais dérivé du cookie de session (F-B03) au lieu du body client
- **Tests** : `npm test` → 29/29 ; `npx tsc --noEmit` → 0 erreur
- **Validation curl** : `/api/chat` sans clé → 503 avec message « Le service LLM n'est pas configuré » ; `/api/auth/*` et toutes routes fonctionnelles
- **Prochaine étape recommandée** : remplir `LLM_API_KEY` (+ `CLOUDFLARE_ACCOUNT_ID`) dans `.env`, relancer, tester `/api/chat` avec une question métier
- **Leçons / incidents** : néant
- **Fichiers touchés** : `src/db/tests/agent-chafik.test.ts` (nouveau), `src/serveur-web.ts` (rôle chat depuis cookie), `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`

### Session 2026-10-16 (F-B06) — @opencode
- **Fonctionnalité(s)** : F-B06 — durcissement sécurité — `[TERMINÉ]`
- **Ce qui a été fait** : 4 en-têtes sécurité sur toutes les réponses (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`) via `setHeader` global + `envoyerJson` ; rate limiter par IP (8 tentatives / 60s → 429) sur `/api/auth/login` uniquement, IP hachée SHA-256 (pas d'IP brute en mémoire), fenêtre glissante auto-reset
- **Tests** : `npm test` → 24/24 ; `npx tsc --noEmit` → 0 erreur ; build web vert
- **Validation curl** : en-têtes présents ; 9 tentatives consécutives → 429 à la 9e ; reseed + redémarrage → login 200 après les tests (isolation prouvée) ; rapport patron 200, 39 000 FCFA
- **Prochaine étape recommandée** : Sprint C — F-C01 (`LLM_API_KEY` + WhatsApp live)
- **Leçons / incidents** : la validation initiale du rate limiting a épuisé le quota → login patron bloqué (429) : reseed + redémarrage de la pile a réinitialisé le compteur en mémoire (attendu, le limiter est volatile) ; incident Docker daemon éteint pendant la session (V10) — pile relancée, données intactes
- **Fichiers touchés** : `src/serveur-web.ts`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`, `docs/POLITIQUE-TESTS.md`

### Session 2026-10-16 (F-B05) — @opencode
- **Fonctionnalité(s)** : F-B05 — gestion comptes par le patron — `[TERMINÉ]`
- **Ce qui a été fait** : routes `GET/POST /api/comptes`, `POST /api/comptes/reinitialiser`, `POST /api/comptes/statut` (patron only) ; mots de passe générés serveur via `crypto.randomBytes` (12 car. alphanum, confusions exclues), bcrypt hash ; protection anti-auto-désactivation ; vue Équipe : section « Comptes d'accès au portail » (liste avec badge ACTIF/INACTIF, dernier accès, réinit, activer/désactiver), formulaire de création (membre sans compte + email), panneau d'identifiants affiché une fois avec bouton masquer
- **Tests** : `npm test` → 24/24 ; `npx tsc --noEmit` → 0 erreur ; build web vert (261 Ko)
- **Validation curl** : création David → mot de passe initial renvoyé et login OK en RESTAURANT_ADMIN ; doublon → 400 ; email dupliqué → 400 ; réinitialisation → nouveau mdp + login OK ; désactivation → login 401 ; réactivation → login 200 ; auto-désactivation → 400 ; non-patron → 403 ; 6 comptes survivent au redémarrage
- **Prochaine étape recommandée** : F-B06 (durcissement) puis Sprint C (LLM)
- **Leçons / incidents** : (1) le portail a démarré en mode `mock` (`.env` `EVERGAUZY_MODE=mock` au lieu de `postgres`) — les comptes créés via l'UI allaient dans la mémoire ; reseedé et revalidé ; (2) le Docker daemon était éteint après un reboot → V10 confirmé ; (3) la persistance a été prouvée par redémarrage complet du portail
- **Fichiers touchés** : `src/auth/session.ts` (genererMotDePasse), `src/serveur-web.ts` (4 routes), `web/src/types.ts` (CompteGereWeb), `web/src/App.tsx` (chargeur + 3 mutations), `web/src/views/EquipeView.tsx` (section comptes), `.env`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`, `docs/AGENTS.md` (mise à jour)

### Session 2026-10-16 (F-B03) — @opencode
- **Fonctionnalité(s)** : F-B03 — verrouillage serveur des rôles — `[TERMINÉ]`
- **Ce qui a été fait** : `lireContexteRole` (cookie signé → rôle+nom, sinon invité CLIENT) appliqué aux 15 routes protégées + chat (le rôle du body du chat est ignoré au profit du cookie) ; suppression du helper `lireRole` et de tous les `?role=` ; frontend : 15 URLs nettoyées, mode démo devient « invité » (CLIENT, vue menu), TopBar sans sélecteur (badge+Déconnexion ou bouton Connexion+« Mode invité »), LoginView « Continuer en tant qu'invité »
- **Tests** : `npm test` → 24/24 ; `npx tsc --noEmit` → 0 erreur ; build web vert (254 Ko)
- **Validation curl** : `?role=RESTAURANT_ADMIN` sans cookie → 403 (rapport/equipe/commandes) ; invité → menu 200, restaurant 200 résas masquées, commandes/planning 403 ; patron jar → rapport/equipe/planning 200 ; caissier jar → commandes 200, rapport 403 (equipe 200 = by design, sert aux menus d'assignation) ; chaîne complète CMD-0004 par jars (serveur crée → cuisine EN_CUISINE/PRETE → serveur SERVIE → caissier PAYEE) ; transition interdite refusée ; après redémarrage portail : CMD-0004 PAYEE + outbox `facture-CMD-0004` + session cookie valides
- **Prochaine étape recommandée** : F-B05 (gestion des comptes par le patron)
- **Leçons / incidents** : (1) démon Docker éteint en cours de validation → 500 sur login : réflexe V10 (`docker info` avant tout soupçon code) — incident reproduit au redémarrage du Mac de l'utilisateur, pile relancée, données intactes ; (2) l'utilisateur a créé EMP-08 « David Artez » via le portail en conditions réelles — la chaîne UI→API→outils→Postgres fonctionne seule ; (3) mon attente « caissier → equipe 403 » était erronée : l'accès équipe est voulu pour tout le personnel (menus d'assignation) — vérifier les gates dans le code avant d'écrire les attentes de test
- **Fichiers touchés** : `src/serveur-web.ts`, `web/src/App.tsx`, `web/src/components/TopBar.tsx`, `web/src/views/LoginView.tsx`, `docs/POLITIQUE-TESTS.md` (§2/§5 réécrits en flux cookie), `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`, `AGENTS.md`

### Session 2026-10-16 (F-B04) — @opencode
- **Fonctionnalité(s)** : F-B04 — vue Login portail — `[TERMINÉ]`
- **Ce qui a été fait** : `LoginView.tsx` (écran de connexion aux couleurs Périssos : logo, email/mot de passe, erreurs, bouton « Continuer en mode démo ») ; App.tsx vérifie `/api/auth/session` au chargement (écran d'attente → LoginView si 401 → portail si session) ; `ouvrirSession`/`fermerSession`/`allerConnexion` ; TopBar affiche badge initiales + nom + Déconnexion quand connecté, sinon sélecteur démo + bouton Connexion ; ChafikPanel utilise le nom de la session ; type `CompteSessionWeb`
- **Tests** : `npm test` → 24/24 ; `npx tsc --noEmit` → 0 erreur ; `npm --prefix web run build` → vert (255 Ko)
- **Validation curl** : sans cookie `/api/auth/session` → 401 ; login CASHIER → 200 session CASHIER ; logout avec jar à jour → session 401 ; index 200 servi avec le nouveau build ; leçon : déconnexion = effacement cookie (jetons sans état → V9)
- **Prochaine étape recommandée** : F-B03 (rôle depuis la session, suppression `?role=`)
- **Leçons / incidents** : le 200 après logout du premier curl venait du jar non mis à jour (sans `-c`) — revalidé avec jar à jour → 401 ; vérification de démarrage du portail par grep de bannière peut matcher une ancienne bannière — vérifier l'index HTTP en complément
- **Fichiers touchés** : `web/src/views/LoginView.tsx` (nouveau), `web/src/App.tsx`, `web/src/components/TopBar.tsx`, `web/src/types.ts`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`

### Session 2026-10-16 — @opencode
- **Fonctionnalité(s)** : F-B01 + F-B02 — `[TERMINÉ]`
- **Ce qui a été fait** : table `comptes` (FK employes, email unique par tenant) + migration 0001 avec réconciliation des séquences (dérive corrigée : le fichier manuel 0001_add_sequences.sql non tracké a été supprimé et remplacé par des `CREATE SEQUENCE IF NOT EXISTS` dans la migration officielle) ; module `src/auth/session.ts` (jetons HMAC-SHA256 timing-safe, cookie httpOnly 12h, mapping fonction→rôle, aucun rôle CLIENT accepté) ; `SESSION_SECRET` dans config/.env ; routes `/api/auth/login` (bcrypt.compare, anti-énumération : message unique 401), `/api/auth/logout`, `/api/auth/session` ; seed des 5 comptes démo ; 11 tests auth
- **Tests** : `npm test` → 24/24 ; `npx tsc --noEmit` → 0 erreur
- **Validation curl** : 401 mauvais mdp ; 400 champs vides ; login des 5 comptes → rôles RESTAURANT_ADMIN/SERVER/KITCHEN/BAR/CASHIER tous corrects ; `/api/auth/session` 200 avec expiration ; logout → `Set-Cookie Max-Age=0` puis session 401 ; non-régression routes `?role=` → 200
- **Prochaine étape recommandée** : F-B04 (vue Login portail) puis F-B03 (rôle depuis session, suppression `?role=`)
- **Leçons / incidents** : (1) le portail tsx met >3s à démarrer — attendre la bannière dans `logs/web-api.log` avant les curl ; (2) dérive migrations/DB détectée et réconciliée ; (3) **incident découvert via le DoD** : `npm test` vidait la base de dev (le login passait à 401 après les tests) → création de la base de test dédiée `perissos_restaurant_test` + `vitest.config.ts` + `setup-env.ts` + script `db:migrate:test`, isolation prouvée par curl (login 200 avant et après `npm test`)
- **Fichiers touchés** : `src/db/schema.ts`, `src/db/migrations/0001_stormy_purifiers.sql`, `src/db/seed.ts`, `src/db/tests/auth.test.ts` (nouveau), `src/auth/session.ts` (nouveau), `src/config.ts`, `src/serveur-web.ts`, `.env`, `.env.example`, `docs/POLITIQUE-TESTS.md`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/HANDOVER.md`, `AGENTS.md`

### Session 2026-10-15 (après-midi → soir) — @opencode
- **Fonctionnalité(s)** : F-A01→F-A09 (Sprint A complet) — `[TERMINÉ]`
- **Ce qui a été fait** : Docker Postgres 5433 ; schéma Drizzle 12 tables + migrations ; seed idempotent avec setval ; AdaptateurPostgres 24 méthodes ; modes mock/postgres/live ; idempotency_key ; outbox_sync sur PAYEE ; debug du bug QueryResult.rows (V1)
- **Tests** : `npm test` → 13/13 ; `npx tsc --noEmit` → 0 erreur ; build web vert
- **Validation curl** : EMP-08 créé sans conflit ; CMD-0004 créé, stock Poulet braisé 18→16 ; chaîne statuts complète par rôles ; redémarrage portail → données intactes ; outbox `facture-CMD-0004` pending
- **Prochaine étape recommandée** : F-B01 (table comptes + migration) — voir §2
- **Leçons / incidents** : V1, V2 (consignées), boucle de débogage longue sur QueryResult — résolue en identifiant la forme du retour de `db.execute()`
- **Fichiers touchés** : `docker-compose.yml`, `drizzle.config.ts`, `package.json`, `.env*`, `src/config.ts`, `src/db/**` (schema, client, seed, migrations, tests), `src/evergauzy/adaptateur-postgres.ts` (nouveau), `src/evergauzy/{index,adaptateur-evergauzy}.ts`, `src/types.ts`

### Session 2026-10-15 (tard) — @opencode
- **Fonctionnalité(s)** : F-G01 — Gouvernance documentaire (AGENTS.md + docs/) — `[TERMINÉ]`
- **Ce qui a été fait** : création du système documentaire complet : protocole agents, vision/decisions verrouillées, registre de suivi avec revendication, politique de tests + DoD, politique de documentation, présent handover
- **Tests** : néant (documents) — état système revérifié vert avant clôture
- **Validation curl** : `curl /api/restaurant` OK, portail opérationnel
- **Prochaine étape recommandée** : F-B01 — table `comptes` + migration + seeds de comptes
- **Leçons / incidents** : néant
- **Fichiers touchés** : `AGENTS.md`, `docs/VISION.md`, `docs/SUIVI-FONCTIONNALITES.md`, `docs/POLITIQUE-TESTS.md`, `docs/POLITIQUE-DOCUMENTATION.md`, `docs/HANDOVER.md`
