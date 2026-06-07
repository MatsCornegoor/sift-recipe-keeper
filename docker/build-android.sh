#!/usr/bin/env bash
# Build the Sift Android release APK inside Docker, then restore ownership of
# the generated files to the current host user (the container runs as root).
#
# Useful when the host JDK is too new for the project's Gradle wrapper.
# See docker/README.md for details.
set -euo pipefail

IMAGE=sift-android-build
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Build the toolchain image on first run (or when it's been removed).
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "==> Building $IMAGE image (first run only, downloads the Android SDK)..."
  docker build --platform linux/amd64 -f "$REPO_ROOT/docker/Dockerfile.android" -t "$IMAGE" "$REPO_ROOT/docker"
fi

HOST_UID="$(id -u)"
HOST_GID="$(id -g)"

echo "==> Building release APK..."
# Any extra args are forwarded to Gradle, e.g.:
#   npm run build:docker -- -PsideBySide   (install alongside the published app)
GRADLE_ARGS="$*"

# The container runs as root, so Gradle/AGP can auto-install SDK packages. We
# chown the Gradle-generated dirs back to the host user afterwards (always, even
# if the build fails) so they aren't left root-owned in the working tree.
docker run --rm --platform linux/amd64 \
  -v "$REPO_ROOT":/app \
  -v sift-gradle-cache:/root/.gradle \
  -v sift-android-gradle-cache:/app/android/.gradle \
  "$IMAGE" \
  bash -c "./gradlew assembleRelease --no-daemon ${GRADLE_ARGS}; status=\$?; chown -R ${HOST_UID}:${HOST_GID} /app/android /app/node_modules; exit \$status"

echo "==> Done. APK: android/app/build/outputs/apk/release/app-release.apk"
