import { useState } from "react";
import Icon, { type NomIcone } from "../components/Icon";
import { dateCourte } from "../format";
import type { CompteGereWeb, EmployeWeb, FonctionEmployeWeb, RoleWeb } from "../types";

const FONCTIONS: Array<{ cle: FonctionEmployeWeb; libelle: string; icone: NomIcone }> = [
  { cle: "serveur", libelle: "Serveurs", icone: "users" },
  { cle: "cuisinier", libelle: "Cuisiniers", icone: "flame" },
  { cle: "barman", libelle: "Barmans", icone: "coffee" },
  { cle: "caissier", libelle: "Caissiers", icone: "receipt" },
  { cle: "patron", libelle: "Direction", icone: "user" },
];

const LIBELLE_FONCTION: Record<FonctionEmployeWeb, string> = {
  patron: "Patron",
  serveur: "Serveur",
  cuisinier: "Cuisinier",
  barman: "Barman",
  caissier: "Caissier",
};

export default function EquipeView({
  equipe,
  role,
  onCreerMembre,
  comptes,
  onCreerCompte,
  onReinitialiserCompte,
  onBasculerCompte,
}: {
  equipe: EmployeWeb[];
  role: RoleWeb;
  onCreerMembre: (nom: string, fonction: FonctionEmployeWeb, telephone: string) => Promise<void>;
  comptes: CompteGereWeb[];
  onCreerCompte: (employeId: string, email: string) => Promise<string>;
  onReinitialiserCompte: (id: string) => Promise<string>;
  onBasculerCompte: (id: string, actif: boolean) => Promise<void>;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState<FonctionEmployeWeb>("serveur");
  const [telephone, setTelephone] = useState("");
  const [compteFormOuvert, setCompteFormOuvert] = useState(false);
  const [employeCompte, setEmployeCompte] = useState("");
  const [emailCompte, setEmailCompte] = useState("");
  const [identifiants, setIdentifiants] = useState<{ email: string; motDePasse: string } | null>(null);

  const actifs = equipe.filter((employe) => employe.actif);

  const sansCompte = equipe.filter((employe: EmployeWeb) => !comptes.some((compte) => compte.employeId === employe.id));

  const envoyer = async () => {
    if (!nom.trim()) {
      setErreur("Le nom du membre est requis.");
      return;
    }
    try {
      setErreur(null);
      await onCreerMembre(nom.trim(), fonction, telephone.trim());
      setNom("");
      setTelephone("");
      setFormulaireOuvert(false);
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const creerCompte = async () => {
    if (!employeCompte || !emailCompte.trim()) {
      setErreur("Choisissez un membre et renseignez son email.");
      return;
    }
    try {
      setErreur(null);
      const motDePasse = await onCreerCompte(employeCompte, emailCompte.trim());
      setIdentifiants({ email: emailCompte.trim(), motDePasse });
      setEmailCompte("");
      setEmployeCompte("");
      setCompteFormOuvert(false);
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const reinitialiser = async (id: string, email: string) => {
    try {
      setErreur(null);
      const motDePasse = await onReinitialiserCompte(id);
      setIdentifiants({ email, motDePasse });
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  const basculer = async (id: string, actif: boolean) => {
    try {
      setErreur(null);
      await onBasculerCompte(id, actif);
    } catch (exception) {
      setErreur(exception instanceof Error ? exception.message : String(exception));
    }
  };

  return (
    <div className="space-y-5">
      <div className="animate-fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Équipe
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            {actifs.length} membre(s) actif(s) · {equipe.length} au total
          </p>
        </div>
        {role === "RESTAURANT_ADMIN" && (
          <button
            onClick={() => setFormulaireOuvert(!formulaireOuvert)}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5"
          >
            <Icon nom={formulaireOuvert ? "x" : "plus"} className="w-3.5 h-3.5" />
            Ajouter un membre
          </button>
        )}
      </div>

      {erreur && (
        <div className="text-xs md:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 rounded-xl px-4 py-2.5 animate-fadeIn">
          {erreur}
        </div>
      )}

      {formulaireOuvert && role === "RESTAURANT_ADMIN" && (
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900 shadow-sm animate-fadeUp">
          <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-3">
            Nouveau membre de l'équipe
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Nom complet
              <input
                value={nom}
                onChange={(evenement) => setNom(evenement.target.value)}
                placeholder="ex. Kolo Diabaté"
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Fonction
              <select
                value={fonction}
                onChange={(evenement) => setFonction(evenement.target.value as FonctionEmployeWeb)}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {FONCTIONS.map((option) => (
                  <option key={option.cle} value={option.cle}>
                    {LIBELLE_FONCTION[option.cle]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Téléphone
              <input
                value={telephone}
                onChange={(evenement) => setTelephone(evenement.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
          <button
            onClick={() => void envoyer()}
            className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
          >
            Ajouter à l'équipe
          </button>
        </div>
      )}

      {role === "RESTAURANT_ADMIN" && (
        <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fadeUp">
          <div className="px-4 md:px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon nom="settings" className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">
                Comptes d'accès au portail
              </h3>
            </div>
            {!compteFormOuvert && sansCompte.length > 0 && (
              <button
                onClick={() => setCompteFormOuvert(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5"
              >
                <Icon nom="plus" className="w-3.5 h-3.5" />
                Créer un compte
              </button>
            )}
          </div>

          {identifiants && (
            <div className="mx-4 md:mx-5 mt-4 mb-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    Mot de passe généré — communiquez-le maintenant, il ne sera plus affiché
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">
                    {identifiants.email} · {identifiants.motDePasse}
                  </p>
                </div>
                <button
                  onClick={() => setIdentifiants(null)}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0"
                  title="Masquer"
                >
                  <Icon nom="x" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {compteFormOuvert && (
            <div className="px-4 md:px-5 py-4 border-b border-gray-100 dark:border-gray-800 space-y-3 animate-fadeIn">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Membre de l'équipe
                  <select
                    value={employeCompte}
                    onChange={(evenement) => setEmployeCompte(evenement.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">— Choisir —</option>
                    {sansCompte.map((employe: EmployeWeb) => (
                      <option key={employe.id} value={employe.id}>
                        {employe.nom} ({LIBELLE_FONCTION[employe.fonction as FonctionEmployeWeb]})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Email professionnel
                  <input
                    type="email"
                    value={emailCompte}
                    onChange={(evenement) => setEmailCompte(evenement.target.value)}
                    placeholder="prenom.nom@perissos.ci"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void creerCompte()}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition"
                >
                  Créer le compte
                </button>
                <button
                  onClick={() => setCompteFormOuvert(false)}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {comptes.length === 0 ? (
            <p className="p-5 text-sm text-gray-500 dark:text-gray-400">Aucun compte d'accès pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {comptes.map((compte) => (
                <div
                  key={compte.id}
                  className="px-4 md:px-5 py-3 flex flex-wrap items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {compte.nom
                      .split(" ")
                      .map((mot) => mot[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {compte.nom}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          compte.actif
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {compte.actif ? "ACTIF" : "INACTIF"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {compte.email} · {LIBELLE_FONCTION[compte.fonction as FonctionEmployeWeb]}
                      {compte.dernierAcces
                        ? ` · dernière connexion le ${dateCourte(compte.dernierAcces.slice(0, 10))}`
                        : " · jamais connecté"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => void reinitialiser(compte.id, compte.email)}
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                      title="Générer un nouveau mot de passe"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={() => void basculer(compte.id, !compte.actif)}
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                        compte.actif
                          ? "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-300"
                          : "bg-emerald-700 border-emerald-700 text-white hover:bg-emerald-800"
                      }`}
                    >
                      {compte.actif ? "Désactiver" : "Réactiver"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}