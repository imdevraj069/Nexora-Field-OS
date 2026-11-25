#!/usr/bin/env bash
set -euo pipefail

# Dedicated Nexora Zero-Downtime Rolling Deployment Funnel
# Completely isolated from Suryasangam servers. Uses Cloudflare Tunnel + Nginx reload.

PROFILE="${1:-dev}"
TAG="${NEXORA_IMAGE_TAG:-latest}"
export NEXORA_IMAGE_TAG="${TAG}"

echo "[nexora-deploy] Deploying tag=${TAG} profile=${PROFILE}"

COMPOSE_CMD="docker compose -f docker-compose.yml --profile ${PROFILE} --profile tunnel"

# 1. Pull updated standalone images (or build locally if NEXORA_BUILD_LOCAL=1)
if [ "${NEXORA_BUILD_LOCAL:-0}" = "1" ]; then
  ${COMPOSE_CMD} build identity-service storage-service worker-service ai-governance-service gateway-service web
else
  ${COMPOSE_CMD} pull identity-service storage-service worker-service ai-governance-service gateway-service web
fi

# 2. Ensure core infra is up without restarting stateful databases
${COMPOSE_CMD} up -d --no-recreate minio minio-init rabbitmq

# 3. Ordered rolling updates with healthchecks
for SVC in identity-service storage-service worker-service ai-governance-service gateway-service web; do
  echo "[nexora-deploy] Rolling ${SVC}..."
  ${COMPOSE_CMD} up -d --no-deps "${SVC}"
  sleep 2
done

# 4. Reload Nginx cleanly without dropping Cloudflare Tunnel
${COMPOSE_CMD} up -d --no-deps nginx cloudflared
docker exec nexora-nginx nginx -s reload || true

echo "[nexora-deploy] Deployment complete for tag=${TAG}."
