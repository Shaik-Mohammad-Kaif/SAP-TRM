# Backup & Recovery Runbook

## Daily Backup
Runs every night at 2:00 AM.
```bash
pg_dump -U murex murexdb > /backups/murexdb_$(date +%F).sql
```

## Restore Procedure
1. Stop the application.
2. Run restore command:
   ```bash
   psql -U murex murexdb < /backups/murexdb_2025-12-18.sql
   ```
3. Restart application.

## Vector Data
Note: `pgvector` data is included in the standard dump. No special steps required.
