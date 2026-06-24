#!/usr/bin/env bash
set -euo pipefail

echo "Pulling latest code..."
git pull

echo "Cleaning up Docker..."
docker image prune -f

echo "Building and starting services..."
docker compose up -d --build --remove-orphans

echo "Done."
docker compose ps
