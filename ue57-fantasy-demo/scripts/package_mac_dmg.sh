#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <UE_ROOT> <PROJECT_UPROJECT> [OUTPUT_DIR]"
  echo "Example:"
  echo "  $0 /Users/Shared/Epic\\ Games/UE_5.7 /Users/me/UnrealProjects/FantasyRoam/FantasyRoam.uproject /Users/me/Desktop/FantasyBuild"
  exit 1
fi

UE_ROOT="$1"
PROJECT_PATH="$2"
OUTPUT_DIR="${3:-$(pwd)/build-artifacts}"
UE_ARCH="${UE_ARCH:-arm64}"

if [[ ! -d "${UE_ROOT}" ]]; then
  echo "UE root not found: ${UE_ROOT}"
  exit 1
fi

if [[ ! -f "${PROJECT_PATH}" ]]; then
  echo "Project file not found: ${PROJECT_PATH}"
  exit 1
fi

UAT="${UE_ROOT}/Engine/Build/BatchFiles/RunUAT.sh"
if [[ ! -x "${UAT}" ]]; then
  echo "RunUAT not found: ${UAT}"
  exit 1
fi

PROJECT_ABS="$(cd "$(dirname "${PROJECT_PATH}")" && pwd)/$(basename "${PROJECT_PATH}")"
PROJECT_NAME="$(basename "${PROJECT_PATH}" .uproject)"
ARCHIVE_DIR="${OUTPUT_DIR}/archive"
LOG_DIR="${OUTPUT_DIR}/logs"

mkdir -p "${ARCHIVE_DIR}" "${LOG_DIR}"

echo "Building and cooking project..."
"${UAT}" BuildCookRun \
  -project="${PROJECT_ABS}" \
  -platform=Mac \
  -architecture="${UE_ARCH}" \
  -clientconfig=Shipping \
  -build \
  -cook \
  -pak \
  -stage \
  -archive \
  -archivedirectory="${ARCHIVE_DIR}" \
  -prereqs \
  -nop4 \
  -utf8output \
  > "${LOG_DIR}/uat.log" 2>&1

APP_PATH="$(find "${ARCHIVE_DIR}" -type d -name "${PROJECT_NAME}.app" | head -n 1 || true)"
if [[ -z "${APP_PATH}" ]]; then
  echo "Packaged app not found. Check log: ${LOG_DIR}/uat.log"
  exit 1
fi

DMG_STAGE="${OUTPUT_DIR}/dmg-stage"
DMG_PATH="${OUTPUT_DIR}/${PROJECT_NAME}-macOS.dmg"

rm -rf "${DMG_STAGE}"
mkdir -p "${DMG_STAGE}"
cp -R "${APP_PATH}" "${DMG_STAGE}/"
ln -s /Applications "${DMG_STAGE}/Applications"

echo "Creating DMG..."
hdiutil create \
  -volname "${PROJECT_NAME}" \
  -srcfolder "${DMG_STAGE}" \
  -ov \
  -format UDZO \
  "${DMG_PATH}" \
  > "${LOG_DIR}/dmg.log" 2>&1

echo "Done."
echo "App: ${APP_PATH}"
echo "DMG: ${DMG_PATH}"
