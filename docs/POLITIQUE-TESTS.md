# POLITIQUE-TESTS — Standards de tests et Definition of Done

> **Règle fondamentale** : aucune fonctionnalité ne peut être marquée `[TERMINÉ]` dans `docs/SUIVI-FONCTIONNALITES.md` sans avoir franchi toutes les portes de cette politique. Les tests s'écrivent **avant** la déclaration de fin, idéalement **avant** l'implémentation (TDD quand applicable).

## 1. Definition of Done (obligatoire)

Une fonctionnalité est terminée quand **toutes** les cases sont cochées :

- [ ] `npx tsc --noEmit` vert (racine)
- [ ] `npm test` vert (tous les tests, y compris les nouveaux)
- [ ] `npm --prefix web run build` vert si le frontend est touché
- [ ] Tests nouveaux écrits pour la fonctionnalité (voir §3 selon la couche)
- [ ] Validation manuelle documentée (commandes curl + résultats attendus, voir §4)
- [ ] Aucune régression : les fonctionnalités `[TERMINÉ]` précédentes revalidées si touchées
- [ ] `docs/SUIVI-FONCTIONNALITES.md` mis à jour avec la liste des tests ajoutés
- [ ] `docs/HANDOVER.md` mis à jour (état + prochaine étape)

## 2. Commandes et état de référence

**Isolation des tests** : les tests Vitest s'exécutent sur la base dédiée `perissos_restaurant_test` (via `src/db/tests/setup-env.ts` chargé par `vitest.config.ts`). La base de dev `perissos_restaurant` n'est **jamais** touchée par `npm test`. Après toute nouvelle migration : lancer aussi `npm run db:migrate:test`.

| Commande | État de référence actuel |
|---|---|
| `docker compose ps` | `perissos-postgres` : Up (healthy) — si le portail renvoie 500 sur les routes DB, vérifier d'abord le démon Docker (`docker info`) |
| `npx tsc --noEmit` | 0 erreur |
| `npm test` | 24/24 verts (`adaptateur-postgres.test.ts` 13 + `auth.test.ts` 11) |
| `npm --prefix web run build` | build OK |
| `curl -c /tmp/jar.txt -X POST http://localhost:4040/api/auth/login -H "Content-Type: application/json" -d '{"email":"amadou.ba@perissos.ci","motDePasse":"demo1234"}'` | 200, cookie `perissos_session` dans le jar |
| `curl -b /tmp/jar.txt http://localhost:4040/api/restaurant` | JSON avec `reservationsJour` (le cookie porte le rôle, **le param `?role=` n'existe plus**) |
| `curl http://localhost:4040/api/commandes` (sans cookie) | 403 (invité) — preuve du verrouillage |
| `curl http://localhost:4040/api/auth/demo` | 200 + 5 profils (flag `DEMO_PRESENTATION=1`) — **404 si flag absent** (production) |

**Toute session commence par vérifier cet état de référence.** Si rouge : réparer avant tout nouveau travail, et inscrire l'incident dans `docs/HANDOVER.md`.

## 3. Ce qu'il faut tester par couche

| Couche | Obligation de test | Où |
|---|---|---|
| **Adaptateur Postgres / base** | Chaque nouvelle méthode : cas nominal + erreur métier (introuvable, conflit) | `src/db/tests/*.test.ts` (Vitest) |
| **Outils Chafik** | Chaque nouvel outil : permission par rôle (accepté/refusé) + messages d'erreur | tests Vitest dédiés avec sessions simulées |
| **API HTTP (serveur-web)** | Chaque nouvelle route : 200 nominal + 403/400 refus + retour JSON conforme | curl dans le rapport de session (§4) |
| **Frontend** | `tsc --noEmit` du build web vert ; parcours manuel décrit pas-à-pas dans le rapport | build + rapport |
| **Idempotence / sync** | Toute écriture synchronisable : rejouer l'opération → zéro doublon | test Vitest dédié |

## 4. Gabarit de validation manuelle (curl)

Chaque rapport de session doit contenir, pour chaque fonctionnalité livrée :

```
--- [F-XXX] Nom de la fonctionnalité
$ curl -s "http://localhost:4040/api/... | command exacte"
→ attendu : <valeur/vérification>
→ obtenu  : <valeur réelle> [OK/KO]
```

Exemple canonique (persistance Sprint A) :

```
$ curl -s "http://localhost:4040/api/commandes?role=SERVER" | ... 
→ attendu : CMD-0004 présent après redémarrage du portail
→ obtenu  : présent, statut EN_ATTENTE [OK]
```

## 5. Tests de non-régression par sprint

Le rôle vient **exclusivement du cookie de session** (F-B03) : chaque rôle se connecte d'abord avec son jar. Gabarit :

```
login() { rm -f "/tmp/jar-$1.txt"; curl -s -c "/tmp/jar-$1.txt" -X POST http://localhost:4040/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$2\",\"motDePasse\":\"demo1234\"}" -o /dev/null; }
login patron amadou.ba@perissos.ci
login serveur awa.kone@perissos.ci
login cuisine mariam.toure@perissos.ci
login caissier serge.kouadio@perissos.ci
```

Avant de clore un sprint, rejouer le scénario bout-en-bout :

1. `npm run db:seed` → 10 tables, 14 plats, 7 employés, 202 réservations, 160 factures, 3 commandes, 3 affectations, 48 shifts, 5 comptes (mdp démo `demo1234`)
2. **Verrouillage** : sans cookie → `/api/commandes` 403, `/api/equipe` 403, `/api/rapport` 403 ; `?role=RESTAURANT_ADMIN` sans cookie → 403 partout (param ignoré) ; `/api/menu` 200 public ; `/api/restaurant` 200 mais réservations masquées pour l'invité
3. **Rôles** : patron (jar) → rapport 200 ; caissier (jar) → commandes 200, rapport 403 ; équipe/planning lisibles par tout le personnel connecté (nourrit les menus d'assignation — by design)
4. Créer un employé (patron) → reçoit `EMP-08` (preuve séquence synchronisée)
5. Chaîne par jars : serveur crée une commande → cuisine EN_CUISINE → cuisine PRETE → serveur SERVIE → caissier PAYEE ; transition interdite (ex. serveur tente EN_CUISINE sur une PAYEE) → refus
6. `PAYEE` déclenche une entrée `pending` dans `outbox_sync`
7. **Redémarrer le portail** (`npm run web:stop && npm run web:start`) → commande, statut et session cookie toujours valides
8. `npm test` → 24/24 — puis re-vérifier un login sur la base de dev (doit rester 200 : preuve d'isolation)

## 6. Interdits

- Ne jamais marquer `[TERMINÉ]` avec des tests rouges « en attendant ».
- Ne jamais supprimer un test existant pour le faire passer : le corriger ou le rendre plus précis, et justifier dans le rapport.
- Ne jamais commiter de secret (clé API, mot de passe) — pas même dans un test.
- Ne jamais se passer des portes de contrôle avec « c'est juste un petit changement ».

## 7. Leçons de test à retenir

- **2026-10-15 — Bug QueryResult** : `db.execute()` (Drizzle) retourne un objet `QueryResult` avec propriété `.rows`, pas un tableau. Lire `resultat.rows[0]` — un cast direct en tableau silencieux a produit des `CMD-0001` en boucle. Leçon : tout accès au résultat d'`execute()` doit passer par `.rows` ; se méfier des casts `as unknown as` qui masquent les erreurs de forme.
- **Séquences vs seed** : le seed insère des IDs en dur sans consommer les séquences → toujours resynchroniser avec `setval` après tout insert direct d'IDs (voir fin de `src/db/seed.ts`).
