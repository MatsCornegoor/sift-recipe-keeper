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

This will generate an APK file that can be distributed through F-Droid. The APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.

## Dependencies

All dependencies are open source and F-Droid compliant:

- React Native (Apache 2.0)
- All other dependencies are MIT/Apache 2.0 licensed

## Personal Notes

To build with fdroid server, use the correct conda environment:

```bash
conda activate experiments
```

If not installed

```bash
python3 -m pip install fdroidserver
```

Run the build

```bash
python3 -m fdroidserver build com.matscornegoor.sift
```
