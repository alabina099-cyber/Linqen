// =============================================
// Security Audit Script
// Teste les vulnérabilités courantes des endpoints API
// Usage: node scripts/security-audit.js
// =============================================

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const results = { passed: 0, failed: 0, warnings: 0, tests: [] };

function record(name, status, message) {
  results.tests.push({ name, status, message });
  if (status === "PASS") results.passed++;
  else if (status === "FAIL") results.failed++;
  else results.warnings++;
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️ ";
  console.log(`${icon} [${status}] ${name}${message ? ": " + message : ""}`);
}

// =============================================
// TEST 1 — Security Headers
// =============================================
async function testSecurityHeaders() {
  console.log("\n📋 Test 1: Security Headers");
  try {
    const res = await fetch(`${BASE_URL}/api/test-db`);
    const required = {
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-xss-protection": "1; mode=block",
      "referrer-policy": "strict-origin-when-cross-origin",
      "content-security-policy": null,
    };
    for (const [header, expected] of Object.entries(required)) {
      const value = res.headers.get(header);
      if (!value) {
        record(`Header ${header}`, "FAIL", "missing");
      } else if (expected && value !== expected) {
        record(`Header ${header}`, "WARN", `got "${value}"`);
      } else {
        record(`Header ${header}`, "PASS");
      }
    }
  } catch (e) {
    record("Security Headers", "FAIL", e.message);
  }
}

// =============================================
// TEST 2 — SQL Injection
// =============================================
async function testSqlInjection() {
  console.log("\n📋 Test 2: SQL Injection Protection");
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1 UNION SELECT * FROM users",
    "admin'--",
  ];
  for (const payload of payloads) {
    try {
      const url = `${BASE_URL}/api/prospects?search=${encodeURIComponent(payload)}`;
      const res = await fetch(url);
      const text = await res.text();
      // Vérifier que la réponse ne contient pas d'erreur SQL exposée
      if (
        text.toLowerCase().includes("syntax error") ||
        text.toLowerCase().includes("postgresql") ||
        text.toLowerCase().includes("pg_") ||
        text.includes("at character")
      ) {
        record(`SQL Injection "${payload.slice(0, 20)}..."`, "FAIL", "SQL error leaked");
      } else if (res.status >= 500) {
        record(`SQL Injection "${payload.slice(0, 20)}..."`, "WARN", `status ${res.status}`);
      } else {
        record(`SQL Injection "${payload.slice(0, 20)}..."`, "PASS");
      }
    } catch (e) {
      record(`SQL Injection "${payload.slice(0, 20)}..."`, "WARN", e.message);
    }
  }
}

// =============================================
// TEST 3 — XSS Protection
// =============================================
async function testXss() {
  console.log("\n📋 Test 3: XSS Protection");
  const payloads = [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
  ];
  for (const payload of payloads) {
    try {
      const res = await fetch(`${BASE_URL}/api/prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload, linkedin_url: payload }),
      });
      const text = await res.text();
      // La réponse ne doit pas contenir le payload tel quel
      if (text.includes(payload)) {
        record(`XSS "${payload.slice(0, 25)}..."`, "WARN", "payload reflected — vérifier escaping côté front");
      } else {
        record(`XSS "${payload.slice(0, 25)}..."`, "PASS");
      }
    } catch (e) {
      record(`XSS "${payload.slice(0, 25)}..."`, "PASS", "request rejected");
    }
  }
}

// =============================================
// TEST 4 — HTTPS / TLS (production seulement)
// =============================================
async function testHttps() {
  console.log("\n📋 Test 4: HTTPS Configuration");
  if (BASE_URL.startsWith("https://")) {
    try {
      const res = await fetch(BASE_URL);
      const hsts = res.headers.get("strict-transport-security");
      if (hsts) {
        record("HSTS header", "PASS", hsts);
      } else {
        record("HSTS header", "FAIL", "missing");
      }
    } catch (e) {
      record("HTTPS", "FAIL", e.message);
    }
  } else {
    record("HTTPS", "WARN", "BASE_URL is HTTP (dev mode) — only HTTPS recommended in production");
  }
}

// =============================================
// TEST 5 — Sensitive Data Exposure
// =============================================
async function testSensitiveData() {
  console.log("\n📋 Test 5: Sensitive Data Exposure");
  const endpoints = [
    "/.env",
    "/.env.local",
    "/package.json",
    "/.git/config",
    "/api/.env",
  ];
  for (const path of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      if (res.status === 200) {
        const text = await res.text();
        if (
          text.includes("DATABASE_URL") ||
          text.includes("OPENAI_API_KEY") ||
          text.includes("password")
        ) {
          record(`Path ${path}`, "FAIL", "sensitive data accessible");
        } else {
          record(`Path ${path}`, "WARN", `accessible (status 200)`);
        }
      } else {
        record(`Path ${path}`, "PASS", `blocked (${res.status})`);
      }
    } catch {
      record(`Path ${path}`, "PASS");
    }
  }
}

// =============================================
// TEST 6 — Rate Limiting
// =============================================
async function testRateLimit() {
  console.log("\n📋 Test 6: Rate Limiting");
  try {
    const requests = Array.from({ length: 150 }, () =>
      fetch(`${BASE_URL}/api/test-db`)
    );
    const responses = await Promise.all(requests);
    const blocked = responses.filter((r) => r.status === 429).length;
    if (blocked > 0) {
      record("Rate limiting", "PASS", `${blocked}/150 requests blocked (429)`);
    } else {
      record("Rate limiting", "WARN", "no 429 responses — rate limit may not be active on this endpoint");
    }
  } catch (e) {
    record("Rate limiting", "WARN", e.message);
  }
}

// =============================================
// TEST 7 — CORS Configuration
// =============================================
async function testCors() {
  console.log("\n📋 Test 7: CORS Configuration");
  try {
    const res = await fetch(`${BASE_URL}/api/test-db`, {
      headers: { Origin: "https://malicious-site.com" },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    if (allowOrigin === "*" || allowOrigin === "https://malicious-site.com") {
      record("CORS", "FAIL", `permissive: ${allowOrigin}`);
    } else {
      record("CORS", "PASS", `restricted (${allowOrigin || "no header"})`);
    }
  } catch (e) {
    record("CORS", "WARN", e.message);
  }
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log("=".repeat(70));
  console.log("LinkedIn Agent — Security Audit");
  console.log("=".repeat(70));
  console.log(`Target: ${BASE_URL}`);
  console.log("=".repeat(70));

  await testSecurityHeaders();
  await testSqlInjection();
  await testXss();
  await testHttps();
  await testSensitiveData();
  await testRateLimit();
  await testCors();

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`✅ Passed:   ${results.passed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`❌ Failed:   ${results.failed}`);
  console.log("=".repeat(70));

  if (results.failed > 0) {
    console.log("\n⚠️  Vulnerabilities found — review failed tests above.");
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log("\n⚠️  Some warnings — review for production deployment.");
  } else {
    console.log("\n✅ All security tests passed.");
  }
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
