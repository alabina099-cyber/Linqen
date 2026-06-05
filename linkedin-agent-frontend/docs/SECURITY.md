# Security Documentation — LinkedIn Agent

## 1. Security Measures Implemented

### 1.1 Encryption Utilities (`lib/security.ts`)
- **AES-256-GCM encryption** for sensitive data (API tokens, credentials)
- **SHA-256 hashing** for non-reversible comparisons
- **Constant-time comparison** (`safeCompare`) to prevent timing attacks
- Encryption key configurable via `ENCRYPTION_KEY` environment variable

### 1.2 Input Validation & Sanitization (`lib/security.ts`)
- **HTML sanitization** to prevent XSS attacks
- **SQL identifier sanitization** as defense-in-depth (in addition to parameterized queries)
- **Validators** for email, LinkedIn URL, generic URL, integers, enums, length limits
- **Schema validation** helper to validate complete request bodies

### 1.3 Database Security (`lib/db.ts`)
- **SSL/TLS encryption** for all connections to Neon DB (`sslmode=require`)
- **Parameterized queries** everywhere — no string concatenation in SQL
- **Connection pooling** with controlled limits
- Database hosted on Neon DB with built-in network isolation

### 1.4 Secrets Management
- **Environment variables** for all secrets (`OPENAI_API_KEY`, `DATABASE_URL`, `ENCRYPTION_KEY`)
- **No hardcoded secrets** in source code (server-side keys never exposed to client)
- `.env.local` excluded from git via `.gitignore`

### 1.5 Security Middleware (`middleware.ts`)
HTTP security headers automatically applied to every response:

| Header                     | Value                                       | Purpose                          |
| -------------------------- | ------------------------------------------- | -------------------------------- |
| X-Content-Type-Options     | nosniff                                     | Prevent MIME sniffing            |
| X-Frame-Options            | DENY                                        | Prevent clickjacking             |
| X-XSS-Protection           | 1; mode=block                               | Browser XSS filter               |
| Referrer-Policy            | strict-origin-when-cross-origin             | Limit referrer leakage           |
| Strict-Transport-Security  | max-age=31536000 (production)               | Force HTTPS                      |
| Content-Security-Policy    | restricted sources                          | Mitigate XSS / data injection    |
| Permissions-Policy         | camera, microphone, geolocation disabled    | Limit browser API exposure       |

### 1.6 CORS Configuration
- API routes restricted to allowed origins (localhost, Chrome extension, configured production URL)
- Wildcard `*` is never used
- Credentials only sent to trusted origins

### 1.7 API Rate Limiting (`lib/security.ts`)
- Per-identifier rate limiting (configurable: default 100 req/min)
- Automatic cleanup of expired entries
- Returns `429 Too Many Requests` when limit exceeded

### 1.8 Chrome Extension Security
- **Manifest V3** (latest security model)
- **Minimal permissions** — only required APIs (`activeTab`, `tabs`, `scripting`, `storage`, `alarms`, `cookies`)
- **Host permissions** restricted to `https://www.linkedin.com/*`
- **Content scripts** isolated in their own execution context
- **No remote code execution** — all scripts bundled in extension

### 1.9 LinkedIn Compliance
- **Rate limiter** enforces conservative daily/hourly limits
- **Random delays** between actions (2-3 min connections, 1.5-2.5 min messages)
- **Human-like behavior** simulation to respect platform ToS

## 2. Security Audit Script

Automated security tests covering common vulnerabilities:

```bash
npm run security-audit
```

Tests performed:
1. Security headers presence and correctness
2. SQL injection protection on query parameters
3. XSS payload reflection on POST endpoints
4. HTTPS / HSTS configuration (production)
5. Sensitive file exposure (`.env`, `.git/config`, etc.)
6. API rate limiting behavior
7. CORS configuration permissiveness

## 3. Threat Model

| Threat                  | Mitigation                                       |
| ----------------------- | ------------------------------------------------ |
| SQL Injection           | Parameterized queries + identifier sanitization  |
| XSS                     | HTML sanitization + CSP + X-XSS-Protection       |
| CSRF                    | Origin validation + SameSite cookies             |
| Clickjacking            | X-Frame-Options: DENY                            |
| MITM                    | SSL/TLS for DB + HSTS in production              |
| API key leakage         | Server-side env vars + never sent to client      |
| LinkedIn account ban    | Rate limiter + random human-like delays          |
| Credential theft        | AES-256-GCM encryption available for sensitive data |
| DoS / abuse             | API rate limiting (429 responses)                |
| Sensitive data exposure | Strict CSP + restricted CORS                     |

## 4. Configuration Required for Production

Add to `.env.local`:

```bash
ENCRYPTION_KEY=<32-character-random-string>
DATABASE_URL=<neon-db-connection-string-with-sslmode-require>
OPENAI_API_KEY=<your-openai-key>
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production
```

Generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. How to Demonstrate During Defense

1. Show `lib/security.ts` — encryption, validation, rate limiting utilities
2. Show `middleware.ts` — security headers applied automatically
3. Run `npm run security-audit` to demonstrate automated security testing
4. Show `lib/db.ts` line 5 — `sslmode=require` for DB encryption
5. Show parameterized queries throughout the codebase (e.g. `lib/db.ts`, `lib/rate-limiter.ts`)
6. Show Chrome extension manifest with minimal permissions
7. Explain that authentication uses LinkedIn's own session — no separate password storage required
