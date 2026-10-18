# ALIGNEMENT-COMMERCIAL — Ce que nous vendons vs ce que nous construisons

> **Document de contrôle.** Compare chaque promesse de la présentation commerciale (`Perissos-Restaurant-Suite-V6.pdf`) et du brief (`BRIEF-AGENT-IA-PERISSOS.md`) avec l'état réel du code. Sert à garantir qu'aucune promesse commerciale ne dépasse ce que le produit peut tenir, et qu'aucune capacité existante n'est oubliée dans la communication.

## 1. Promesse centrale (brief §3)

> « Perissos permet aux restaurants d'Abidjan de gérer leur site web, leurs réservations, leurs commandes, leur CRM et leur comptabilité depuis une seule plateforme — pour 32 000 FCFA/mois au lieu de 200 000 FCFA. »

**Verdict : la promesse est tenable pour les 4 piliers réservation/commandes/CRM/compta, mais le 1er pilier (site web) n'existe pas encore dans le code.** Voir §2.

## 2. Matrice de vérité (slide par slide du PDF V6)

| Slide | Promesse commerciale | État code | Sprint |
|---|---|---|---|
| 03 | Site web & menu (présence en ligne, photos, horaires, avis) | ❌ **Non construit** — pas de site public, pas de vitrine, pas d'avis | **Sprint H (nouveau)** |
| 03 | Réservations & commandes (flux continu, sans commission) | ✅ Backend + portail complet (mock + Postgres) ; ❌ pas de self-service client | Sprint D (D01/D02) |
| 03 | CRM & fidélité (historique, points, offres) | ⚠️ Historique client agrégé (ClientsView) ; ❌ points fidélité non calculés ni affichés | Sprint F (F-F01) |
| 03 | Facturation & IA (factures auto, assistant intelligent) | ⚠️ Table factures + outbox_sync sur PAYEE ; ❌ sync Ever Gauzy non implémenté ; assistant IA testé sans clé | Sprint C (F-C01), sync worker à créer |
| 04 | Site web & menu (menu toujours à jour, photos, avis, visible quartier) | ❌ Non construit | Sprint H |
| 05 | Réservations (calendrier temps réel, 24h/24 smartphone, confirmation WhatsApp/SMS, rappels anti-no-show, aucune commission) | ✅ Backend complet ; ⚠️ rappels WhatsApp non câblés (rappels.ts existe) ; ❌ SMS non intégré | Sprint C (F-C02) + Sprint H (SMS optionnel) |
| 06 | Commande en ligne (rapide en 3G, panier simple, suivi temps réel client) | ❌ Non construit côté client (pas de panier, pas de checkout, pas de suivi) | Sprint D (D01/D02) |
| 07 | Paiement (Wave, Orange Money, MTN, Moov, validation instantanée) | ❌ Seul le statut PAYEE manuel existe | Sprint E (F-E01) |
| 08 | Facturation (stock mis à jour, une seule saisie, commande→facture→écriture comptable) | ⚠️ Stock décrémenté à la commande ; outbox_sync écrit pending ; ❌ écriture comptable réelle (sync Ever Gauzy) non implémentée | Sprint C (sync worker) |
| 09 | CRM & fidélité (historique client, points et offres, assistant IA 24/7) | ⚠️ Historique agrégé ; ❌ points ; assistant IA 503 sans clé | Sprint C + Sprint F |
| 10 | Comparatif (1 plateforme vs 5-7 outils, dès 32 000 FCFA, aucune commission, support local, sans engagement) | ✅ Promesse commerciale cohérente avec l'architecture | — |
| 11 | Engagement (données exportables, basé en CI, sans engagement, technologies ouvertes) | ⚠️ Technologies ouvertes = vrai (Postgres, Drizzle, React) ; ❌ export de données non construit | Sprint H (export CSV) |
| 12 | Vision (100 restos 2026 Abidjan, 1000 en 2027 CI, 10000 en 2028 Afrique francophone) | — | Roadmap |
| 13 | Tarifs Essentiel 32 000 / Pro 65 000 / Premium 130 000 FCFA | ❌ Aucun système de facturation/abonnement/quota | **Sprint H (facturation SaaS)** |
| 13 | Essentiel : 1 étab, ≤3 employés, ≤100 résa/mois, ≤200 commandes/mois, notif WA basiques | ❌ Pas de comptage/quota/limitation | Sprint H |
| 13 | Pro : 1 étab, ≤10 employés, ≤500 résa/mois, ≤1500 commandes/mois, notif WA illimitées, analyses avancées (top plats, marges) | ❌ Pas de comptage ; marges non calculées | Sprint H + Sprint F |
| 13 | Premium : multi-établissements, employés/résas/commandes illimités, POS+KDS offline, IA prédictive avancée, support prioritaire | ❌ Multi-établissement non géré ; KDS offline non implémenté ; IA prédictive = prévisions basiques existantes | Sprint D (PWA offline) + Sprint G + Sprint F |
| 14 | Programme partenaires fondateurs (50 restos, tarif verrouillé à vie, accompagnement, cercle privé, voix dans l'évolution) | — | Commercial/marketing |
| 15 | Résultats attendus (réservations en ligne, commandes directes, fidélité, temps gagné) | ⚠️ En partie (réservations + commandes côté admin) | Sprint D (client self-service) |
| 16 | CTA (WhatsApp, email, site) | — | Marketing |

## 3. Synthèse des écarts critiques

### Bloquants pour un « partenaire fondateur » (pilote)

Un restaurant pilote (formule Essentiel ou Pro, 1 établissement) ne peut pas utiliser Perissos aujourd'hui sans ces 4 capacités :

1. **Site web public + menu en ligne** (PDF slide 03-04) — sans ça, le restaurant n'est pas « trouvé sur Google », la promesse principale tombe. **Non construit.**
2. **Commande client en ligne** (PDF slide 06) — le restaurateur doit pouvoir recevoir des commandes sans téléphone. **Non construit côté client.**
3. **Paiement Mobile Money** (PDF slide 07) — Wave/Orange Money/MTN/Moov. **Non construit.**
4. **Confirmations et rappels WhatsApp/SMS aux clients** (PDF slide 05) — `rappels.ts` existe mais pas de cron câblé, pas de SMS.

### Importants mais non bloquants pour le pilote

5. **Points de fidélité calculés et affichés** (PDF slide 09)
6. **Facturation synchronisée avec Ever Gauzy** (PDF slide 08)
7. **Avis clients intégrés** (PDF slide 04)
8. **Export de données** (PDF slide 11)

### Réservés aux formules supérieures (Premium / Pro)

9. **POS + KDS offline** (PDF slide 13, Premium) — notre plan Sprint D le met pour tous. **Décision requise** : gated par tier ou inclus dans tous les plans ?
10. **Multi-établissements** (Premium) — tenant_id présent, gestion non construite
11. **IA prédictive avancée** (Premium) — prévisions basiques existent
12. **Analyses avancées / marges** (Pro) — top plats existent, marges non
13. **SMS** (PDF slide 05) — mentionné mais non prioritaire

## 4. Ce que nous avons déjà et qui est sous-communiqué

Capacités réelles du code **absentes de la présentation V6** — à mettre en avant :

- ✅ **KDS cuisine** avec auto-refresh et tickets urgents (slide 13 le réserve au Premium — à reconsidérer)
- ✅ **Affectation réservation → serveur** avec charge par serveur (slide 05 parle de calendrier mais pas de répartition)
- ✅ **Planning d'équipe** avec shifts par poste (salle/cuisine/bar/caisse)
- ✅ **Assistant IA Chafik** avec 21 outils et permissions par rôle (slide 09 le mentionne, mais pas la profondeur)
- ✅ **6 rôles distincts** (patron, serveur, cuisine, bar, caisse, client)
- ✅ **Mode hors-ligne tolérant** pour les données (persistance Postgres, redémarrage sans perte)
- ✅ **Dark mode, design premium** (non mentionné dans le PDF mais apprécié)
- ✅ **Authentification sécurisée** (bcrypt, sessions signées, rate limiting, en-têtes sécurité)

## 5. Décisions requises (à trancher avec le porteur de vision)

| # | Question | Options | Impact |
|---|---|---|---|
| Q1 | **Site web public** : on le construit (Sprint H) ou on reste sur « présence en ligne = portail admin » ? | A. Construire un site vitrine + menu public (recommandé — c'est la promesse #1) / B. Repositionner la promesse | Si A : +2-3 semaines |
| Q2 | **KDS offline** : inclus dans tous les plans ou réservé au Premium comme promis ? | A. Comme promis (Premium only) — plus simple / B. Inclus partout — plus généreux | Si A : gating à coder |
| Q3 | **Quotas** : appliquer les limites (employés, réservations, commandes/mois) dès le pilote ? | A. Oui (cohérent avec les tarifs) / B. Non au pilote, oui à la mise en prod payante | Si A : comptage à coder |
| Q4 | **SMS** : intégrer un provider (Orange, MTN) en plus de WhatsApp ? | A. WhatsApp seulement au pilote / B. WhatsApp + SMS | Si B : intégration supplémentaire |
| Q5 | **IA prédictive avancée** : que promet-on concrètement au Premium ? | A. Prévisions d'affluence actuelles renommées / B. Modèle réel (météo, historique, événements) | Si B : travail ML |

## 6. Roadmap révisée (alignée sur la proposition commerciale)

### Phase 0 — Pilote (ce que le « partenaire fondateur » doit pouvoir faire)

| Sprint | Contenu | Promesse PDF couverte |
|---|---|---|
| **C (suite)** | LLM_API_KEY + WhatsApp live + cron rappels | Slide 03/05/09 |
| **D** | Espace client + panier + QR par table + **PWA offline KDS/POS** | Slide 06/13 |
| **E** | Paiement Wave (checkout + webhook → PAYEE auto) | Slide 07 |
| **F** | Points fidélité calculés + affichés + notifications | Slide 09/15 |
| **H (nouveau)** | **Site web public + menu en ligne + photos + horaires** | Slide 03/04 |
| **H (nouveau)** | **WhatsApp confirmations clients + rappels anti-no-show** | Slide 05 |
| **H (nouveau)** | Export de données (CSV) | Slide 11 |

### Phase 1 — Monétisation (ce que la vente récurrente exige)

| Sprint | Contenu | Promesse PDF couverte |
|---|---|---|
| **I (nouveau)** | Facturation SaaS : abonnements, quotas par formule, blocage si dépassement | Slide 13 |
| **I (nouveau)** | Multi-établissement (gestion Premium) | Slide 13 |
| **I (nouveau)** | Analyses avancées : top plats + marges | Slide 13 (Pro) |
| **I (nouveau)** | Sync Ever Gauzy (factures auto) | Slide 08 |

### Phase 2 — Premium (ce qui justifie 130 000 FCFA)

| Sprint | Contenu | Promesse PDF couverte |
|---|---|---|
| **J (nouveau)** | POS + KDS offline (gated Premium) | Slide 13 |
| **J (nouveau)** | IA prédictive avancée (météo + historique + événements) | Slide 13 |
| **J (nouveau)** | Avis clients intégrés | Slide 04 |
| **J (nouveau)** | SMS (Orange/MTN) en plus de WhatsApp | Slide 05 |

## 7. Verdict

**Nous sommes sur la bonne proposition pour 80 % du produit, mais 20 % manquent encore et ils sont visibles au client** : le site web public et la commande client en ligne sont les deux piliers les plus promis (slides 03-04 et 06) et les deux les moins construits. Si un partenaire fondateur signe cette semaine, il recevra une suite d'administration excellente mais devra attendre Sprint D/H pour offrir la commande en ligne à ses clients.

**Recommandation** : faire du Sprint D + Sprint H (site web public) la priorité absolue après Sprint C, pour que le pilote puisse tenir la promesse « commande en ligne » dans les 4-6 semaines. Les quotas et le multi-établissement peuvent attendre la mise en production payante (Phase 1).

## 8. Éléments à ne jamais promettre tant qu'ils ne sont pas livrés

- ❌ « Site web inclus » — tant que Sprint H n'est pas livré
- ❌ « Commande en ligne » — tant que Sprint D n'est pas livré
- ❌ « Paiement Mobile Money » — tant que Sprint E n'est pas livré
- ❌ « Facturation automatique vers votre comptabilité » — tant que le sync worker n'existe pas
- ❌ « Multi-établissements » — tant que Sprint I n'est pas livré
- ❌ « KDS hors connexion » — tant que Sprint J n'est pas livré (et gated Premium)
- ❌ « IA prédictive avancée » — tant que Sprint J n'est pas livré

La règle du brief (§8, INTERDITS) s'applique : pas de promesses non tenues, pas de faux témoignages.
# VISION CMS — Site web restaurant léger + marché de thèmes

## Objectif
Permettre à chaque restaurant client de disposer d'un **site web public professionnel** (vitrine + menu + réservation + commande) en choisissant un thème dans un marché interne, le tout **géré depuis le backoffice** (portail admin, vue « Mon restaurant ») et **sans dépendance à WordPress/Odoo**.

## Principes
1. **Léger** : pas de CMS monolithique. Le site généré est du HTML/CSS/JS statique servi par le backend existant (serveur-web.ts). Pas de PHP, pas de base de données côté site.
2. **Client-friendly** : le restaurateur choisit un thème, personnalise couleurs/textes/photos, publie — sans toucher au code.
3. **Marché de thèmes** : collection de thèmes (modèles) réutilisables, inspirés de références (ThemeForest, etc.) mais réécrits en propre (pas de copie de code tiers).
4. **Import** : possibilité d'importer un thème depuis un fichier ZIP ou une URL, pour répliquer un style existant.
5. **Géré depuis le backoffice** : tout se fait dans le portail admin (vue « Mon restaurant » étendue ou nouvelle vue « Site web »).

## Architecture proposée

### Modèle de données (nouvelles tables)
- `themes` : id, nom, description, auteur, version, preview_url, categorie (restaurant/cafe/bar/fastfood), actif, cree_le
- `theme_fichiers` : id, theme_id, chemin (ex. "index.html"), contenu (text), type (html/css/js/json/image)
- `sites_restaurant` : id, tenant_id, theme_id, config (jsonb: couleurs, textes, photos, horaires, menu_override), statut (brouillon/publie), url_publique, cree_le, maj_le
- `site_pages` : id, site_id, slug (ex. "menu", "reservation"), theme_fichier_id, ordre

### Routes API (nouvelles)
- GET  /api/site/themes — liste des thèmes disponibles (marché)
- GET  /api/site/themes/:id/preview — HTML de prévisualisation
- POST /api/site/themes/import — importer un thème (ZIP ou URL) — patron only
- GET  /api/site — config du site du restaurant courant
- PUT  /api/site — mettre à jour config (thème, couleurs, textes, photos)
- POST /api/site/publier — publier le site (génère les fichiers statiques)
- GET  /site/:slug — servir le site public (route publique, sans auth)

### Thème = package
Chaque thème est un dossier avec :
- `theme.json` : métadonnées (nom, description, preview, couleurs par défaut, polices)
- `index.html` : template principal avec placeholders ({{restaurant.nom}}, {{menu}}, {{photos}}, etc.)
- `style.css` : styles (variables CSS pour personnalisation)
- `assets/` : images par défaut

Les placeholders sont remplacés côté serveur par les données du restaurant (nom, menu, photos, horaires, réservation).

### MCPs pour la réplication de thèmes
- **puppeteer** (déjà installé) : screenshot + extraction HTML/CSS d'un site de référence
- **browser** (playwright, déjà installé) : navigation + capture
- **images** (mcpollinations) : génération d'images pour les placeholders

### Workflow de création d'un thème
1. L'agent (ou l'humain) utilise puppeteer pour capturer un site de référence (HTML/CSS/screenshot)
2. Extraction des styles (couleurs, polices, layout) et conversion en template avec placeholders
3. Création du `theme.json` + fichiers dans `web/themes/`
4. Enregistrement en base (table themes)
5. Disponible dans le marché pour tous les restaurants

### Workflow client
1. Le patron se connecte → vue « Mon site web »
2. Choisit un thème dans le marché (grille avec preview)
3. Personnalise : couleurs, polices, textes, photos, horaires
4. Prévisualise (iframe avec le site généré)
5. Publie → URL publique (ex. perissos.digital/restaurant-nom)
6. Le site est servi statiquement, mis à jour à chaque modification

## Sprint proposé : Sprint H — Site web public + CMS thèmes

| ID | Fonctionnalité | Statut |
|---|---|---|
| F-H01 | Schéma DB : tables themes, theme_fichiers, sites_restaurant, site_pages + migration | [ATTENTE] |
| F-H02 | Seed de 3 thèmes de base (simple, élégant, moderne) inspirés des références | [ATTENTE] |
| F-H03 | Routes API : GET /api/site/themes, GET /api/site, PUT /api/site, POST /api/site/publier | [ATTENTE] |
| F-H04 | Service de rendu : template → HTML statique avec données restaurant | [ATTENTE] |
| F-H05 | Route publique GET /site/:slug — servir le site généré | [ATTENTE] |
| F-H06 | Vue backoffice « Mon site web » : choix thème, personnalisation, preview, publication | [ATTENTE] |
| F-H07 | Import de thème (ZIP ou URL) — patron only | [ATTENTE] |
| F-H08 | MCP workflow documenté : réplication d'un thème de référence via puppeteer | [ATTENTE] |

## Référence visuelle
- ThemeForest « Grand Restaurant » : https://preview.themeforest.net/item/grand-restaurant-restaurant-cafe-theme/full_screen_preview/11812117
- Assets existants : /Users/apple/Desktop/Perissos proposition/assets/ (photos restaurant, plats, équipe)
- Présentation V6 : slide 04 « SITE WEB & MENU » (Trouvé sur Google, choisi grâce aux photos)

## Contraintes
- Léger : pas de WordPress, pas d'Odoo, pas de base de données côté site public
- Le site généré est du HTML/CSS/JS statique, servi par serveur-web.ts
- Les thèmes sont des packages de fichiers (HTML/CSS/JS + theme.json)
- Personnalisation via variables CSS + placeholders remplacés côté serveur
- Pas de copie de code tiers : inspiration visuelle uniquement, réécriture en propre
# VISION CMS — Site web restaurant léger + marché de thèmes

## Objectif
Permettre à chaque restaurant client de disposer d'un **site web public professionnel** (vitrine + menu + réservation + commande) en choisissant un thème dans un marché interne, le tout **géré depuis le backoffice** (portail admin, vue « Mon restaurant ») et **sans dépendance à WordPress/Odoo**.

## Principes
1. **Léger** : pas de CMS monolithique. Le site généré est du HTML/CSS/JS statique servi par le backend existant (serveur-web.ts). Pas de PHP, pas de base de données côté site.
2. **Client-friendly** : le restaurateur choisit un thème, personnalise couleurs/textes/photos, publie — sans toucher au code.
3. **Marché de thèmes** : collection de thèmes (modèles) réutilisables, inspirés de références (ThemeForest, etc.) mais réécrits en propre (pas de copie de code tiers).
4. **Import** : possibilité d'importer un thème depuis un fichier ZIP ou une URL, pour répliquer un style existant.
5. **Géré depuis le backoffice** : tout se fait dans le portail admin (vue « Mon restaurant » étendue ou nouvelle vue « Site web »).

## Architecture proposée

### Modèle de données (nouvelles tables)
- `themes` : id, nom, description, auteur, version, preview_url, categorie (restaurant/cafe/bar/fastfood), actif, cree_le
- `theme_fichiers` : id, theme_id, chemin (ex. "index.html"), contenu (text), type (html/css/js/json/image)
- `sites_restaurant` : id, tenant_id, theme_id, config (jsonb: couleurs, textes, photos, horaires, menu_override), statut (brouillon/publie), url_publique, cree_le, maj_le
- `site_pages` : id, site_id, slug (ex. "menu", "reservation"), theme_fichier_id, ordre

### Routes API (nouvelles)
- GET  /api/site/themes — liste des thèmes disponibles (marché)
- GET  /api/site/themes/:id/preview — HTML de prévisualisation
- POST /api/site/themes/import — importer un thème (ZIP ou URL) — patron only
- GET  /api/site — config du site du restaurant courant
- PUT  /api/site — mettre à jour config (thème, couleurs, textes, photos)
- POST /api/site/publier — publier le site (génère les fichiers statiques)
- GET  /site/:slug — servir le site public (route publique, sans auth)

### Thème = package
Chaque thème est un dossier avec :
- `theme.json` : métadonnées (nom, description, preview, couleurs par défaut, polices)
- `index.html` : template principal avec placeholders ({{restaurant.nom}}, {{menu}}, {{photos}}, etc.)
- `style.css` : styles (variables CSS pour personnalisation)
- `assets/` : images par défaut

Les placeholders sont remplacés côté serveur par les données du restaurant (nom, menu, photos, horaires, réservation).

### MCPs pour la réplication de thèmes
- **puppeteer** (déjà installé) : screenshot + extraction HTML/CSS d'un site de référence
- **browser** (playwright, déjà installé) : navigation + capture
- **images** (mcpollinations) : génération d'images pour les placeholders des thèmes

### Workflow de création d'un thème
1. L'agent (ou l'humain) utilise puppeteer pour capturer un site de référence (HTML/CSS/screenshot)
2. Extraction des styles (couleurs, polices, layout) et conversion en template avec placeholders
3. Création du `theme.json` + fichiers dans `web/themes/`
4. Enregistrement en base (table themes)
5. Disponible dans le marché pour tous les restaurants

### Workflow client
1. Le patron se connecte → vue « Mon site web »
2. Choisit un thème dans le marché (grille avec preview)
3. Personnalise : couleurs, polices, textes, photos, horaires
4. Prévisualise (iframe avec le site généré)
5. Publie → URL publique (ex. perissos.digital/restaurant-nom)
6. Le site est servi statiquement, mis à jour à chaque modification

## Sprint proposé : Sprint H — Site web public + CMS thèmes

| ID | Fonctionnalité | Statut |
|---|---|---|
| F-H01 | Schéma DB : tables themes, theme_fichiers, sites_restaurant, site_pages + migration | [ATTENTE] |
| F-H02 | Seed de 3 thèmes de base (simple, élégant, moderne) inspirés des références | [ATTENTE] |
| F-H03 | Routes API : GET /api/site/themes, GET /api/site, PUT /api/site, POST /api/site/publier | [ATTENTE] |
| F-H04 | Service de rendu : template → HTML statique avec données restaurant | [ATTENTE] |
| F-H05 | Route publique GET /site/:slug — servir le site généré | [ATTENTE] |
| F-H06 | Vue backoffice « Mon site web » : choix thème, personnalisation, preview, publication | [ATTENTE] |
| F-H07 | Import de thème (ZIP ou URL) — patron only | [ATTENTE] |
| F-H08 | Workflow MCP documenté : réplication d'un thème de référence via puppeteer | [ATTENTE] |

## Référence visuelle
- ThemeForest « Grand Restaurant » : https://preview.themeforest.net/item/grand-restaurant-restaurant-cafe-theme/full_screen_preview/11812117
- Assets existants : /Users/apple/Desktop/Perissos proposition/assets/ (photos restaurant, plats, équipe)
- Présentation V6 : slide 04 « SITE WEB & MENU » (Trouvé sur Google, choisi grâce aux photos)

## Contraintes
- Léger : pas de WordPress, pas d'Odoo, pas de base de données côté site public
- Le site généré est du HTML/CSS/JS statique, servi par serveur-web.ts
- Les thèmes sont des packages de fichiers (HTML/CSS/JS + theme.json)
- Personnalisation via variables CSS + placeholders remplacés côté serveur
- Pas de copie de code tiers : inspiration visuelle uniquement, réécriture en propre
