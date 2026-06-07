module.exports = {
  ci: {
    collect: {
      // URLs à auditer (page publique de login — pas besoin d'auth)
      url: ["http://localhost:3000/login"],
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
    },
    assert: {
      // Seuils de qualité — warn pour ne pas bloquer la CI brutalement
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.85 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      // Stockage temporaire public des rapports (gratuit)
      target: "temporary-public-storage",
    },
  },
};
