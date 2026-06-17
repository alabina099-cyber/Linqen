# Sécurité — Hardening VM Oracle Cloud

Ce document décrit la configuration de sécurité réseau et système appliquée
à la VM Oracle Cloud Always Free hébergeant l'application LinkedIn Agent.

## 1. Security Lists Oracle Cloud (Firewall niveau IaaS)

Configuration appliquée dans la console Oracle Cloud (`Networking > Virtual
Cloud Networks > Security Lists`) :

| Direction | Port  | Protocole | Source            | Usage                            |
| --------- | ----- | --------- | ----------------- | -------------------------------- |
| Ingress   | 22    | TCP       | `<IP admin>/32`   | SSH (restreint à l'IP de l'admin)|
| Ingress   | 80    | TCP       | `0.0.0.0/0`       | HTTP (redirect 301 vers HTTPS)   |
| Ingress   | 443   | TCP       | `0.0.0.0/0`       | HTTPS (trafic principal)         |
| Ingress   | 8000  | TCP       | `<IP admin>/32`   | Coolify UI (admin uniquement)    |
| Egress    | TOUS  | TOUS      | `0.0.0.0/0`       | Sortie DB (Neon), GHCR, R2, etc. |

**Tous les autres ports sont bloqués par défaut** (deny all).

## 2. Firewall OS (UFW)

En complément des Security Lists, UFW est activé sur l'OS Ubuntu :

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from <IP_ADMIN> to any port 8000  # Coolify UI
sudo ufw enable
sudo ufw status verbose
```

## 3. Hardening SSH

Fichier `/etc/ssh/sshd_config` :

```
PermitRootLogin no                    # Pas de login root direct
PasswordAuthentication no             # Authentification par clé uniquement
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
AllowUsers ubuntu admin               # Whitelist d'utilisateurs
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30
```

Redémarrer SSH : `sudo systemctl restart sshd`

## 4. Fail2ban (anti-bruteforce)

```bash
sudo apt install fail2ban -y
```

Fichier `/etc/fail2ban/jail.local` :

```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600       # 1 heure de ban
findtime = 600       # sur fenêtre de 10 minutes
```

## 5. Mises à jour automatiques

Activation des security updates non-attended :

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 6. Audit régulier

| Outil          | Fréquence  | Commande                              |
| -------------- | ---------- | ------------------------------------- |
| Lynis          | Mensuel    | `sudo lynis audit system`             |
| Trivy (host)   | Hebdo (CI) | `trivy fs /` (déjà dans security.yml) |
| Logs SSH       | Continu    | `sudo journalctl -u ssh -f`           |
| `fail2ban-client status sshd` | Hebdo | Vérifie les IPs bannies |

## 7. Sauvegarde des accès

- Clé SSH privée stockée dans un gestionnaire de mots de passe (Bitwarden/1Password)
- Backup de `~/.ssh/authorized_keys` chiffré dans Cloudflare R2
- Procédure de récupération documentée dans `docs/DISASTER_RECOVERY.md`

## 8. Principe de moindre privilège (containers)

- `cAdvisor` : `cap_drop: ALL` + `cap_add: SYS_PTRACE, DAC_READ_SEARCH`
- `app`, `worker` : utilisateur non-root (UID 1001) défini dans Dockerfile
- Tous les ports observabilité bindés sur `127.0.0.1` (pas exposés sur internet)
- Grafana refuse le password "admin" (`GF_SECURITY_ADMIN_PASSWORD=:?`)

## 9. Rotation des secrets

| Secret                   | Rotation       | Méthode                     |
| ------------------------ | -------------- | --------------------------- |
| `OPENAI_API_KEY`         | Tous les 90 j  | Manuel via dashboard OpenAI |
| `METRICS_BEARER_TOKEN`   | Tous les 180 j | `openssl rand -hex 32`      |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Tous les 365 j | Re-chiffrer les backups |
| Clé SSH                  | Tous les 365 j | `ssh-keygen -t ed25519`     |
| `GRAFANA_PASSWORD`       | Tous les 90 j  | UI Grafana                  |
