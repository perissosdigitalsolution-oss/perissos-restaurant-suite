import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import {
  NOM_COOKIE_SESSION,
  creerJetonSession,
  enteteCookieExpiration,
  enteteCookieSession,
  lireCookies,
  rolePourFonction,
  verifierJetonSession,
} from "../../auth/session.js";

const SECRET = "secret-de-test";

describe("Auth — mapping fonction vers rôle", () => {
  it("chaque fonction employé mappe vers le rôle portail attendu", () => {
    expect(rolePourFonction("patron")).toBe("RESTAURANT_ADMIN");
    expect(rolePourFonction("serveur")).toBe("SERVER");
    expect(rolePourFonction("cuisinier")).toBe("KITCHEN");
    expect(rolePourFonction("barman")).toBe("BAR");
    expect(rolePourFonction("caissier")).toBe("CASHIER");
  });
});

describe("Auth — jetons de session signés", () => {
  it("un jeton créé est vérifiable et porte sa charge", () => {
    const jeton = creerJetonSession(
      { idCompte: "c1", employeId: "EMP-01", nom: "Amadou Ba", role: "RESTAURANT_ADMIN" },
      SECRET
    );
    const charge = verifierJetonSession(jeton, SECRET);
    expect(charge).not.toBeNull();
    expect(charge!.nom).toBe("Amadou Ba");
    expect(charge!.role).toBe("RESTAURANT_ADMIN");
    expect(charge!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("un jeton falsifié est rejeté", () => {
    const jeton = creerJetonSession(
      { idCompte: "c1", employeId: "EMP-02", nom: "Awa Koné", role: "SERVER" },
      SECRET
    );
    const falsifie = `${jeton.slice(0, -4)}AAAA`;
    expect(verifierJetonSession(falsifie, SECRET)).toBeNull();
  });

  it("un jeton signé avec un autre secret est rejeté", () => {
    const jeton = creerJetonSession(
      { idCompte: "c1", employeId: "EMP-02", nom: "Awa Koné", role: "SERVER" },
      "autre-secret"
    );
    expect(verifierJetonSession(jeton, SECRET)).toBeNull();
  });

  it("un jeton expiré est rejeté", () => {
    const jeton = creerJetonSession(
      { idCompte: "c1", employeId: "EMP-04", nom: "Mariam Touré", role: "KITCHEN" },
      SECRET,
      -1
    );
    expect(verifierJetonSession(jeton, SECRET)).toBeNull();
  });

  it("un jeton valide mais portant un rôle CLIENT est rejeté (rôles employés uniquement)", () => {
    const jeton = creerJetonSession(
      { idCompte: "c1", employeId: "EMP-99", nom: "Imposteur", role: "CLIENT" },
      SECRET
    );
    expect(verifierJetonSession(jeton, SECRET)).toBeNull();
  });

  it("l'absence de jeton renvoie null", () => {
    expect(verifierJetonSession(undefined, SECRET)).toBeNull();
    expect(verifierJetonSession("", SECRET)).toBeNull();
  });
});

describe("Auth — cookies", () => {
  it("lit un cookie de session depuis l'en-tête", () => {
    const jeton = creerJetonSession(
      { idCompte: "c1", employeId: "EMP-07", nom: "Serge Kouadio", role: "CASHIER" },
      SECRET
    );
    const cookies = lireCookies({ headers: { cookie: `${NOM_COOKIE_SESSION}=${encodeURIComponent(jeton)}; autre=valeur` } });
    expect(cookies[NOM_COOKIE_SESSION]).toBe(jeton);
  });

  it("produit un entête de cookie avec HttpOnly et Max-Age", () => {
    const entete = enteteCookieSession("abc.def");
    expect(entete).toContain(`${NOM_COOKIE_SESSION}=abc.def`);
    expect(entete).toContain("HttpOnly");
    expect(entete).toContain("SameSite=Lax");
    expect(entete).toContain("Max-Age=43200");
  });

  it("produit un entête d'expiration qui vide le cookie", () => {
    expect(enteteCookieExpiration()).toContain("Max-Age=0");
  });
});

describe("Auth — bcrypt (simulation login seed)", () => {
  it("le mot de passe démo vérifie contre le hash bcrypt du seed", async () => {
    const hash = await bcrypt.hash("demo1234", 10);
    expect(await bcrypt.compare("demo1234", hash)).toBe(true);
    expect(await bcrypt.compare("mauvais", hash)).toBe(false);
  });
});
