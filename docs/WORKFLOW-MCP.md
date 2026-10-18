# WORKFLOW-MCP — Réplication de thèmes de référence via MCP

> **Objectif** : documenter comment utiliser les MCPs disponibles pour capturer un site de référence (ex. ThemeForest « Grand Restaurant »), en extraire les styles et produire un thème Perissos réutilisable. Ce workflow est la base de la croissance du marché de thèmes.

## 1. MCPs impliqués

| MCP | Rôle | Statut |
|---|---|---|
| **puppeteer** (`@hisma/server-puppeteer`) | Navigation, screenshot, extraction HTML/CSS d'un site de référence | Installé |
| **browser** (Playwright, `@playwright/mcp`) | Alternative pour sites dynamiques (SPA) | Installé |
| **images** (mcpollinations) | Génération d'images pour les placeholders des thèmes | Installé |
| **pdf** (mcp-pdf) | Lecture de PDF de référence (ex. maquettes client) | Installé |

## 2. Workflow de réplication d'un thème

### Étape 1 — Capturer le site de référence

Utiliser puppeteer pour naviguer vers le site de référence et capturer :

```
1. puppeteer_navigate → URL du site de référence (ex. preview ThemeForest)
2. puppeteer_screenshot → capture pleine page (desktop + mobile)
3. puppeteer_evaluate → extraire le HTML complet : document.documentElement.outerHTML
4. puppeteer_evaluate → extraire les styles calculés : getComputedStyle sur les éléments clés
```

**Règle** : ne jamais copier le code source tiers. On s'inspire de la **structure visuelle** (layout, couleurs, typographie, espacement) et on réécrit en propre.

### Étape 2 — Analyser et extraire les tokens de design

Depuis le HTML/CSS capturé, identifier :

| Token | Exemple d'extraction |
|---|---|
| Couleurs primaires | `getComputedStyle(element).backgroundColor` → `#064E3B` |
| Polices | `getComputedStyle(element).fontFamily` → `Fraunces, serif` |
| Tailles de police | `getComputedStyle(h1).fontSize` → `3rem` |
| Espacements | `getComputedStyle(section).padding` → `4rem 2rem` |
| Layout | Structure des sections (hero, menu grid, footer) |
| Images | URLs des images de référence (pour inspiration, pas de copie) |

### Étape 3 — Créer le thème Perissos

1. Créer le dossier `web/themes/{id}/`
2. Écrire `theme.json` avec les métadonnées et les couleurs par défaut
3. Écrire `index.html` avec :
   - Les styles extraits (réécrits, pas copiés)
   - Les placeholders Perissos (`{{restaurant.nom}}`, `{{menu}}`, `{{couleurs.primaire}}`, etc.)
   - La structure visuelle de référence
4. Enregistrer en base via `POST /api/site/themes/import` ou `src/db/seed-themes.ts`

### Étape 4 — Tester et publier

1. `npm run db:seed-themes` (ou import via API)
2. Vérifier dans le marché (`GET /api/site/themes`)
3. Tester le rendu avec `PUT /api/site` + `POST /api/site/publier`
4. Vérifier le site public (`GET /site/:slug`)
5. Valider le responsive (mobile + desktop)

## 3. Exemple concret : réplication « Grand Restaurant » (ThemeForest)

### Référence
URL : https://preview.themeforest.net/item/grand-restaurant-restaurant-cafe-theme/full_screen_preview/11812117

### Étapes MCP

```
1. puppeteer_navigate → URL de preview ThemeForest
2. puppeteer_screenshot (desktop 1440x900) → capture hero + menu + footer
3. puppeteer_screenshot (mobile 375x812) → capture responsive
4. puppeteer_evaluate → extraire structure HTML
5. Analyser les couleurs/polices/layout depuis le screenshot + HTML
6. Créer web/themes/grand-restaurant/theme.json + index.html
7. Seed → tester → publier
```

### Règles de réplication

- **Inspiration, pas copie** : on réécrit le CSS en propre, on ne copie pas le code source
- **Placeholders Perissos** : tout texte dynamique utilise `{{restaurant.nom}}`, `{{menu}}`, etc.
- **Variables CSS** : les couleurs sont des variables CSS (`--primaire`, `--secondaire`) pour la personnalisation
- **Responsive** : media queries pour mobile
- **Performance** : pas de JS lourd, pas de frameworks, HTML/CSS pur

## 4. Checklist de qualité d'un thème

- [ ] `theme.json` complet (id, nom, description, auteur, version, categorie, previewUrl, couleurs, polices)
- [ ] `index.html` avec placeholders Perissos corrects
- [ ] Variables CSS pour toutes les couleurs personnalisables
- [ ] Responsive (mobile + desktop)
- [ ] Chargement rapide (< 2s en 3G)
- [ ] Pas de dépendance externe lourde (pas de jQuery, pas de Bootstrap)
- [ ] Polices via Google Fonts (preconnect)
- [ ] Testé avec `PUT /api/site` + `POST /api/site/publier` → rendu correct
- [ ] Site public accessible sur `/site/:slug` avec le menu du restaurant

## 5. Gouvernance des thèmes

- Les thèmes sont versionnés (champ `version` dans `theme.json`)
- Un thème peut être désactivé (`actif = false`) sans suppression
- L'import de thème est réservé au patron (route protégée)
- Les thèmes importés ont `auteur: "Importé"` pour les distinguer des thèmes officiels
- Le marché affiche tous les thèmes actifs, triés par catégorie

## 6. Évolution future

- **Thème builder visuel** : drag-and-drop de sections (hors scope pilote)
- **Thèmes premium** : thèmes payants pour les formules Pro/Premium
- **A/B testing** : comparer deux thèmes sur le même restaurant
- **Analytics** : nombre de visites par thème, taux de conversion réservation
MDEOF
echo "WORKFLOW-MCP écrit"