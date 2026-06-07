import { describe, it, expect } from "vitest";
import { calculateProspectScore } from "@/lib/prospectScore";

describe("calculateProspectScore", () => {
  it("retourne 0 pour un prospect vide", () => {
    expect(calculateProspectScore({})).toBe(0);
  });

  it("attribue 40 points pour un poste C-level (CEO)", () => {
    // 40 (role C-level) + 5 (role renseigné) = 45
    expect(calculateProspectScore({ role: "CEO" })).toBe(45);
  });

  it("attribue 30 points pour un Directeur", () => {
    // 30 (VP/Director) + 5 (role renseigné) = 35
    expect(calculateProspectScore({ role: "Directeur Marketing" })).toBe(35);
  });

  it("attribue 20 points pour un Manager senior", () => {
    // 20 (manager) + 5 (role renseigné) = 25
    expect(calculateProspectScore({ role: "Senior Manager" })).toBe(25);
  });

  it("attribue 10 points pour un poste lambda", () => {
    // 10 (autre poste) + 5 (role renseigné) = 15
    expect(calculateProspectScore({ role: "Stagiaire" })).toBe(15);
  });

  it("additionne correctement tous les critères", () => {
    const score = calculateProspectScore({
      role: "CTO", // 40 + 5
      company: "Acme", // +15
      email: "a@b.com", // +15
      phone: "+33600000000", // +10
      location: "Paris", // +5
      linkedin_url: "https://www.linkedin.com/in/x", // +5
      connections: 500, // +5
    });
    // 45 + 15 + 15 + 10 + 5 + 5 + 5 = 100
    expect(score).toBe(100);
  });

  it("plafonne le score à 100", () => {
    const score = calculateProspectScore({
      role: "Founder & CEO",
      company: "Acme",
      email: "a@b.com",
      phone: "+33600000000",
      location: "Paris",
      linkedin_url: "https://www.linkedin.com/in/x",
      connections: 9999,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("ignore les champs vides ou espaces", () => {
    expect(calculateProspectScore({ company: "   ", email: "" })).toBe(0);
  });

  it("n'ajoute pas de points connexions si valeur invalide", () => {
    expect(calculateProspectScore({ connections: "abc" })).toBe(0);
  });

  it("est insensible à la casse pour les rôles", () => {
    expect(calculateProspectScore({ role: "ceo" })).toBe(
      calculateProspectScore({ role: "CEO" })
    );
  });
});
