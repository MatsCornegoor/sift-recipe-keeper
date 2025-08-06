# Build Instructions for Sift Recipe Keeper

This document provides instructions for building the Sift Recipe Keeper app from source.

## Prerequisites

- Node.js 18+
- npm or yarn
- Android SDK (for Android builds)
- Java Development Kit (JDK)

## Building the App

### 1. Install Dependencies

Navigate to the project's root directory and run:

```bash
npm install
```

### 2. Build the Android App

For production builds, you will need to create a release key and add your signing information to `android/local-gradle.properties`.

Once your signing configuration is in place, run the following command from the project's root directory:

```bash
cd android && ./gradlew assembleRelease
```

This will generate a signed APK at `android/app/build/outputs/apk/release/app-release.apk`.

## F-Droid Build Instructions

To build the app for F-Droid, you will need to have the `fdroidserver` tools installed.

1.  **Install fdroidserver:**
    ```bash
    python3 -m pip install fdroidserver
    ```

2.  **Run the Build:**
    From the project's root directory, run:
    ```bash
    fdroid build app.siftrecipes
    ```

3. **To clear cache**
    ```bash
    rm -rf logs/ srclibs/ build/ tmp/ unsigned/ signed/
    ```