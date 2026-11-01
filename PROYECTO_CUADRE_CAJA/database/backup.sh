#!/usr/bin/env bash
set -euo pipefail
umask 077

database_name="${DB_NAME:-cuadre_caja}"
script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
backup_directory="${BACKUP_DIR:-${script_directory}/backups}"
timestamp="$(date +%Y%m%d_%H%M%S)"
backup_file="${backup_directory}/${database_name}_${timestamp}.dump"

if [[ -n "${DB_HOST:-}" && -z "${PGHOST:-}" ]]; then
  export PGHOST="$DB_HOST"
fi
if [[ -n "${DB_PORT:-}" && -z "${PGPORT:-}" ]]; then
  export PGPORT="$DB_PORT"
fi
if [[ -n "${DB_USER:-}" && -z "${PGUSER:-}" ]]; then
  export PGUSER="$DB_USER"
fi
if [[ -n "${DB_PASSWORD:-}" && -z "${PGPASSWORD:-}" ]]; then
  export PGPASSWORD="$DB_PASSWORD"
fi

mkdir -p "$backup_directory"
pg_dump --format=custom --file="$backup_file" "$database_name"
printf 'Backup creado: %s\n' "$backup_file"
