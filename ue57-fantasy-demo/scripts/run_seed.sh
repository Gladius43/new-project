#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <UE_ROOT> <PROJECT_UPROJECT> [MAP_PATH]"
  echo "Example:"
  echo "  $0 /Users/Shared/Epic\\ Games/UE_5.7 /Users/me/UnrealProjects/FantasyRoam/FantasyRoam.uproject /Game/Maps/L_FantasyRoam"
  exit 1
fi

UE_ROOT="$1"
PROJECT_PATH="$2"
MAP_PATH="${3:-/Game/Maps/L_FantasyRoam}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="$(cd "${SCRIPT_DIR}/../tools" && pwd)"
SEED_SCRIPT="${TOOLS_DIR}/seed_fantasy_world.py"

EDITOR_CMD="${UE_ROOT}/Engine/Binaries/Mac/UnrealEditor-Cmd"
if [[ ! -x "${EDITOR_CMD}" ]]; then
  EDITOR_CMD="${UE_ROOT}/Engine/Binaries/Mac/UnrealEditor"
fi

if [[ ! -x "${EDITOR_CMD}" ]]; then
  echo "UnrealEditor binary not found in: ${UE_ROOT}"
  exit 1
fi

if [[ ! -f "${PROJECT_PATH}" ]]; then
  echo "Project file not found: ${PROJECT_PATH}"
  exit 1
fi

if [[ ! -f "${SEED_SCRIPT}" ]]; then
  echo "Seed script not found: ${SEED_SCRIPT}"
  exit 1
fi

echo "Running world seed script..."
"${EDITOR_CMD}" "${PROJECT_PATH}" "${MAP_PATH}" \
  -run=pythonscript \
  -script="${SEED_SCRIPT}" \
  -unattended \
  -nop4 \
  -nosplash

echo "Done. Open the map in Unreal and press Play."
