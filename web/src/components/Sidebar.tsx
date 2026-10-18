import { useEffect, useState } from "react";
import Icon, { type NomIcone } from "./Icon";
import type { RoleWeb } from "../types";

export type Vue =
  | "tableau"
  | "restaurant"
  | "site"
  | "reservations"
  | "commandes"
  | "commander"
  | "cuisine"
  | "affectations"
  | "planning"
  | "menu"
  | "clients"
  | "fidelite"
  | "equipe"
  | "comptabilite"
  | "parametres";

interface Section {
  label: string;
  items: Array<{ cle: Vue; libelle: string; icone: NomIcone }>;
}

const SECTIONS: Record<RoleWeb, Section[]> = {
  RESTAURANT_ADMIN: [
      {
        label: "Pilotage",
        items: [
          { cle: "tableau", libelle: "Tableau de bord", icone: "grid" },
          { cle: "restaurant", libelle: "Mon restaurant", icone: "store" },
          { cle: "site", libelle: "Mon site web", icone: "book" },
        ],
      },
    {
      label: "Opérations",
      items: [
        { cle: "reservations", libelle: "Réservations", icone: "calendar" },
        { cle: "commandes", libelle: "Commandes", icone: "cart" },
        { cle: "cuisine", libelle: "Cuisine", icone: "flame" },
        { cle: "affectations", libelle: "Affectations", icone: "clipboard" },
        { cle: "planning", libelle: "Planning", icone: "clock" },
        { cle: "menu", libelle: "Carte & menu", icone: "book" },
      ],
    },
    {
      label: "Clients",
      items: [
        { cle: "clients", libelle: "Clients", icone: "users" },
        { cle: "fidelite", libelle: "Fidélité", icone: "star" },
      ],
    },
    {
      label: "Gestion",
      items: [
        { cle: "equipe", libelle: "Équipe", icone: "user" },
        { cle: "comptabilite", libelle: "Comptabilité", icone: "receipt" },
        { cle: "parametres", libelle: "Paramètres", icone: "settings" },
      ],
    },
  ],
  SERVER: [
    {
      label: "Opérations",
      items: [
        { cle: "reservations", libelle: "Réservations", icone: "calendar" },
        { cle: "affectations", libelle: "Affectations", icone: "clipboard" },
        { cle: "commandes", libelle: "Commandes", icone: "cart" },
        { cle: "cuisine", libelle: "Cuisine", icone: "flame" },
        { cle: "planning", libelle: "Planning", icone: "clock" },
        { cle: "menu", libelle: "Carte & menu", icone: "book" },
      ],
    },
    { label: "Clients", items: [{ cle: "clients", libelle: "Clients", icone: "users" }] },
  ],
  KITCHEN: [
    {
      label: "Cuisine",
      items: [
        { cle: "cuisine", libelle: "Écran cuisine", icone: "flame" },
        { cle: "commandes", libelle: "Commandes", icone: "cart" },
      ],
    },
    {
      label: "Ressources",
      items: [
        { cle: "menu", libelle: "Carte & stocks", icone: "book" },
        { cle: "planning", libelle: "Planning", icone: "clock" },
      ],
    },
  ],
  BAR: [
    {
      label: "Service",
      items: [
        { cle: "commandes", libelle: "Commandes", icone: "coffee" },
      ],
    },
    {
      label: "Ressources",
      items: [
        { cle: "menu", libelle: "Carte & stocks", icone: "book" },
        { cle: "planning", libelle: "Planning", icone: "clock" },
      ],
    },
  ],
  CASHIER: [
    {
      label: "Caisse",
      items: [
        { cle: "commandes", libelle: "Commandes", icone: "receipt" },
      ],
    },
  ],
  CLIENT: [
    {
      label: "Périssos",
      items: [{ cle: "menu", libelle: "Carte & menu", icone: "book" }],
    },
  ],
};

const IDENTITES: Record<RoleWeb, { nom: string; fonction: string }> = {
  RESTAURANT_ADMIN: { nom: "Direction", fonction: "Patron · Périssos" },
  SERVER: { nom: "Service en salle", fonction: "Serveur · Périssos" },
  KITCHEN: { nom: "Cuisine", fonction: "Cuisinier · Périssos" },
  BAR: { nom: "Bar", fonction: "Barman · Périssos" },
  CASHIER: { nom: "Caisse", fonction: "Caissier · Périssos" },
  CLIENT: { nom: "Invité", fonction: "Client · Périssos" },
};

export default function Sidebar({
  role,
  vue,
  setVue,
  effondre,
  setEffondre,
  ouvertMobile,
  setOuvertMobile,
  nomRestaurant,
  ville,
}: {
  role: RoleWeb;
  vue: Vue;
  setVue: (vue: Vue) => void;
  effondre: boolean;
  setEffondre: (effondre: boolean) => void;
  ouvertMobile: boolean;
  setOuvertMobile: (ouvert: boolean) => void;
  nomRestaurant: string;
  ville: string;
}) {
  const [horloge, setHorloge] = useState("");
  const sections = SECTIONS[role];
  const identite = IDENTITES[role];

  useEffect(() => {
    const mettreAJour = () => setHorloge(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    mettreAJour();
    const minuteur = setInterval(mettreAJour, 30000);
    return () => clearInterval(minuteur);
  }, []);

  return (
    <>
      {ouvertMobile && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOuvertMobile(false)} />
      )}
      <aside
        className={`fixed lg:relative z-30 h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white transition-all duration-500 ease-out ${
          effondre ? "w-[72px]" : "w-64"
        } ${ouvertMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col noise`}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0 relative">
              <span className="font-display text-xl font-black text-emerald-950">P</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-emerald-950"></div>
            </div>
            {!effondre && (
              <div className="animate-fadeIn overflow-hidden">
                <div className="font-display text-base font-bold tracking-tight">Périssos</div>
                <div className="text-[10px] text-amber-200/70 uppercase tracking-widest font-semibold">
                  Restaurant Suite
                </div>
              </div>
            )}
          </div>
        </div>

        {!effondre && (
          <div className="px-4 py-3 border-b border-white/10 animate-fadeIn">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1.5">
              Restaurant
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300/20 to-amber-500/10 border border-amber-300/30 flex items-center justify-center text-amber-200">
                <Icon nom="store" className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{nomRestaurant}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold">
                    IA
                  </span>
                  <span>{ville}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-2.5 space-y-3 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label}>
              {!effondre && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const actif = vue === item.cle;
                  return (
                    <button
                      key={item.cle}
                      onClick={() => {
                        setVue(item.cle);
                        setOuvertMobile(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200 group relative ${
                        actif ? "sidebar-item-active text-white" : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {actif && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-amber-300 to-amber-500 rounded-r-full"></div>
                      )}
                      <Icon nom={item.icone} className="w-4 h-4 flex-shrink-0" />
                      {!effondre && <div className="text-sm font-medium truncate">{item.libelle}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center gap-2.5 ${effondre ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center font-bold text-emerald-950 text-xs flex-shrink-0">
              P
            </div>
            {!effondre && (
              <div className="flex-1 min-w-0 animate-fadeIn">
                <div className="text-sm font-semibold truncate">{identite.nom}</div>
                <div className="text-[10px] text-white/40 truncate">
                  {identite.fonction} · {horloge}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setEffondre(!effondre)}
          className="absolute -right-3 top-1/2 hidden lg:flex w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-lg items-center justify-center text-emerald-900 dark:text-amber-300 hover:bg-amber-300 dark:hover:bg-amber-500 transition"
        >
          <Icon nom={effondre ? "chevronRight" : "x"} className="w-3 h-3" strokeWidth={3} />
        </button>
      </aside>
    </>
  );
}
