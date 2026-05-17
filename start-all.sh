#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"

printf "\nChecking port %s for existing processes...\n" "$PORT"
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti :"$PORT" || true)
else
  PIDS=$(ss -tulpn 2>/dev/null | awk -v port=":$PORT" '$5 ~ port { split($NF,a,"/"); print a[1] }' | sort -u)
fi

if [[ -n "${PIDS//[[:space:]]/}" ]]; then
  printf "Stopping existing process(es) on port %s...\n" "$PORT"
  kill $PIDS 2>/dev/null || true
  sleep 1
fi

printf "\nStarting Docker services...\n"
docker compose up -d

printf "Waiting for PostgreSQL and Redis health checks...\n"
for i in {1..30}; do
  PG_STATUS=$(docker compose ps -q postgres | xargs -r docker inspect -f '{{.State.Health.Status}}' 2>/dev/null || echo "starting")
  REDIS_STATUS=$(docker compose ps -q redis | xargs -r docker inspect -f '{{.State.Health.Status}}' 2>/dev/null || echo "starting")

  if [[ "$PG_STATUS" == "healthy" && "$REDIS_STATUS" == "healthy" ]]; then
    printf "Services are healthy.\n"
    break
  fi

  printf "."
  sleep 2
  if [[ $i -eq 30 ]]; then
    printf "\nERROR: Services did not become healthy. Postgres=%s Redis=%s\n" "$PG_STATUS" "$REDIS_STATUS"
    exit 1
  fi
 done

printf "\nInstalling dependencies...\n"
npm install

printf "Building static assets...\n"
npm run build

printf "Launching application...\n"
exec npm start
