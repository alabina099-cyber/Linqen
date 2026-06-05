# Migrations PostgreSQL

## Ordre d'exécution

Exécuter les migrations dans l'ordre numérique croissant :

```bash
# Se connecter à Neon DB via psql ou l'interface web
psql $DATABASE_URL -f db/migrations/001_add_worker_queue.sql
```

## Migration 001 — Support Workers Cloud

Ajoute les colonnes `claimed_by` et `claimed_at` à `linkedin_actions_queue` pour le verrouillage distribué entre workers, et crée la table `worker_heartbeats` pour le monitoring.

**Aucune donnée existante n'est perdue.**
