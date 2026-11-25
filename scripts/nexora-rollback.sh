#!/usr/bin/env bash
set -euo pipefail

PREV_TAG="${1:?Usage: ./scripts/nexora-rollback.sh <previous-git-sha> [profile]}"
PROFILE="${2:-dev}"

echo "[nexora-rollback] Rolling back Nexora Field OS to image tag=${PREV_TAG}..."
NEXORA_IMAGE_TAG="${PREV_TAG}" NEXORA_BUILD_LOCAL=0 "$(dirname "$0")/nexora-deploy.sh" "${PROFILE}"
