import { useCallback, useEffect, useMemo, useState } from "react";
import { appelApi } from "./api";
import ChafikPanel from "./components/ChafikPanel";
import Sidebar, { type Vue } from "./components/Sidebar";
import TopBar from "./components/TopBar";
import type {
  AffectationsJourWeb,
  ClientFidele,
  CommandeWeb,
  CommandesReponseWeb,
  CompteGereWeb,
  CompteSessionWeb,
  DonneesRestaurant,
  EmployeWeb,
  EquipeReponseWeb,
  FonctionEmployeWeb,
  PlatMenuWeb,
  PlanningReponseWeb,
  PosteShiftWeb,
  QuestionDiffered,
  Rapport,
  RoleWeb,
  ShiftWeb,
  StatutCommandeWeb,
} from "./types";
import AffectationsView from "./views/AffectationsView";
import ClientsView from "./views/ClientsView";
import CommandeClientView from "./views/CommandeClientView";
import CommandesView from "./views/CommandesView";
import ComptabiliteView from "./views/ComptabiliteView";
import CuisineView from "./views/CuisineView";
import DashboardView from "./views/DashboardView";
import EquipeView from "./views/EquipeView";
import LoginView from "./views/LoginView";
import MenuView from "./views/MenuView";
import PlaceholderView from "./views/PlaceholderView";
import PlanningView from "./views/PlanningView";
import SiteWebView from "./views/SiteWebView";
import ReservationsView from "./views/ReservationsView";

const ROLES_SERVICE: RoleWeb[] = ["RESTAURANT_ADMIN", "SERVER", "KITCHEN", "BAR", "CASHIER"];

const VUES_PAR_ROLE: Record<RoleWeb, Vue[]> = {
  RESTAURANT_ADMIN: [
    "tableau",
    "restaurant",
    "reservations",
    "commandes",
    "cuisine",
    "affectations",
    "planning",
    "menu",
    "clients",
    "fidelite",
    "equipe",
    "comptabilite",
    "parametres",
  ],
  SERVER: ["reservations", "affectations", "commandes", "cuisine", "planning", "menu", "clients"],
  KITCHEN: ["cuisine", "commandes", "menu", "planning"],
  BAR: ["commandes", "menu", "planning"],
  CASHIER: ["commandes"],
  CLIENT: ["commander", "menu"],
};

const VUE_DEFAUT: Record<RoleWeb, Vue> = {
  RESTAURANT_ADMIN: "tableau",
  SERVER: "reservations",
  KITCHEN: "cuisine",
  BAR: "commandes",
  CASHIER: "commandes",
  CLIENT: "commander",
};

const IDENTITE_CHAT: Record<RoleWeb, string> = {
  RESTAURANT_ADMIN: "Direction",
  SERVER: "Service en salle",
  KITCHEN: "Cuisine",
  BAR: "Bar",
  CASHIER: "Caisse",
  CLIENT: "Invité",
};

function isoJourLocal(): string {
  const maintenant = new Date();
  return new Date(maintenant.getTime() - maintenant.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export default function App() {
  const [role, setRole] = useState<RoleWeb>("CLIENT");
  const [vue, setVue] = useState<Vue>("tableau");
  const [session, setSession] = useState<CompteSessionWeb | null>(null);
  const [etatAuth, setEtatAuth] = useState<"chargement" | "pret">("chargement");
  const [modeDemo, setModeDemo] = useState(false);
  const [sombre, setSombre] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const enregistre = localStorage.getItem("perissos-theme");
    if (enregistre) return enregistre === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [effondre, setEffondre] = useState(false);
  const [ouvertMobile, setOuvertMobile] = useState(false);
  const [idSession] = useState<string>(() => `web-${Math.random().toString(36).slice(2, 10)}`);
  const [restaurant, setRestaurant] = useState<DonneesRestaurant | null>(null);
  const [plats, setPlats] = useState<PlatMenuWeb[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [clients, setClients] = useState<ClientFidele[]>([]);
  const [equipe, setEquipe] = useState<EmployeWeb[]>([]);
  const [commandes, setCommandes] = useState<CommandeWeb[]>([]);
  const [affectations, setAffectations] = useState<AffectationsJourWeb | null>(null);
  const [planning, setPlanning] = useState<ShiftWeb[]>([]);
  const [comptes, setComptes] = useState<CompteGereWeb[]>([]);
  const [question, setQuestion] = useState<QuestionDiffered | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", sombre);
    localStorage.setItem("perissos-theme", sombre ? "dark" : "light");
  }, [sombre]);

  useEffect(() => {
    const verifierSession = async () => {
      try {
        const reponse = await appelApi<{ compte: CompteSessionWeb }>("/api/auth/session");
        setSession(reponse.compte);
        setRole(reponse.compte.role);
      } catch {
        setSession(null);
      } finally {
        setEtatAuth("pret");
      }
    };
    void verifierSession();
  }, []);

  const ouvrirSession = useCallback((compte: CompteSessionWeb) => {
    setSession(compte);
    setRole(compte.role);
    setVue(VUE_DEFAUT[compte.role]);
  }, []);

  const fermerSession = useCallback(async () => {
    try {
      await appelApi("/api/auth/logout", { method: "POST" });
    } catch {
      setSession(null);
      setModeDemo(false);
      return;
    }
    setSession(null);
    setModeDemo(false);
  }, []);

  const allerConnexion = useCallback(() => {
    setModeDemo(false);
  }, []);

  useEffect(() => {
    if (!VUES_PAR_ROLE[role].includes(vue)) {
      setVue(VUE_DEFAUT[role]);
    }
  }, [role, vue]);

  const chargerRestaurant = useCallback(async () => {
    if (role === "CLIENT") {
      setRestaurant(null);
      return;
    }
    try {
      setRestaurant(await appelApi<DonneesRestaurant>("/api/restaurant"));
      setErreur(null);
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  }, [role]);

  const chargerPlats = useCallback(async () => {
    try {
      const menu = await appelApi<{ plats: PlatMenuWeb[] }>("/api/menu");
      setPlats(menu.plats);
    } catch {
      setPlats([]);
    }
  }, []);

  const chargerRapport = useCallback(async () => {
    if (role !== "RESTAURANT_ADMIN") {
      setRapport(null);
      return;
    }
    try {
      setRapport(await appelApi<Rapport>("/api/rapport"));
    } catch (exception) {
      setRapport(null);
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  }, [role]);

  const chargerClients = useCallback(async () => {
    if (role === "CLIENT") {
      setClients([]);
      return;
    }
    try {
      const donnees = await appelApi<{ clients: ClientFidele[] }>("/api/clients");
      setClients(donnees.clients);
    } catch {
      setClients([]);
    }
  }, [role]);

  const chargerEquipe = useCallback(async () => {
    if (!ROLES_SERVICE.includes(role)) {
      setEquipe([]);
      return;
    }
    try {
      const donnees = await appelApi<EquipeReponseWeb>("/api/equipe");
      setEquipe(donnees.employes);
    } catch {
      setEquipe([]);
    }
  }, [role]);

  const chargerCommandes = useCallback(async () => {
    if (!ROLES_SERVICE.includes(role)) {
      setCommandes([]);
      return;
    }
    try {
      const donnees = await appelApi<CommandesReponseWeb>(
        `/api/commandes?date=${isoJourLocal()}`
      );
      setCommandes(donnees.commandes);
    } catch {
      setCommandes([]);
    }
  }, [role]);

  const chargerAffectations = useCallback(async () => {
    if (role !== "RESTAURANT_ADMIN" && role !== "SERVER" && role !== "KITCHEN") {
      setAffectations(null);
      return;
    }
    try {
      setAffectations(
        await appelApi<AffectationsJourWeb>(`/api/affectations?date=${isoJourLocal()}`)
      );
    } catch {
      setAffectations(null);
    }
  }, [role]);

  const chargerPlanning = useCallback(async () => {
    if (!ROLES_SERVICE.includes(role)) {
      setPlanning([]);
      return;
    }
    try {
      const donnees = await appelApi<PlanningReponseWeb>("/api/planning");
      setPlanning(donnees.shifts);
    } catch {
      setPlanning([]);
    }
  }, [role]);

  const chargerComptes = useCallback(async () => {
    if (role !== "RESTAURANT_ADMIN") {
      setComptes([]);
      return;
    }
    try {
      const donnees = await appelApi<{ comptes: CompteGereWeb[] }>("/api/comptes");
      setComptes(donnees.comptes);
    } catch {
      setComptes([]);
    }
  }, [role]);

  useEffect(() => {
    void chargerRestaurant();
  }, [chargerRestaurant]);

  useEffect(() => {
    void chargerPlats();
  }, [chargerPlats]);

  useEffect(() => {
    void chargerRapport();
  }, [chargerRapport]);

  useEffect(() => {
    void chargerClients();
  }, [chargerClients]);

  useEffect(() => {
    void chargerEquipe();
  }, [chargerEquipe]);

  useEffect(() => {
    void chargerCommandes();
  }, [chargerCommandes]);

  useEffect(() => {
    void chargerAffectations();
  }, [chargerAffectations]);

  useEffect(() => {
    void chargerPlanning();
  }, [chargerPlanning]);

  useEffect(() => {
    void chargerComptes();
  }, [chargerComptes]);

  const majStatutCommande = useCallback(
    async (id: string, statut: StatutCommandeWeb) => {
      await appelApi("/api/commandes/statut", {
        method: "POST",
        body: JSON.stringify({ id, statut }),
      });
      await Promise.all([chargerCommandes(), chargerRapport(), chargerRestaurant()]);
    },
    [role, chargerCommandes, chargerRapport, chargerRestaurant]
  );

  const assignerCommande = useCallback(
    async (id: string, serveurId?: string, cuisinierId?: string) => {
      await appelApi("/api/commandes/assignation", {
        method: "POST",
        body: JSON.stringify({ id, serveurId, cuisinierId }),
      });
      await chargerCommandes();
    },
    [role, chargerCommandes]
  );

  const creerCommande = useCallback(
    async (
      tableId: string,
      serveurId: string,
      lignes: Array<{ plat: string; quantite: number }>
    ) => {
      await appelApi("/api/commandes", {
        method: "POST",
        body: JSON.stringify({ tableId, serveurId: serveurId || undefined, lignes }),
      });
      await Promise.all([chargerCommandes(), chargerRapport(), chargerPlats()]);
    },
    [role, chargerCommandes, chargerRapport, chargerPlats]
  );

  const affecterReservation = useCallback(
    async (reservationCode: string, serveurId: string) => {
      await appelApi("/api/affectations", {
        method: "POST",
        body: JSON.stringify({ reservationCode, serveurId, date: isoJourLocal() }),
      });
      await Promise.all([chargerAffectations(), chargerRapport()]);
    },
    [role, chargerAffectations, chargerRapport]
  );

  const retirerAffectation = useCallback(
    async (reservationCode: string) => {
      await appelApi("/api/affectations/retirer", {
        method: "POST",
        body: JSON.stringify({ reservationCode, date: isoJourLocal() }),
      });
      await Promise.all([chargerAffectations(), chargerRapport()]);
    },
    [role, chargerAffectations, chargerRapport]
  );

  const creerShift = useCallback(
    async (employeId: string, date: string, debut: string, fin: string, poste: PosteShiftWeb) => {
      await appelApi("/api/planning", {
        method: "POST",
        body: JSON.stringify({ employeId, date, debut, fin, poste }),
      });
      await chargerPlanning();
    },
    [role, chargerPlanning]
  );

  const supprimerShift = useCallback(
    async (id: string) => {
      await appelApi("/api/planning/supprimer", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      await chargerPlanning();
    },
    [role, chargerPlanning]
  );

  const creerMembreEquipe = useCallback(
    async (nom: string, fonction: FonctionEmployeWeb, telephone: string) => {
      await appelApi("/api/equipe", {
        method: "POST",
        body: JSON.stringify({ nom, fonction, telephone }),
      });
      await Promise.all([chargerEquipe(), chargerPlanning()]);
    },
    [role, chargerEquipe, chargerPlanning]
  );

  const creerCompte = useCallback(
    async (employeId: string, email: string): Promise<string> => {
      const reponse = await appelApi<{ motDePasseInitial: string }>("/api/comptes", {
        method: "POST",
        body: JSON.stringify({ employeId, email }),
      });
      await chargerComptes();
      return reponse.motDePasseInitial;
    },
    [chargerComptes]
  );

  const reinitialiserCompte = useCallback(async (id: string): Promise<string> => {
    const reponse = await appelApi<{ motDePasseTemporaire: string }>("/api/comptes/reinitialiser", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    return reponse.motDePasseTemporaire;
  }, []);

  const basculerCompte = useCallback(
    async (id: string, actif: boolean) => {
      await appelApi("/api/comptes/statut", {
        method: "POST",
        body: JSON.stringify({ id, actif }),
      });
      await chargerComptes();
    },
    [chargerComptes]
  );

  const apresEchange = useCallback(() => {
    void chargerRestaurant();
    void chargerRapport();
    void chargerClients();
    void chargerEquipe();
    void chargerCommandes();
    void chargerAffectations();
    void chargerPlanning();
    void chargerComptes();
    void chargerPlats();
  }, [
    chargerRestaurant,
    chargerRapport,
    chargerClients,
    chargerEquipe,
    chargerCommandes,
    chargerAffectations,
    chargerPlanning,
    chargerComptes,
    chargerPlats,
  ]);

  const poserQuestion = useCallback((texte: string) => {
    setQuestion({ id: Date.now(), texte });
  }, []);

  const notifications = useMemo(() => {
    if (role === "RESTAURANT_ADMIN" && rapport) {
      return (
        rapport.ventes.alertesStock.length +
        rapport.ventes.ruptures.length +
        (rapport.noShows.total > 0 ? 1 : 0) +
        rapport.service.reservationsSansServeur
      );
    }
    if (role === "SERVER") {
      return (restaurant?.reservationsJour.length ?? 0) + (affectations?.reservations.filter((reservation) => !reservation.serveurId).length ?? 0);
    }
    if (role === "KITCHEN") {
      return commandes.filter((commande) => commande.statut === "EN_ATTENTE").length;
    }
    if (role === "CASHIER") {
      return commandes.filter((commande) => commande.statut === "SERVIE").length;
    }
    return 0;
  }, [role, rapport, restaurant, affectations, commandes]);

  const vuesAutorisees = VUES_PAR_ROLE[role];
  const vueActive = vuesAutorisees.includes(vue) ? vue : VUE_DEFAUT[role];

  const rendreVue = () => {
    switch (vueActive) {
      case "tableau":
        return (
          <DashboardView
            rapport={rapport}
            restaurant={restaurant}
            onQuestion={poserQuestion}
            onNaviguer={setVue}
          />
        );
      case "site":
        return <SiteWebView role={role} onQuestion={poserQuestion} />;
      case "reservations":
        return <ReservationsView restaurant={restaurant} onQuestion={poserQuestion} />;
      case "commander":
        return <CommandeClientView plats={plats} />;
      case "menu":
        return <MenuView plats={plats} role={role} onQuestion={poserQuestion} />;
      case "clients":
        return <ClientsView clients={clients} onQuestion={poserQuestion} />;
      case "comptabilite":
        return <ComptabiliteView rapport={rapport} onQuestion={poserQuestion} />;
      case "commandes":
        return (
          <CommandesView
            commandes={commandes}
            equipe={equipe}
            plats={plats}
            role={role}
            onMajStatut={majStatutCommande}
            onAssigner={assignerCommande}
            onCreer={creerCommande}
            onQuestion={poserQuestion}
          />
        );
      case "cuisine":
        return (
          <CuisineView
            commandes={commandes}
            role={role}
            onMajStatut={majStatutCommande}
            onRafraichir={() => void chargerCommandes()}
          />
        );
      case "affectations":
        return (
          <AffectationsView
            affectations={affectations}
            role={role}
            onAffecter={affecterReservation}
            onRetirer={retirerAffectation}
            onQuestion={poserQuestion}
          />
        );
      case "planning":
        return (
          <PlanningView
            planning={planning}
            equipe={equipe}
            role={role}
            onCreerShift={creerShift}
            onSupprimerShift={supprimerShift}
          />
        );
      case "equipe":
        return (
          <EquipeView
            equipe={equipe}
            role={role}
            onCreerMembre={creerMembreEquipe}
            comptes={comptes}
            onCreerCompte={creerCompte}
            onReinitialiserCompte={reinitialiserCompte}
            onBasculerCompte={basculerCompte}
          />
        );
      case "fidelite":
        return (
          <PlaceholderView
            titre="Fidélité"
            description="Récompenses et programme de fidélité de vos clients"
            icone="star"
          />
        );
      case "parametres":
        return (
          <PlaceholderView
            titre="Paramètres"
            description="Configuration du restaurant, de l'équipe et des canaux"
            icone="settings"
          />
        );
      default:
        return null;
    }
  };

  const nomRestaurant = restaurant?.nom ?? "Périssos";
  const ville = restaurant?.ville ?? "Abidjan";

  if (etatAuth === "chargement") {
    return (
      <div className="min-h-screen bg-[#f8f7f4] dark:bg-[#0c1210] flex items-center justify-center">
        <div className="text-center animate-fadeUp">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25 mx-auto animate-pulse">
            <span className="font-display text-2xl font-black text-emerald-950">P</span>
          </div>
          <p className="mt-4 text-xs text-gray-400 font-medium tracking-widest uppercase">Chargement du portail…</p>
        </div>
      </div>
    );
  }

  if (!session && !modeDemo) {
    return (
      <LoginView
        onSucces={ouvrirSession}
        onModeDemo={() => {
          setModeDemo(true);
          setRole("CLIENT");
          setVue("menu");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8f7f4] dark:bg-[#0c1210] text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar
        role={role}
        vue={vueActive}
        setVue={setVue}
        effondre={effondre}
        setEffondre={setEffondre}
        ouvertMobile={ouvertMobile}
        setOuvertMobile={setOuvertMobile}
        nomRestaurant={nomRestaurant}
        ville={ville}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          role={role}
          sombre={sombre}
          basculerSombre={() => setSombre(!sombre)}
          notifications={notifications}
          onRecherche={poserQuestion}
          onParametres={() => setVue("parametres")}
          setOuvertMobile={setOuvertMobile}
          nomUtilisateur={session ? session.nom : null}
          modeDemo={modeDemo}
          onConnexion={allerConnexion}
          onDeconnexion={() => void fermerSession()}
        />

        {erreur && (
          <div className="mx-4 md:mx-6 mt-4 text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
            {erreur}
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <div className="max-w-[1500px] mx-auto grid xl:grid-cols-4 gap-4 md:gap-6">
            <div className="xl:col-span-3 min-w-0">
              <div key={`${role}-${vueActive}`} className="animate-fadeIn">
                {rendreVue()}
              </div>
            </div>
            <div className="xl:col-span-1 xl:sticky xl:top-16 xl:h-[calc(100vh-5rem)] h-[520px]">
              <ChafikPanel
                role={role}
                idSession={idSession}
                nom={session ? session.nom : IDENTITE_CHAT[role]}
                aEnvoyer={question}
                apresEchange={apresEchange}
              />
            </div>
          </div>
        </main>

        <footer className="px-4 md:px-6 py-3 text-center border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] text-gray-400">
            <span className="font-display font-bold text-gray-600 dark:text-gray-300">Périssos</span> Restaurant
            Suite · <span className="gradient-gold font-semibold">Royal Digital Solution</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
