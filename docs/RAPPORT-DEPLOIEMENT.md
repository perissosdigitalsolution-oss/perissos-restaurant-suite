# RAPPORT DE DÉPLOIEMENT — Périssos Restaurant Suite

> **Date de rédaction** : 2026-10-16
> **Version** : Sprint H (site web public + CMS thèmes) — état de référence complet
> **Statut** : Prêt pour pilote (formule Essentiel/Pro, 1 établissement)
> **Portail** : http://localhost:4040 · **Site public** : http://localhost:4040/site/perissos

---

## 1. Environnement technique

| Composant | Version / État |
|---|---|
| Node.js | v24.11.0 |
| PostgreSQL | 16-alpine (Docker, port hôte 5433) |
| ORM | Drizzle 0.45.4 + drizzle-kit 0.31 |
| Frontend | React 18 + Vite 5 + Tailwind 3 (264 Ko JS gzippé) |
| Tests | Vitest 2.1.9 — 29/29 verts |
| Typecheck | `npx tsc --noEmit` → 0 erreur |
| Build web | `npm --prefix web run build` → vert |

## 2. Base de données (13 tables)

| Table | Rôle | Lignes seed |
|---|---|---|
| `tables` | Tables du restaurant (10) | 10 |
| `menu` | Carte (14 plats, stocks) | 14 |
| `reservations` | Réservations (statuts CONFIRMEE/ANNULLEE/NO_SHOW) | 206 |
| `factures` | Factures (payee/en_attente) | 159 |
| `employes` | Équipe (patron, serveurs, cuisiniers, barman, caissier) | 7 |
| `commandes` | Commandes de service (statuts EN_ATTENTE→PAYEE) | 3 |
| `commande_lignes` | Lignes de commande (plat, quantité, prix, notes) | 7 |
| `affectations` | Réservation → serveur | 5 |
| `shifts` | Planning d'équipe (postes salle/cuisine/bar/caisse) | 48 |
| `comptes` | Comptes d'accès (email + bcrypt) | 5 |
| `themes` | Marché de thèmes | 3 |
| `theme_fichiers` | Fichiers des thèmes (HTML/CSS/JS) | 6 |
| `sites_restaurant` | Site web publié par restaurant | 1 |
| `outbox_sync` | File de synchronisation Ever Gauzy | 1 (pending) |
| `sync_log` | Journal d'audit de synchronisation | 0 |

## 3. Modules et fonctionnalités

### 3.1 Réservations
- Création/modification/annulation avec vérification de disponibilité en temps réel
- Calcul automatique de la table recommandée (capacité, créneaux)
- No-shows détectés, prévisions d'affluence, clients fidèles
- 206 réservations sur 49 jours (seed démo)

### 3.2 Service en salle
- Prise de commande multi-lignes avec décrément de stock automatique
- Affectation réservation → serveur (répartition manuelle ou via Chafik)
- Charge par serveur (couverts, nombre de tables)
- 5 commandes seedées avec statuts variés (PAYEE, SERVIE, PRETE, EN_CUISINE, EN_ATTENTE)

### 3.3 Cuisine (KDS)
- Écran cuisine 3 colonnes (En attente / En cuisine / Prêtes)
- Auto-refresh 15s, tickets urgents (>25 min)
- Boutons Accepter / Prête par rôle
- Décrément automatique du stock

### 3.4 Bar & Caisse
- Rôles séparés avec transitions strictes
- Bar : EN_ATTENTE → EN_CUISINE → SERVIE
- Caisse : SERVIE → PAYEE
- Encaissement déclenche une entrée dans outbox_sync (facture pending)

### 3.5 Équipe & planning
- 7 employés seedés (patron, 2 serveurs, 2 cuisiniers, barman, caissier)
- Ajout de membres via le portail (génère EMP-XX)
- Planning sur 7 jours avec shifts par poste (salle/cuisine/bar/caisse)
- Charge par serveur (couverts en cours)

### 3.6 Authentification
- Login email/mot de passe (bcrypt, 10 rounds)
- Sessions signées HMAC-SHA256, cookie httpOnly 12h
- 5 comptes démo (mdp `demo1234`)
- Rate limiting : 8 tentatives / 60s → 429
- En-têtes sécurité : nosniff, DENY, Referrer-Policy, Permissions-Policy
- Rôle dérivé de la fonction employé (patron→ADMIN, serveur→SERVER, etc.)
- Auto-protection : impossible de désactiver son propre compte
- Jetons sans état (déconnexion = effacement cookie)

### 3.7 Comptabilité
- Rapport financier : CA semaine/jour, top plats, alertes stock, ruptures
- Prévisions d'affluence, no-shows, clients fidèles
- Bloc `service` dans le rapport : commandes par statut, montant en cours, réservations sans serveur
- 159 factures seedées

### 3.8 Site web public (CMS thèmes)
- 3 thèmes : Simple, Élégant, Moderne
- Personnalisation : couleurs, slug, photo hero
- Publication → URL publique `/site/:slug`
- Menu du restaurant rendu dynamiquement (14 plats)
- Import de thème custom (patron only)
- 403 pour les non-patrons, 404 pour les slugs inconnus

### 3.9 Agent Chafik (IA)
- 21 outils function calling avec permissions par rôle
- 29 tests (13 adaptateur + 11 auth + 5 agent)
- Chat 503 sans LLM_API_KEY (message clair)
- Invite système avec profils par rôle (patron, serveur, cuisine, bar, caisse, client)
- WhatsApp webhook prêt (signature vérifiée, sessions)

## 4. Matrice d'accès par rôle (vérifiée par curl)

| Route | Patron | Serveur | Cuisine | Bar | Caisse | Invité |
|---|---|---|---|---|---|---|
| `/api/restaurant` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (résas masquées) |
| `/api/rapport` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/equipe` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/commandes` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/planning` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/affectations` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/clients` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/site` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/site/themes` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/comptes` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/menu` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chat` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (503 sans clé) |
| `/site/:slug` | ✅ (public) | ✅ (public) | ✅ (public) | ✅ (public) | ✅ (public) | ✅ (public) |

## 5. Comptes démo (mot de passe `demo1234`)

| Email | Nom | Fonction | Rôle portail |
|---|---|---|---|
| amadou.ba@perissos.ci | Amadou Ba | patron | RESTAURANT_ADMIN |
| awa.kone@perissos.ci | Awa Koné | serveur | SERVER |
| mariam.toure@perissos.ci | Mariam Touré | cuisinier | KITCHEN |
| bintou.sanogo@perissos.ci | Bintou Sanogo | barman | BAR |
| serge.kouadio@perissos.ci | Serge Kouadio | caissier | CASHIER |

## 6. Liens de test

| Lien | Description |
|---|---|
| http://localhost:4040/ | Backoffice (écran de connexion) |
| http://localhost:4040/site/perissos | Site public (thème moderne) |
| http://localhost:4040/api/site/themes | Marché de thèmes (patron) |
| http://localhost:4040/api/auth/demo | Accès démo par profil (flag ON) |

## 7. Points d'attention production

1. **Docker Desktop** doit être lancé avant le portail (sinon 500 sur les routes DB)
2. **`SESSION_SECRET`** : valeur par défaut dev — à changer en production
3. **`DEMO_PRESENTATION`** : mettre à vide en production (désactive les routes démo)
4. **Comptes démo** : ne pas seeder en production (mdp `demo1234`)
5. **`LLM_API_KEY`** : nécessaire pour activer Chafik (chat + outils IA)
6. **Port 5433** : le 5432 est occupé par un conteneur `db` postgres:17 étranger — ne pas y toucher
7. **Tests isolés** : `npm test` utilise la base `perissos_restaurant_test` — ne jamais pointer les tests vers la base de dev
8. **Séquences** : après tout seed direct d'IDs, resynchroniser avec `setval` (voir `src/db/seed.ts`)

## 8. Prochaines étapes recommandées

1. **Sprint C — F-C01 complétion** : remplir `LLM_API_KEY` (+ `CLOUDFLARE_ACCOUNT_ID`) → Chafik prend vie
2. **Sprint D** : commande client en ligne + QR par table + PWA offline
3. **F-C02** : cron rappels WhatsApp (24h avant)
4. **Sprint E** : paiement Wave
5. **Sprint F** : points fidélité + notifications
6. **Sprint G** : production multi-resto (Neon, Nginx, TLS, backups)
