# AGENTS.md — Protocole de travail des agents IA

> **LIRE CE FICHIER EN PREMIER.** Tout agent IA (ou humain) intervenant sur ce projet s'engage à respecter ce protocole. Il garantit que plusieurs agents peuvent travailler en parallèle sans se marcher dessus.

## 1. Identité du projet

- **Produit** : Périssos Restaurant Suite — suite de gestion complète pour restaurant (Périssos, Abidjan, Côte d'Ivoire)
- **Agent IA intégré** : « Chafik » — directeur administratif virtuel, function calling sur les données du restaurant
- **Éditeur** : Royal Digital Solution
- **Langue du projet** : français (identifiants, messages, UI, documentation)

## 2. Règles d'or (non négociables)

1. **Lire avant d'agir** : `AGENTS.md` puis `docs/HANDOVER.md` puis `docs/SUIVI-FONCTIONNALITES.md` — dans cet ordre, à chaque session.
2. **Réclamer avant de travailler** : aucune fonctionnalité ne se commence sans être marquée `[EN COURS]` avec le nom de l'agent dans `docs/SUIVI-FONCTIONNALITES.md`. Une fonctionnalité `[EN COURS]` appartenant à un autre agent est **interdite d'accès** en écriture.
3. **Ne jamais casser ce qui fonctionne** : le typecheck (`npx tsc --noEmit`) et les tests (`npm test`) doivent être verts avant de déclarer un travail terminé.
4. **Style de code** : identifiants en français, **zéro commentaire dans le code**, **zéro emoji dans le code et l'UI** (icônes SVG uniquement).
5. **Fin de session = mise à jour des docs** : `docs/HANDOVER.md` (état courant) et `docs/SUIVI-FONCTIONNALITES.md` (statuts) sont mis à jour à la fin de chaque session, sans exception.
6. **Architecture verrouillée** : les décisions de `docs/VISION.md` section « Décisions verrouillées » ne se modifient qu'avec l'accord explicite du porteur de vision (humain responsable).
7. **Zéro secret en clair** : les clés API vivent dans `.env` (jamais commis), `.env.example` ne contient que des noms de variables.

## 3. Carte du code

```
chafik-agent/
├── AGENTS.md                     ← ce fichier (protocole)
├── docs/                         ← gouvernance (vision, suivi, politiques)
├── docker-compose.yml            ← Postgres 16 (port hôte 5433)
├── drizzle.config.ts             ← config migrations
├── .env / .env.example           ← variables d'environnement
├── src/
│   ├── types.ts                  ← domaine complet (types des 24 méthodes adaptateur)
│   ├── config.ts                 ← chargement .env, modes EVERGAUZY_MODE, SESSION_SECRET
│   ├── serveur-web.ts            ← API HTTP du portail (port 4040) + routes /api/auth/*
│   ├── chat.ts / demo.ts         ← CLI de test agent
│   ├── agent/                    ← invite-systeme.ts (prompt Chafik)
│   ├── auth/                     ← session.ts (jetons HMAC, cookies, mapping fonction→rôle)
│   ├── llm/                      ← client LLM compatible OpenAI (Cloudflare)
│   ├── outils/                   ← 21 outils Chafik : definitions, permissions,
│   │                               executeur, gestionnaires
│   ├── evergauzy/                ← adaptateur.ts (interface 24 méthodes),
│   │                               adaptateur-postgres.ts (source de vérité),
│   │                               adaptateur-mock.ts (démo sans DB),
│   │                               adaptateur-evergauzy.ts (backbone live),
│   │                               index.ts (factory), disponibilite.ts
│   ├── db/                       ← schema.ts (Drizzle), client.ts, seed.ts,
│   │                               migrations/, tests/ (Vitest)
│   └── whatsapp/                 ← webhook Meta Cloud API, sessions, rappels
├── web/                          ← frontend React+Vite+Tailwind (12 vues, 5 composants)
└── scripts/                      ← web-start/stop/dev (gestion portail)
```

## 4. Commandes de référence

| Commande | Rôle |
|---|---|
| `docker compose up -d` | démarre Postgres (doit être vert : `healthy`) |
| `npm run db:migrate` | applique les migrations Drizzle (base de dev) |
| `npm run db:migrate:test` | applique les migrations sur la **base de test** `perissos_restaurant_test` — à lancer après toute nouvelle migration |
| `npm run db:seed` | vide + repeuple la base démo (idempotent, resynchronise les séquences) |
| `npm test` | tests Vitest (24 tests : 13 adaptateur Postgres + 11 auth) — **s'exécutent sur la base de test**, jamais sur la dev |
| `npx tsc --noEmit` | typecheck racine — **doit être vert** |
| `npm --prefix web run build` | build frontend (tsc + vite) — **doit être vert** |
| `npm run web:start` / `web:stop` | démarre/arrête le portail sur http://localhost:4040 |
| `npm run web:dev` | dev Vite sur 5173 (proxy /api → 4040) |
| `npm run whatsapp` | webhook WhatsApp (port 3000) |

## 5. Environnement (faits établis)

- **Postgres Docker** : hôte `localhost:5433` (le 5432 est occupé par un autre conteneur `db` — ne pas y toucher). URL par défaut : `postgres://perissos:dev_password@localhost:5433/perissos_restaurant`
- **Modes adaptateur** (`EVERGAUZY_MODE` dans `.env`) : `postgres` (production actuelle) | `mock` (démo mémoire, tests rapides) | `live` (backbone Ever Gauzy + opérationnel Postgres)
- **Ports** : portail 4040, WhatsApp 3000, Vite dev 5173, Postgres 5433, Ever Gauzy docker webapp 4200 / api 3091
- **Auth employés (verrouillé, F-B03)** : le rôle vient **exclusivement du cookie de session** — le param `?role=` a été supprimé de toutes les routes et du frontend. Sans session = invité `CLIENT` (menu public, chat, réservations masquées). Jetons HMAC cookie httpOnly 12h (`SESSION_SECRET` dans `.env`), rôle dérivé de `employe.fonction`, 5 comptes démo (mdp `demo1234` — dev seulement). Les tests curl se font avec un jar : voir `docs/POLITIQUE-TESTS.md` §5.
- **Accès démo présentation (F-B08)** : `DEMO_PRESENTATION=1` dans `.env` active `GET/POST /api/auth/demo` (boutons par profil sur l'écran de connexion). **Absent/vide en production → routes 404**, section masquée dans l'UI. Aucun mot de passe dans le bundle frontend.
- **Docker requis** : si le portail renvoie 500 sur les routes DB, vérifier `docker info` puis `docker compose ps` avant de soupçonner le code.
- **LLM** : sans `LLM_API_KEY` dans `.env`, le chat répond 503 — le portail reste fonctionnel
- **Séquences ID** : `employe_id_seq`, `commande_id_seq`, `shift_id_seq` — tout seed direct d'IDs en dur DOIT être suivi d'une resynchronisation (voir `src/db/seed.ts`)

## 6. Workflow obligatoire d'une session

**Avant de commencer :**
1. Lire `AGENTS.md` (ce fichier), `docs/HANDOVER.md`, `docs/SUIVI-FONCTIONNALITES.md`
2. Choisir une fonctionnalité `[ATTENTE]` dans le registre
3. La marquer `[EN COURS — @nom-agent, date]` (revendication)
4. Vérifier `docker compose ps` (Postgres healthy) et lancer les tests pour partir d'un état vert

**Pendant le travail :**
5. Respecter `docs/POLITIQUE-TESTS.md` (écrire les tests AVANT de déclarer terminé)
6. Ne pas toucher aux fichiers d'une autre fonctionnalité `[EN COURS]`
7. En cas de découverte architecturale importante : noter dans `docs/HANDOVER.md` section « Leçons apprises »

**À la fin :**
8. `npx tsc --noEmit` vert + `npm test` vert + build web vert si frontend touché
9. Marquer la fonctionnalité `[TERMINÉ]` avec tests validés dans le registre
10. Mettre à jour `docs/HANDOVER.md` (état, prochaine étape, leçons)
11. Rédiger le rapport de session selon le gabarit de `docs/POLITIQUE-DOCUMENTATION.md`

## 7. Où ranger quoi

| Information | Document |
|---|---|
| Vision, mission, décisions verrouillées, roadmap | `docs/VISION.md` |
| Alignement commercial (promesses PDF vs code) | `docs/ALIGNEMENT-COMMERCIAL.md` |
| Workflow MCP (réplication de thèmes) | `docs/WORKFLOW-MCP.md` |
| Protocole Magen (sécurité & résilience) | `docs/PROTOCOLE-MAGEN.md` |
| Statut des fonctionnalités, revendications | `docs/SUIVI-FONCTIONNALITES.md` |
| Standards de tests, Definition of Done | `docs/POLITIQUE-TESTS.md` |
| Règles de documentation, gabarits de rapport | `docs/POLITIQUE-DOCUMENTATION.md` |
| État courant du système, handover, leçons | `docs/HANDOVER.md` |
| Bugs connus, vigilances techniques | `docs/HANDOVER.md` (sections dédiées) |

## 8. Conflit entre agents

Si un agent découvre qu'une autre personne/agent travaille sur la même chose : **le premier revendiqué gagne**. Le second bascule sur une autre fonctionnalité `[ATTENTE]` et signale le chevauchement dans `docs/HANDOVER.md`. En cas de doute sur une décision d'architecture, ne pas trancher seul : poser la question au porteur de vision et l'inscrire dans le registre comme `[BLOQUÉ — décision requise]`.
