# POLITIQUE-DOCUMENTATION — Règles de documentation et rapports

> Toute intervention sur le projet produit de la documentation. Ce document définit quoi écrire, quand, où, et sous quel gabarit. Objectif : n'importe quel agent (ou humain) doit pouvoir reprendre le travail à froid en moins de 10 minutes de lecture.

## 1. Inventaire et responsabilité des documents

| Document | Rôle | Qui le met à jour | Quand |
|---|---|---|---|
| `AGENTS.md` | Protocole d'entrée, règles d'or, carte du code, commandes | Agent qui modifie commandes/structure/ports | Dès qu'un fait §4-5 change |
| `docs/VISION.md` | Constitution : mission, décisions verrouillées, roadmap | Porteur de vision (humain) ou agent mandaté | Toute décision D1-D8 ajoutée au journal |
| `docs/SUIVI-FONCTIONNALITES.md` | Registre + revendications | **Chaque agent, à chaque session** | Ouvriture et clôture de session |
| `docs/POLITIQUE-TESTS.md` | Definition of Done, standards, état de référence | Agent qui fait évoluer les standards | Dès que l'état de référence change |
| `docs/POLITIQUE-DOCUMENTATION.md` | Le présent document | Agent qui modifie la politique | Rarement |
| `docs/HANDOVER.md` | État courant, prochaine étape, leçons, bugs connus | **Chaque agent, à chaque fin de session** | Toujours, sans exception |

## 2. Règles de rédaction

1. **Langue française**, ton factuel, phrases courtes.
2. **Zéro emoji** dans la documentation (marqueurs texte : `[ATTENTE]`, `[EN COURS]`, `[TERMINÉ]`, `[BLOQUÉ]`).
3. **Dates ISO** : `AAAA-MM-JJ` partout.
4. **Faits vérifiables uniquement** : chaque affirmation technique s'accompagne de la commande qui la vérifie (ex. `docker compose ps` → healthy).
5. **Pas de duplication** : une information vit à un seul endroit ; les autres documents pointent vers elle (lien relatif).
6. **Lisible à froid** : tout sigle/nom propre défini à sa première occurrence.

## 3. Gabarit de rapport de session

Chaque fin de session ajoute une entrée au journal de `docs/HANDOVER.md` (section « Journal des sessions ») sous cette forme :

```
### Session <AAAA-MM-JJ> — @<agent>
- **Fonctionnalité(s)** : <IDs du registre> — <statut final>
- **Ce qui a été fait** : <3-6 puces max, factuel>
- **Tests** : <commandes + résultats> (ex. npm test → 13/13)
- **Validation curl** : <résumé ou renvoi au détail du registre>
- **Prochaine étape recommandée** : <ID + une phrase>
- **Leçons / incidents** : <ou « néant »>
- **Fichiers touchés** : <liste>
```

## 4. Cycle de vie d'une information

| Type d'information | Naissance | Mise à jour | Mort |
|---|---|---|---|
| Décision d'architecture | `VISION.md` journal | Rare (accord porteur) | Jamais (historique conservé) |
| Fonctionnalité | `SUIVI-FONCTIONNALITES.md` backlog | Statuts au fil de la session | Basculée en section « Terminées » (jamais supprimée) |
| État système / leçon | `HANDOVER.md` | Chaque session | Les leçons stables migrent vers `POLITIQUE-TESTS.md` §7 |
| Fait technique (port, commande, mode) | `AGENTS.md` | Dès que le fait change | Remplacé, jamais effacé sans trace |

## 5. Anti-collision — qui a le droit d'écrire quoi

- **`docs/VISION.md`** : porteur de vision uniquement (ou agent expressément mandaté).
- **`docs/SUIVI-FONCTIONNALITES.md`** : tout agent, **uniquement** les lignes qu'il a revendiquées + ses clôtures.
- **`docs/HANDOVER.md`** : tout agent, **ajout d'une entrée de session** et mise à jour des sections d'état ; ne jamais réécrire l'historique d'un autre.
- **Code d'une fonctionnalité `[EN COURS]` d'autrui** : interdit. Signaler dans HANDOVER si nécessaire.
- **Fichiers partagés** (types.ts, schema, serveur-web, AGENTS.md) : modifications permises si vert sur toute la Definition of Done ; l'agent note explicitement dans son rapport les fichiers partagés touchés.

## 6. Cas particuliers

- **Découverte d'un bug hors de sa fonctionnalité** : ne pas corriger en silence — le consigner dans `docs/HANDOVER.md` section « Bugs connus », et créer une entrée `[ATTENTE]` dans le registre si majeur.
- **Abandon en cours de session** : ramener la fonctionnalité à `[ATTENTE]`, décrire l'état exact dans HANDOVER pour le repreneur.
- **Hotfix urgent en production** : autorisé à contourner le registre, mais régularisé dans les 24h (entrée rétroactive + tests).
