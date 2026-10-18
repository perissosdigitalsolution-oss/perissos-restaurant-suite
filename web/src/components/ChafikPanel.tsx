import { useEffect, useRef, useState } from "react";
import { appelApi } from "../api";
import Icon from "./Icon";
import type { MessageChat, QuestionDiffered, ReponseChat, RoleWeb } from "../types";

const ACCUEIL: Record<RoleWeb, string> = {
  RESTAURANT_ADMIN:
    "Bonjour ! Je suis Chafik, votre assistant IA. J'ai accès à vos chiffres, vos réservations, votre carte, l'équipe et vos rapports. Que puis-je faire pour vous ?",
  SERVER:
    "Bonjour ! Je suis Chafik. Je consulte les réservations, les affectations, les commandes et les stocks du service. Que vous faut-il ?",
  KITCHEN:
    "Bonjour ! Je suis Chafik. Je vois les commandes en attente, la carte et les stocks. Que dois-je préparer en premier ?",
  BAR:
    "Bonjour ! Je suis Chafik. Je gère les commandes de boissons et les stocks du bar. Que vous faut-il ?",
  CASHIER:
    "Bonjour ! Je suis Chafik. Je suis les commandes servies à encaisser. Comment puis-je vous aider ?",
  CLIENT:
    "Bonjour ! Je suis Chafik de Périssos. Je peux vous présenter la carte et réserver une table à votre nom. Que puis-je faire pour vous ?",
};

const SUGGESTIONS: Record<RoleWeb, string[]> = {
  RESTAURANT_ADMIN: ["CA du jour", "Réservations à venir", "Top plats", "Clients fidèles", "Répartir les serveurs"],
  SERVER: ["Réservations ce soir", "Stock alloco", "Créneaux libres ce soir", "Mes commandes"],
  KITCHEN: ["Commandes en attente", "Stock poulet", "Menu du jour"],
  BAR: ["Commandes du bar", "Stock jus de bissap", "Créer une commande"],
  CASHIER: ["Commandes à encaisser", "CA du jour"],
  CLIENT: ["Je veux réserver", "Que recommandez-vous ?", "Vos horaires"],
};

export default function ChafikPanel({
  role,
  idSession,
  nom,
  aEnvoyer,
  apresEchange,
}: {
  role: RoleWeb;
  idSession: string;
  nom: string;
  aEnvoyer: QuestionDiffered | null;
  apresEchange: () => void;
}) {
  const [messages, setMessages] = useState<MessageChat[]>([{ auteur: "chafik", texte: ACCUEIL[role] }]);
  const [saisie, setSaisie] = useState("");
  const [ecrit, setEcrit] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const dernierEnvoye = useRef<number>(0);

  useEffect(() => {
    setMessages([{ auteur: "chafik", texte: ACCUEIL[role] }]);
    dernierEnvoye.current = 0;
  }, [role]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ecrit]);

  const envoyer = async (texte: string) => {
    const question = texte.trim();
    if (!question || ecrit) return;
    setSaisie("");
    setMessages((precedent) => [...precedent, { auteur: "moi", texte: question }]);
    setEcrit(true);
    try {
      const reponse = await appelApi<ReponseChat>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ idSession, role, nom, message: question }),
      });
      setMessages((precedent) => [
        ...precedent,
        { auteur: "chafik", texte: reponse.reponse, appels: reponse.appels },
      ]);
      apresEchange();
    } catch (exception) {
      setMessages((precedent) => [
        ...precedent,
        {
          auteur: "chafik",
          texte: exception instanceof Error ? exception.message : String(exception),
          erreur: true,
        },
      ]);
    } finally {
      setEcrit(false);
    }
  };

  useEffect(() => {
    if (!aEnvoyer || aEnvoyer.id === 0 || aEnvoyer.id === dernierEnvoye.current) return;
    dernierEnvoye.current = aEnvoyer.id;
    void envoyer(aEnvoyer.texte);
  }, [aEnvoyer]);

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col h-full border border-white/70 dark:border-white/10 shadow-xl shadow-emerald-900/5 dark:shadow-black/30">
      <div className="p-3.5 border-b border-gray-200/50 dark:border-white/10 flex items-center gap-3 bg-gradient-to-r from-emerald-950/5 dark:from-emerald-950/20 to-transparent">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 flex items-center justify-center text-white font-display font-bold shadow-md">
            C
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900"></div>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
            Chafik{" "}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-300 to-amber-500 text-emerald-950 font-bold">
              IA
            </span>
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Disponible 24h/24
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-2 animate-fadeUp ${message.auteur === "moi" ? "flex-row-reverse" : ""}`}>
            {message.auteur === "chafik" && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                C
              </div>
            )}
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                message.auteur === "moi"
                  ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-br-md shadow-md"
                  : message.erreur
                    ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-bl-md border border-red-100 dark:border-red-900 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md border border-gray-100 dark:border-gray-700 shadow-sm"
              }`}
            >
              {message.texte}
              {message.appels && message.appels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.appels.map((appel, position) => (
                    <span
                      key={`${appel.nom}-${position}`}
                      className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                        appel.succes
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {appel.nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {ecrit && (
          <div className="flex gap-2 animate-fadeIn">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-950 flex items-center justify-center text-white text-[10px] font-bold">
              C
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-gray-100 dark:border-gray-700 shadow-sm flex gap-1 items-center">
              <span className="typing-dot text-emerald-600"></span>
              <span className="typing-dot text-emerald-600"></span>
              <span className="typing-dot text-emerald-600"></span>
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="px-3.5 pb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS[role].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => void envoyer(suggestion)}
            className="text-[10px] px-2.5 py-1 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full text-gray-700 dark:text-gray-300 transition-all hover:shadow-sm font-medium"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="p-3.5 border-t border-gray-200/50 dark:border-white/10">
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-2xl p-1 border border-gray-200 dark:border-gray-700 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
          <input
            type="text"
            value={saisie}
            onChange={(evenement) => setSaisie(evenement.target.value)}
            onKeyDown={(evenement) => evenement.key === "Enter" && void envoyer(saisie)}
            placeholder="Demandez à Chafik…"
            className="flex-1 px-3 py-1.5 text-sm bg-transparent focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={() => void envoyer(saisie)}
            disabled={!saisie.trim() || ecrit}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white flex items-center justify-center hover:shadow-md transition-all disabled:opacity-40"
          >
            <Icon nom="send" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
