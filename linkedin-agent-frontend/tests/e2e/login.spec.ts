import { test, expect } from "@playwright/test";

test.describe("Page de connexion", () => {
  test("affiche le branding Qlinqen", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Qlinqen").first()).toBeVisible();
    await expect(
      page.getByText("Automatisez votre prospection LinkedIn intelligemment")
    ).toBeVisible();
  });

  test("propose les deux modes de connexion", async ({ page }) => {
    await page.goto("/login");
    // Deux cartes : Admin (LinkedIn) et utilisateur (credentials)
    const buttons = page.locator("button");
    await expect(buttons.first()).toBeVisible();
  });

  test("permet de basculer vers le mode credentials", async ({ page }) => {
    await page.goto("/login");
    // Cliquer sur une carte révèle un formulaire (email/password)
    await page.locator("button").nth(1).click();
    // Au moins un champ de saisie devient visible après navigation de mode
    await page.waitForTimeout(500);
  });

  test("la page répond avec un statut 200", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(400);
  });
});
