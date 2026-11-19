#!/bin/sh
# Backup diário. Agende: 0 3 * * * /opt/somnia/deploy/backup.sh
# Requer o pacote sqlite3 (sudo apt install sqlite3).
DATA="${DATA_DIR:-/var/lib/somnia}"
DEST="${BACKUP_DIR:-/var/backups/somnia}"
mkdir -p "$DEST"
D=$(date +%F)
sqlite3 "$DATA/somnia.db" ".backup '$DEST/somnia-$D.db'" || exit 1
tar -czf "$DEST/uploads-$D.tar.gz" -C "$DATA" uploads
find "$DEST" -type f -mtime +14 -delete
