export type EnvoyeurWhatsApp = (destinataire: string, texte: string) => Promise<void>;

const LIMITE_MESSAGE = 4000;
const URL_API_META = "https://graph.facebook.com/v21.0";

export function creerEnvoyeurWhatsApp(config: { token: string; numeroId: string }): EnvoyeurWhatsApp {
  if (!config.token || !config.numeroId) {
    return async (destinataire, texte) => {
      console.log(`\n[WhatsApp SIMULATION] → ${destinataire}\n${texte}\n`);
    };
  }
  return async (destinataire, texte) => {
    const reponse = await fetch(`${URL_API_META}/${config.numeroId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destinataire.replace(/^\+/, ""),
        type: "text",
        text: { body: texte.slice(0, LIMITE_MESSAGE) },
      }),
    });
    if (!reponse.ok) {
      const corps = await reponse.text();
      throw new Error(`Envoi WhatsApp ${reponse.status} : ${corps.slice(0, 300)}`);
    }
  };
}
