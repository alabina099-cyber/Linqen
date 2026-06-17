# Certificats TLS

Ce dossier doit contenir les certificats TLS pour Nginx :

- `fullchain.pem` — certificat complet (cert + chaîne intermédiaire)
- `privkey.pem` — clé privée

## Option 1 : Let's Encrypt via Certbot (recommandé)

```bash
# Sur la VM Oracle, après avoir pointé le DNS A record vers son IP publique
docker run --rm -it \
  -v $(pwd)/nginx/certs:/etc/letsencrypt/live/app.example.com \
  -v $(pwd)/nginx/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d app.example.com \
  --email admin@example.com \
  --agree-tos --no-eff-email

# Renouvellement automatique tous les 60 jours via cron
0 3 * * 0 docker run --rm -v ... certbot/certbot renew --quiet
```

## Option 2 : Cloudflare Origin Certificate (15 ans, gratuit)

1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
2. Copier le certificat → `fullchain.pem`
3. Copier la clé privée → `privkey.pem`
4. Cloudflare SSL/TLS mode : **Full (strict)**

## Option 3 : Coolify automatique

Coolify peut provisionner Let's Encrypt automatiquement via Traefik intégré.
Dans ce cas, ce dossier reste vide et Nginx est bypass — le TLS est géré
en amont par Traefik/Coolify.

## ⚠️ Sécurité

- Permissions strictes : `chmod 600 privkey.pem`
- Ne JAMAIS committer ces fichiers (déjà ignorés par `.gitignore`)
