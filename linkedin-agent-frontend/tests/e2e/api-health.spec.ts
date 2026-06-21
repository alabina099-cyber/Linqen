import { test, expect } from "@playwright/test";

test.describe("API & Sécurité (E2E)", () => {
  test("/api/health renvoie une structure JSON valide", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
    expect(body).toHaveProperty("uptime");
  });

  test("les headers de sécurité sont présents", async ({ request }) => {
    const res = await request.get("/api/health");
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toBeTruthy();
  });

  test("CORS rejette une origine malveillante", async ({ request }) => {
    const res = await request.get("/api/health", {
      headers: { Origin: "https://malicious-site.com" },
    });
    const allowOrigin = res.headers()["access-control-allow-origin"];
    // Ne doit jamais autoriser une origine non whitelistée
    expect(allowOrigin).not.toBe("https://malicious-site.com");
    expect(allowOrigin).not.toBe("*");
  });

  test("le rate limiting renvoie les headers X-RateLimit", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    const headers = res.headers();
    expect(headers["x-ratelimit-limit"]).toBe("100");
  });

  test("rejette le POST /api/prospects avec payload XSS (400)", async ({ request }) => {
    const res = await request.post("/api/prospects", {
      data: { name: "<script>alert('xss')</script>" },
    });
    // Soit 400 (validation), soit 401/403 (auth) — jamais 200/201 avec payload XSS
    expect([400, 401, 403]).toContain(res.status());
  });
});
