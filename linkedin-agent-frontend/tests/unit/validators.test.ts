import { describe, it, expect } from "vitest";
import {
  isSafeText,
  isValidLinkedInUrl,
  normalizeLinkedInUrl,
  isAllowedOrigin,
} from "@/lib/validators";

describe("isSafeText (anti-XSS)", () => {
  it("accepte un texte normal", () => {
    expect(isSafeText("Jean Dupont")).toBe(true);
  });

  it("accepte null/undefined (champs optionnels)", () => {
    expect(isSafeText(null)).toBe(true);
    expect(isSafeText(undefined)).toBe(true);
  });

  it("rejette une balise script", () => {
    expect(isSafeText("<script>alert('xss')</script>")).toBe(false);
  });

  it("rejette une balise img onerror", () => {
    expect(isSafeText("<img src=x onerror=alert(1)>")).toBe(false);
  });

  it("rejette tout caractère < ou >", () => {
    expect(isSafeText("a < b")).toBe(false);
    expect(isSafeText("a > b")).toBe(false);
  });
});

describe("isValidLinkedInUrl", () => {
  it("accepte une URL LinkedIn valide", () => {
    expect(isValidLinkedInUrl("https://www.linkedin.com/in/jean-dupont")).toBe(true);
  });

  it("accepte sans www", () => {
    expect(isValidLinkedInUrl("https://linkedin.com/in/x")).toBe(true);
  });

  it("rejette un domaine non LinkedIn", () => {
    expect(isValidLinkedInUrl("https://evil.com/in/x")).toBe(false);
  });

  it("rejette une tentative XSS dans l'URL", () => {
    expect(isValidLinkedInUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejette null/undefined", () => {
    expect(isValidLinkedInUrl(null)).toBe(false);
    expect(isValidLinkedInUrl(undefined)).toBe(false);
  });
});

describe("normalizeLinkedInUrl", () => {
  it("ajoute www. si manquant", () => {
    expect(normalizeLinkedInUrl("https://linkedin.com/in/x")).toBe(
      "https://www.linkedin.com/in/x"
    );
  });

  it("laisse inchangée une URL déjà normalisée", () => {
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/x")).toBe(
      "https://www.linkedin.com/in/x"
    );
  });

  it("gère une chaîne vide", () => {
    expect(normalizeLinkedInUrl("")).toBe("");
  });
});

describe("isAllowedOrigin (CORS whitelist)", () => {
  it("autorise l'extension Chrome", () => {
    expect(isAllowedOrigin("chrome-extension://abcdef")).toBe(true);
  });

  it("autorise localhost", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
  });

  it("autorise le domaine de production whitelisté", () => {
    expect(
      isAllowedOrigin("https://app.qlinqen.com", ["https://app.qlinqen.com"])
    ).toBe(true);
  });

  it("rejette une origine malveillante", () => {
    expect(isAllowedOrigin("https://malicious-site.com")).toBe(false);
  });

  it("rejette une origine vide", () => {
    expect(isAllowedOrigin(null)).toBe(false);
    expect(isAllowedOrigin("")).toBe(false);
  });
});
