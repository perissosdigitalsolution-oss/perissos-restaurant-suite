import type { DefinitionOutil } from "../llm/client-llm.js";

export const DEFINITIONS_OUTILS: DefinitionOutil[] = [
  {
    type: "function",
    function: {
      name: "verifier_disponibilite",
      description:
        "Vérifie en temps réel la disponibilité des tables du restaurant pour une date, une heure et un nombre de personnes. À appeler SYSTÉMATIQUEMENT avant de confirmer, modifier ou proposer une réservation. Si aucune table n'est libre, renvoie des créneaux alternatifs proches.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date souhaitée au format AAAA-MM-JJ" },
          heure: { type: "string", description: "Heure du service au format HH:MM en 24h, par exemple 19:30" },
          nombre_personnes: { type: "number", description: "Nombre de convives" },
        },
        required: ["date", "heure", "nombre_personnes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "creer_reservation",
      description:
        "Crée une réservation confirmée après vérification automatique de la disponibilité et renvoie un code de réservation à communiquer au client. N'appelle cet outil que lorsque la date, l'heure, le nombre de personnes, le nom et le téléphone du client sont connus.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date de la réservation au format AAAA-MM-JJ" },
          heure: { type: "string", description: "Heure du service au format HH:MM en 24h" },
          nombre_personnes: { type: "number", description: "Nombre de convives" },
          nom_client: { type: "string", description: "Nom complet du client" },
          telephone: { type: "string", description: "Numéro WhatsApp du client, par exemple +225 07 07 45 12 88" },
          notes: { type: "string", description: "Demandes particulières : anniversaire, allergie, table en terrasse..." },
        },
        required: ["date", "heure", "nombre_personnes", "nom_client", "telephone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rechercher_reservation",
      description:
        "Recherche les réservations existantes par code de réservation, numéro de téléphone ou nom du client. À utiliser avant toute modification ou annulation, et pour retrouver la fiche d'un client.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code de réservation, par exemple PRS-8K2Q" },
          telephone: { type: "string", description: "Numéro de téléphone du client" },
          nom: { type: "string", description: "Nom du client (tout ou partie)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modifier_reservation",
      description:
        "Modifie une réservation confirmée : date, heure, nombre de personnes ou notes. Le numéro de téléphone doit correspondre à la réservation. La disponibilité de la table est re-vérifiée automatiquement et une autre table peut être attribuée.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code de la réservation à modifier" },
          telephone: { type: "string", description: "Numéro de téléphone du client, pour vérification" },
          date: { type: "string", description: "Nouvelle date au format AAAA-MM-JJ" },
          heure: { type: "string", description: "Nouvelle heure au format HH:MM" },
          nombre_personnes: { type: "number", description: "Nouveau nombre de convives" },
          notes: { type: "string", description: "Nouvelles notes" },
        },
        required: ["code", "telephone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "annuler_reservation",
      description:
        "Annule une réservation confirmée après vérification du code et du numéro de téléphone. La table est libérée immédiatement pour d'autres clients.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code de la réservation à annuler" },
          telephone: { type: "string", description: "Numéro de téléphone du client, pour vérification" },
        },
        required: ["code", "telephone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consulter_menu",
      description:
        "Consulte la carte du restaurant. Permet de filtrer par catégorie, d'exclure un allergène (par exemple arachide) ou de limiter le niveau de piment. Utilise cet outil pour répondre aux questions sur les plats, les prix et les ingrédients.",
      parameters: {
        type: "object",
        properties: {
          recherche: { type: "string", description: "Mot-clé recherché dans le nom ou la description du plat" },
          categorie: {
            type: "string",
            enum: ["entree", "plat", "grillades", "accompagnement", "boisson", "dessert"],
            description: "Catégorie de plat",
          },
          sans_allergene: { type: "string", description: "Exclure les plats contenant cet allergène, par exemple arachide" },
          niveau_piment_max: {
            type: "number",
            description: "Niveau de piment maximum accepté : 0 pas pimenté, 1 léger, 2 piquant, 3 très pimenté",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verifier_stock_plat",
      description:
        "Vérifie la disponibilité et le stock restant d'un plat précis de la carte, avec son niveau de piment et ses allergènes.",
      parameters: {
        type: "object",
        properties: {
          nom_du_plat: { type: "string", description: "Nom du plat à vérifier, par exemple Choukouya" },
        },
        required: ["nom_du_plat"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "obtenir_chiffre_affaires",
      description:
        "Calcule le chiffre d'affaires du restaurant en FCFA pour une période, avec la comparaison par rapport à la période équivalente précédente. Réservé à la direction (RESTAURANT_ADMIN).",
      parameters: {
        type: "object",
        properties: {
          periode: {
            type: "string",
            enum: ["aujourdhui", "semaine", "mois"],
            description: "Période : aujourdhui, semaine (7 derniers jours) ou mois (30 derniers jours)",
          },
          date_reference: {
            type: "string",
            description: "Date de référence au format AAAA-MM-JJ, par défaut aujourd'hui",
          },
        },
        required: ["periode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyser_ventes",
      description:
        "Analyse les ventes de la période à partir des factures : plats phares, part du chiffre d'affaires, alertes de stock sur les plats qui se vendent et ruptures. Réservé à la direction (RESTAURANT_ADMIN).",
      parameters: {
        type: "object",
        properties: {
          periode: {
            type: "string",
            enum: ["semaine", "mois"],
            description: "Période d'analyse : semaine (7 derniers jours) ou mois (30 derniers jours)",
          },
        },
        required: ["periode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "previsions_affluence",
      description:
        "Anticipe l'affluence pour une date donnée : occupation historique au dîner sur les 4 mêmes jours, couverts attendus, week-end de fin de mois, et recommandation de nombre de serveurs. Réservé à la direction (RESTAURANT_ADMIN).",
      parameters: {
        type: "object",
        properties: {
          date_cible: { type: "string", description: "Date à anticiper au format AAAA-MM-JJ" },
        },
        required: ["date_cible"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "liste_reservations",
      description:
        "Liste les réservations d'une période, éventuellement filtrées par statut. Permet notamment d'identifier les clients no-show à relancer ou de préparer le planning d'un service. Réservé à la direction et aux serveurs.",
      parameters: {
        type: "object",
        properties: {
          date_debut: { type: "string", description: "Début de la période au format AAAA-MM-JJ" },
          date_fin: { type: "string", description: "Fin de la période au format AAAA-MM-JJ" },
          statut: {
            type: "string",
            enum: ["CONFIRMEE", "ANNULLEE", "NO_SHOW"],
            description: "Statut des réservations recherchées",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lister_equipe",
      description:
        "Liste les membres de l'équipe du restaurant (patron, serveurs, cuisiniers, barman, caissier), avec leur fonction et leur disponibilité. Utilise-le pour savoir qui est en service, qui peut prendre une commande ou cuisiner.",
      parameters: {
        type: "object",
        properties: {
          fonction: {
            type: "string",
            enum: ["patron", "serveur", "cuisinier", "barman", "caissier"],
            description: "Filtrer par fonction métier",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "creer_membre_equipe",
      description:
        "Ajoute un nouveau membre d'équipe (nom, fonction, téléphone). Réservé à la direction (RESTAURANT_ADMIN).",
      parameters: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom complet du membre d'équipe" },
          fonction: {
            type: "string",
            enum: ["patron", "serveur", "cuisinier", "barman", "caissier"],
            description: "Fonction métier",
          },
          telephone: { type: "string", description: "Numéro WhatsApp, par exemple +225 07 07 12 34 56" },
        },
        required: ["nom", "fonction", "telephone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lister_commandes",
      description:
        "Liste les commandes du restaurant (par défaut celles d'aujourd'hui) avec leur statut (en attente, en cuisine, prête, servie, payée), la table, le serveur et le cuisinier assignés. Utilise-le pour suivre le service.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date au format AAAA-MM-JJ, par défaut aujourd'hui" },
          statut: {
            type: "string",
            enum: ["EN_ATTENTE", "EN_CUISINE", "PRETE", "SERVIE", "PAYEE"],
            description: "Filtrer par statut de commande",
          },
          table: { type: "string", description: "Identifiant de table, par exemple T6" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "creer_commande",
      description:
        "Crée une commande pour une table : liste les plats et quantités. La commande arrive automatiquement en cuisine (statut en attente) et le stock des plats est décrémenté. À utiliser après avoir pris la commande au client.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table de la commande, par exemple T6" },
          reservation_code: { type: "string", description: "Code de réservation lié, si la table est réservée" },
          serveur: { type: "string", description: "Nom ou identifiant du serveur qui prend la commande" },
          lignes: {
            type: "array",
            description: "Plats commandés",
            items: {
              type: "object",
              properties: {
                plat: { type: "string", description: "Nom du plat sur la carte" },
                quantite: { type: "number", description: "Quantité (entier positif)" },
                notes: { type: "string", description: "Précision : sans piment, cuisson, à part..." },
              },
              required: ["plat", "quantite"],
            },
          },
        },
        required: ["lignes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assigner_commande",
      description:
        "Assigne une commande à un cuisinier (pour la préparation) et/ou confirme le serveur responsable. À appeler quand la cuisine accepte une commande ou quand on répartit le travail.",
      parameters: {
        type: "object",
        properties: {
          id_commande: { type: "string", description: "Identifiant de la commande, par exemple CMD-0002" },
          cuisinier: { type: "string", description: "Nom ou identifiant du cuisinier assigné" },
          serveur: { type: "string", description: "Nom ou identifiant du serveur responsable" },
        },
        required: ["id_commande"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "maj_statut_commande",
      description:
        "Fait avancer une commande dans le service : en cuisine (cuisinier), prête (cuisine), servie (serveur), payée (caisse). Chaque rôle ne peut faire avancer la commande que jusqu'à l'étape qui lui revient.",
      parameters: {
        type: "object",
        properties: {
          id_commande: { type: "string", description: "Identifiant de la commande, par exemple CMD-0002" },
          statut: {
            type: "string",
            enum: ["EN_ATTENTE", "EN_CUISINE", "PRETE", "SERVIE", "PAYEE"],
            description: "Nouveau statut de la commande",
          },
        },
        required: ["id_commande", "statut"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "affecter_reservation",
      description:
        "Affecte une réservation confirmée à un serveur pour le service : qui sert quelle table. Remplace toute affectation précédente pour cette réservation.",
      parameters: {
        type: "object",
        properties: {
          code_reservation: { type: "string", description: "Code de la réservation, par exemple PRS-8K2Q" },
          serveur: { type: "string", description: "Nom ou identifiant du serveur affecté" },
          date: { type: "string", description: "Date du service au format AAAA-MM-JJ, par défaut aujourd'hui" },
        },
        required: ["code_reservation", "serveur"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lister_affectations",
      description:
        "Liste les affectations du service : quel serveur sert quelle réservation, et quelles réservations sont encore sans serveur. Réservé à la direction et aux serveurs.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date au format AAAA-MM-JJ, par défaut aujourd'hui" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lister_planning",
      description:
        "Liste le planning d'équipe (shifts) : qui travaille quel jour, à quelle heure et sur quel poste (salle, cuisine, bar, caisse). Par défaut sur les 7 prochains jours.",
      parameters: {
        type: "object",
        properties: {
          date_debut: { type: "string", description: "Début au format AAAA-MM-JJ, par défaut aujourd'hui" },
          date_fin: { type: "string", description: "Fin au format AAAA-MM-JJ, par défaut +7 jours" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "creer_shift",
      description:
        "Planifie un shift pour un membre d'équipe : date, heure de début, heure de fin et poste. Réservé à la direction (RESTAURANT_ADMIN).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date du shift au format AAAA-MM-JJ" },
          employe: { type: "string", description: "Nom ou identifiant du membre d'équipe" },
          debut: { type: "string", description: "Heure de début au format HH:MM, par exemple 18:00" },
          fin: { type: "string", description: "Heure de fin au format HH:MM, par exemple 23:30" },
          poste: {
            type: "string",
            enum: ["salle", "cuisine", "bar", "caisse"],
            description: "Poste de travail pendant le shift",
          },
        },
        required: ["date", "employe", "debut", "fin", "poste"],
      },
    },
  },
];
