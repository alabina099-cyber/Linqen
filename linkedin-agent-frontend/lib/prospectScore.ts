/**
 * Calcul automatique du score de qualification d'un prospect (0–100).
 *
 * Critères :
 *  - Séniorité du poste  : 0–40 pts
 *  - Entreprise renseignée : +15
 *  - Email renseigné      : +15
 *  - Téléphone renseigné  : +10
 *  - Localisation          : +5
 *  - URL LinkedIn          : +5
 *  - Poste renseigné       : +5
 *  - Données de connexions : +5
 */

interface ProspectScoreInput {
  role?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  connections?: number | string | null;
}

const C_LEVEL_KEYWORDS = [
  "ceo", "cto", "cfo", "coo", "cio", "cmo", "cso", "cpo", "cro", "ciso",
  "fondateur", "cofondateur", "founder", "co-founder", "cofounder",
  "président", "president", "presidenta",
  "partner", "associé", "associée", "managing partner", "general partner",
  "owner", "propriétaire",
];

const VP_DIRECTOR_KEYWORDS = [
  "vice president", "vice-président", "vp ", " vp", "svp", "evp",
  "directeur", "directrice", "director", "head of", "responsable de",
  "chef de", "chief", "responsable",
];

const MANAGER_SENIOR_KEYWORDS = [
  "manager", "senior", "lead", "principal", "chef", "team lead",
  "account executive", "business developer", "ingénieur principal",
];

function getRoleScore(role: string | null | undefined): number {
  if (!role) return 0;
  const r = role.toLowerCase();

  if (C_LEVEL_KEYWORDS.some((k) => r.includes(k))) return 40;
  if (VP_DIRECTOR_KEYWORDS.some((k) => r.includes(k))) return 30;
  if (MANAGER_SENIOR_KEYWORDS.some((k) => r.includes(k))) return 20;
  return 10; // autre poste renseigné
}

export function calculateProspectScore(data: ProspectScoreInput): number {
  let score = 0;

  score += getRoleScore(data.role);

  if (data.company?.trim()) score += 15;
  if (data.email?.trim()) score += 15;
  if (data.phone?.trim()) score += 10;
  if (data.location?.trim()) score += 5;
  if (data.linkedin_url?.trim()) score += 5;
  if (data.role?.trim()) score += 5;

  const connections = Number(data.connections);
  if (!isNaN(connections) && connections > 0) score += 5;

  return Math.min(100, Math.max(0, score));
}
