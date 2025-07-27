# Build Instructions for Sift Recipe Keeper

## Overview

Sift is a React Native app that needs to be built using standard React Native build tools.

## Build Requirements

- Node.js 18+
- npm
- Android SDK (for Android builds)

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Commands

For production builds, first make sure you are in the `android` directory:

```bash
cd android
./gradlew assembleRelease
```

This will generate an APK file that can be distributed. The APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.


## Personal Notes

To build with f-droid:

make sure it is installed (also the gradlew-fdroid wrapper)
```bash
python3 -m pip install fdroidserver
```

Run the build

```bash
fdroid build com.matscornegoor.sift
```