# Building the Android release APK with Docker

This lets you build the release APK without installing a JDK or the Android SDK
locally. Useful when your system JDK is too new for the project's Gradle version
(e.g. JDK 23+ vs. the Gradle 8.8 wrapper).

The image bundles the exact toolchain this project pins (see `android/build.gradle`):
JDK 17, Android SDK 34, build-tools 34.0.0, NDK 25.2.9519653, and Node 20.

## Quick start

From the repository root:

```bash
npm run build:docker
```

This runs `docker/build-android.sh`, which:

- builds the `sift-android-build` image on first run (skipped once it exists);
- runs `./gradlew assembleRelease` in the container, with the repo mounted at
  `/app`, so the APK lands in the usual location:
  `android/app/build/outputs/apk/release/app-release.apk`;
- caches Gradle dependencies in the `sift-gradle-cache` named volume so repeat
  builds skip downloads;
- restores ownership of the generated files to your host user (the container
  runs as root), so nothing is left root-owned in your working tree.

## Manual commands

If you'd rather not use the script:

```bash
# Build the image (once)
docker build -f docker/Dockerfile.android -t sift-android-build docker/

# Build the APK
docker run --rm \
  -v "$PWD":/app \
  -v sift-gradle-cache:/root/.gradle \
  sift-android-build \
  ./gradlew assembleRelease --no-daemon
```

Note: files generated this way are owned by root; `npm run build:docker` handles
that for you.

## Signing

- **Contributors / local builds:** with no release keystore configured, the
  release build is automatically signed with the debug key. The resulting APK is
  installable for testing but **not** suitable for distribution.
- **App owner / distribution:** configure a release keystore by adding the
  following to `android/local-gradle.properties` (not committed); the build then
  signs with that key automatically:

  ```properties
  MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
  MYAPP_RELEASE_STORE_PASSWORD=*****
  MYAPP_RELEASE_KEY_ALIAS=my-key-alias
  MYAPP_RELEASE_KEY_PASSWORD=*****
  ```

  The keystore path is resolved relative to `android/app/`.

## Installing alongside the published app

A debug-signed build can't be installed over the published app (different
signature) and can't coexist with it (same application id). Pass `-PsideBySide`
to build under a distinct application id (`app.siftrecipes.dev`, version suffix
`-dev`) so it installs as a separate app for local testing:

```bash
npm run build:docker -- -PsideBySide
```

Then install it (leaves the published app untouched):

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
# use `adb install -r ...` to update the .dev copy on later builds
```

`-PsideBySide` is opt-in and a no-op for normal release builds.
