// =============================================
// Validateurs partagés — anti XSS / injection
// Utilisés par les routes API et testés unitairement
// =============================================

/** Rejette toute chaîne contenant des chevrons HTML (< ou >) */
export const SAFE_TEXT = /^[^<>]*$/;

/** Valide une URL LinkedIn légitime */
export const LINKEDIN_URL_REGEX =
  /^https?:\/\/(www\.)?linkedin\.com\/[a-zA-Z0-9\-_/?&=%.]+$/i;

/** Valide un numéro de téléphone (chiffres, +, espaces, parenthèses, tirets) */
export const PHONE_REGEX = /^[+\d\s()-]*$/;

/** Retourne true si le texte ne contient aucun caractère HTML dangereux */
export function isSafeText(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return SAFE_TEXT.test(value);
}

/** Retourne true si l'URL est une URL LinkedIn valide */
export function isValidLinkedInUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return LINKEDIN_URL_REGEX.test(url);
}

/** Normalise une URL LinkedIn (force https://www.linkedin.com) */
export function normalizeLinkedInUrl(url: string): string {
  if (!url) return url;
  return url.replace(
    /^https?:\/\/((?!www\.))linkedin\.com/i,
    "https://www.linkedin.com"
  );
}

/** Vérifie qu'une origine est autorisée (CORS whitelist) */
export function isAllowedOrigin(
  origin: string | null | undefined,
  allowedOrigins: string[] = []
): boolean {
  if (!origin) return false;
  return (
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    allowedOrigins.includes(origin)
  );
}
