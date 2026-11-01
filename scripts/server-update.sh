#!/usr/bin/env bash
# Server update: backup, pull, migrate deploy, build.
# Refuses to run unless FITCLUB_SERVER_UPDATE=1 so a laptop cannot start it by mistake.
# Never runs prisma db seed or migrate reset.
set -euo pipefail

if [[ "${FITCLUB_SERVER_UPDATE:-}" != "1" ]]; then
  echo "Refusing: set FITCLUB_SERVER_UPDATE=1 only on the club server." >&2
  exit 1
fi

if [[ -z "${BACKUP_DIR:-}" ]]; then
  echo "Refusing: BACKUP_DIR must be an absolute folder outside the project." >&2
  exit 1
fi

case "${BACKUP_DIR}" in
  /*|[A-Za-z]:*|[A-Za-z]:/*) ;;
  *)
    echo "Refusing: BACKUP_DIR must be absolute." >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

echo "1/6 Backing up the database"
(cd api && npm run backup:db)

echo "2/6 Pulling the latest code"
git pull --ff-only

echo "3/6 Updating the API and applying new tables"
(cd api && npm ci && npx prisma migrate deploy && npm run build)

echo "4/6 Updating the website"
(cd web && npm ci && npm run build)

echo "5/6 Build finished"
echo "6/6 Restarting the website and API"
if [[ -f /etc/systemd/system/fitclub-api.service && -f /etc/systemd/system/fitclub-web.service ]]; then
  systemctl restart fitclub-api fitclub-web
  systemctl is-active fitclub-api fitclub-web
else
  echo "Restart the API and the website the way they are already running on this server."
fi
echo "Do not run prisma db seed or prisma migrate reset."
