# Dockerfile LinkedIn Agent Worker
# Multi-stage build pour minimiser la taille de l'image finale

# ==========================================
# Stage 1 : Dépendances + Compilation TypeScript
# ==========================================
FROM node:20-alpine AS builder

# Installer les outils de build nécessaires pour compiler les dépendances natives (pg, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour la compilation)
RUN npm ci

# Copier le code source
COPY src/ ./src/

# Compiler TypeScript -> JavaScript dans dist/
RUN npm run build

# ==========================================
# Stage 2 : Image de production (runtime)
# ==========================================
FROM node:20-alpine AS runner

# Installer Chromium + dépendances système pour Puppeteer
# Chromium Alpine est léger (~150 MB) et suffisant pour le headless
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    && rm -rf /var/cache/apk/*

# Puppeteer sait utiliser le Chromium système d'Alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Sécurité : créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001 -G nodejs

WORKDIR /app

# Copier UNIQUEMENT les fichiers nécessaires au runtime
COPY --from=builder --chown=worker:nodejs /app/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/package*.json ./

USER worker

# Healthcheck simple
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "console.log('ok')" || exit 1

CMD ["node", "dist/index.js"]
