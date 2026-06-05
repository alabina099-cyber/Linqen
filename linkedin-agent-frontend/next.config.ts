import type { NextConfig } from "next";

// NOTE: Les headers CORS sont gérés dynamiquement par middleware.ts
// (whitelist : extension Chrome + localhost + domaine de production).
// Ne PAS ajouter de headers CORS statiques ici sinon ils écrasent la whitelist.
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
