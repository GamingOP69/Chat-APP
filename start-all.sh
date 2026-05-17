#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

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
