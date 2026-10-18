export interface AppelOutilLLM {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface MessageLLM {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: AppelOutilLLM[];
  tool_call_id?: string;
}

export interface DefinitionOutil {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export class ErreurLLM extends Error {}

export async function appelCompletion(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: MessageLLM[],
  outils?: DefinitionOutil[]
): Promise<MessageLLM> {
  const avecOutils = outils !== undefined && outils.length > 0;
  const reponse = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      tools: avecOutils ? outils : undefined,
      tool_choice: avecOutils ? "auto" : undefined,
    }),
  });
  if (!reponse.ok) {
    const corps = await reponse.text();
    throw new ErreurLLM(`Le service LLM a répondu ${reponse.status} : ${corps.slice(0, 400)}`);
  }
  const donnees = (await reponse.json()) as { choices?: Array<{ message?: MessageLLM }> };
  const message = donnees.choices?.[0]?.message;
  if (!message) {
    throw new ErreurLLM(`Réponse LLM inattendue : ${JSON.stringify(donnees).slice(0, 300)}`);
  }
  return message;
}
