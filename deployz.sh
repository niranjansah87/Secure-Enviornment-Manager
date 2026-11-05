#!/usr/bin/env bash
set -euo pipefail

echo "Pulling latest code..."
git pull

echo "Cleaning up Docker..."
docker image prune -f

echo "Building and starting services..."
docker compose -f docker-compose.v2.yml build --no-cache && docker compose -f docker-compose.v2.yml up -d --remove-orphans

echo "Done."
docker compose -f docker-compose.v2.yml ps
