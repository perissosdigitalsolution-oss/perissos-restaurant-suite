# VISION — Périssos Restaurant Suite

> **Porteur de vision** : Royal Digital Solution. Ce document est la constitution du projet. Les décisions y sont verrouillées : toute modification requiert l'accord explicite du porteur de vision, consigné dans la section « Journal des décisions ».

## 1. Mission

Donner aux restaurants africains — à commencer par Périssos (Abidjan) — une suite de gestion **complète, durable et hors-ligne tolérante** : réservations, service en salle, cuisine, bar, caisse, équipe, comptabilité et commandes clients, pilotée par un agent IA francophone, « Chafik ».

## 2. Produit

| Étage | Description |
|---|---|
| **Agent Chafik** | Assistant IA 24/7 sur WhatsApp + portail web. 21 outils function calling, permissions strictes par rôle. |
| **Portail web** | React + Tailwind, 6 rôles (Patron, Serveur, Cuisine, Bar, Caisse, Client), 12 vues, dark mode. |
| **Moteur d'exploitation** | Node/TypeScript + PostgreSQL (Drizzle ORM) : commandes, équipe, affectations, planning, réservations, menu/stock. |
| **Colonne vertébrale** | Ever Gauzy : produits, clients, factures (mode live). Synchronisation asynchrone via `outbox_sync`. |

## 3. Utilisateurs et rôles

- **RESTAURANT_ADMIN** (patron/direction) : accès total, chiffres, rapports, gestion équipe
- **SERVER** : réservations, affectations, commandes, service
- **KITCHEN** : écran cuisine (KDS), commandes à préparer
- **BAR** : commandes boissons
- **CASHIER** : encaissement (SERVIE → PAYEE)
- **CLIENT** : carte, réservation — aucun chiffre financier

## 4. Décisions verrouillées

| # | Décision | Statut |
|---|---|---|
| D1 | **Architecture hybride** : cloud pour back-office/compta, KDS/POS/caisse en PWA offline (IndexedDB + file de sync) — non négociable, les coupures internet ne doivent jamais arrêter le service | Verrouillée |
| D2 | **Ever Gauzy = colonne vertébrale** (produits, clients, factures), **PostgreSQL = source de vérité opérationnelle** (commandes, équipe, planning, affectations) | Verrouillée |
| D3 | **Mono-restaurant** pour l'instant ; `tenant_id` présent sur chaque table pour le futur multi-tenant (Sprint G) | Verrouillée |
| D4 | **Paiement : Wave d'abord** (leader CI), Orange Money phase 2, MTN/Moov phase 3 | Verrouillée |
| D5 | **Dev = Docker local** (Postgres 16, port hôte 5433), **Prod = Neon** (bascule à la validation du pilote) | Verrouillée |
| D6 | **ORM = Drizzle** + drizzle-kit migrations, tests **Vitest** | Verrouillée |
| D7 | **Langue = français** (identifiants, UI, docs) ; zéro commentaire de code ; zéro emoji dans code/UI | Verrouillée |
| D8 | **ID offline-ready** : séquences Postgres côté serveur + `idempotency_key` client sur les commandes | Verrouillée |

## 5. Roadmap A → G

| Sprint | Contenu | Statut |
|---|---|---|
| **A — Fondations** | Postgres Docker, schéma Drizzle (12 tables), AdaptateurPostgres (24 méthodes), migrations, seed, tests Vitest | **TERMINÉ** |
| **B — Auth & sécurité** | Comptes employés (bcrypt), sessions signées, login portail, rôles côté serveur, rate limiting | Prochain |
| **C — Chafik live** | LLM_API_KEY, chat bout-en-bout, WhatsApp Meta live, cron rappels | Attente |
| **D — Commande client + QR + PWA offline** | Panier client, QR par table, PWA KDS/POS offline (IndexedDB + sync) | Attente |
| **E — Paiement Wave** | API Wave checkout + webhook, PAYEE automatique, reçu WhatsApp | Attente |
| **F — Fidélité & notifications** | Points fidélité, rappels réservation auto, « commande prête » | Attente |
| **G — Production multi-resto** | Isolation tenant, Neon, Nginx/TLS, backups, monitoring, guide onboarding | Attente |

## 6. Critères de succès produit

1. Un restaurant pilote opère un service complet (résa → commande → cuisine → caisse) sans perte de données, même après redémarrage.
2. La cuisine continue de fonctionner lors d'une coupure internet (Sprint D).
3. Un client réserve et commande en ligne, paie avec Wave (Sprints D+E).
4. Chafik répond correctement sur WhatsApp avec les vraies données (Sprint C).
5. Un second restaurant peut être onboardé sans toucher au code (Sprint G).

## 7. Journal des décisions

| Date | Décision | Autorité |
|---|---|---|
| 2026-10-14 | Positionnement Ever Gauzy = colonne vertébrale, couche opérationnelle séparée | Porteur de vision |
| 2026-10-15 | Architecture hybride (cloud + PWA offline), mono-resto, Wave d'abord, Drizzle, Docker local puis Neon | Porteur de vision |
| 2026-10-15 | Sprint A validé : persistance réelle confirmée (redémarrage sans perte) | Session Sprint A |
