export async function appelApi<T>(
  chemin: string,
  options?: { method?: string; body?: string }
): Promise<T> {
  const reponse = await fetch(chemin, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body,
  });
  const donnees = (await reponse.json().catch(() => null)) as unknown;
  if (!reponse.ok) {
    const message =
      (donnees as { erreur?: string } | null)?.erreur ?? `Erreur ${reponse.status}`;
    throw new Error(message);
  }
  return donnees as T;
}
