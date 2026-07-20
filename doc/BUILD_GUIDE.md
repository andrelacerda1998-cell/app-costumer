# Android APK Build Guide - Piquet Customer App

## 🎉 Setup Complete!

Your Android build system has been successfully configured with multiple environment support.

---

## 📋 Available Build Commands

### Production Build
```bash
yarn build-local:android:production
```
- **Package Name**: `com.piquetapp.customer`
- **API Endpoint**: `app.piquetapp.com`
- **Use Case**: Final production release

### Preview Build
```bash
yarn build-local:android:preview
```
- **Package Name**: `com.piquetapp.customer.preview`
- **API Endpoint**: `piquet.rwinteractive.net`
- **Use Case**: Testing with preview server

### Development Build
```bash
yarn build-local:android:development
```
- **Package Name**: `com.piquetapp.customer.development`
- **API Endpoint**: From your `.env` file (local development)
- **Use Case**: Local development and testing

### Android App Bundle (AAB)
```bash
yarn build-local:android:bundle
```
Generates an AAB file for Google Play Store submission.

---

## 🔧 What Each Command Does

1. **Clean Prebuild**: Removes existing native code
2. **Expo Prebuild**: Generates fresh Android project
3. **Gradle Clean**: Cleans previous build artifacts
4. **Gradle Assemble/Bundle**: Builds the APK or AAB
5. **Open Output**: Opens the folder containing the build

---

## 📁 Output Locations

### APK Files
```
android/app/build/outputs/apk/release/app-release.apk
```

### AAB Files
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## ⚙️ Build Configuration

### App Variants

| Environment | Package Name | App Name | API Endpoint |
|------------|--------------|----------|--------------|
| Production | `com.piquetapp.customer` | Piquet | `app.piquetapp.com` |
| Preview | `com.piquetapp.customer.preview` | Piquet Preview | `piquet.rwinteractive.net` |
| Development | `com.piquetapp.customer.development` | Piquet Development | Local from `.env` |

### Version Information
- **Version Code**: 11
- **Version Name**: 1.0.6 (from package.json)

---

## 🛠 Prerequisites

### Required Software

1. **Java 23** (Required for Gradle 8.10.2)
   ```bash
   java --version
   # Should output: openjdk 23 2024-09-17
   ```

2. **Android SDK**
   - Installed via Android Studio
   - SDK Platform 35 (compileSdkVersion)
   - Build Tools 35.0.0

3. **Node.js & Yarn**
   ```bash
   node --version
   yarn --version
   ```

### Environment Setup

Create a `.env` file in the project root (for development builds):
```env
EXPO_PUBLIC_DEV_API_DOMAIN=your-local-api-domain
EXPO_PUBLIC_DEV_API_PROTOCOL=http://
```

---

## 🔐 Google Services Configuration

The project is configured with Firebase services. The following package names are registered in `google-services.json`:

✅ `com.piquetapp.customer` (Production)
✅ `com.piquetapp.customer.preview` (Preview)  
✅ `com.piquetapp.customer.development` (Development)

**Note**: Both files must stay in sync:
- `/keys/google-services.json`
- `/android/app/google-services.json`

---

## 🐛 Troubleshooting

### Build Fails with "No matching client found"

**Problem**: Package name not found in `google-services.json`

**Solution**: Ensure your variant's package name is registered in both:
- `/keys/google-services.json`
- `/android/app/google-services.json`

### Gradle Version Issues

**Problem**: Incompatible Java version

**Solution**: 
1. Check Gradle version in `android/gradle/wrapper/gradle-wrapper.properties`
2. Install matching Java version: [Gradle Compatibility Matrix](https://docs.gradle.org/current/userguide/compatibility.html)

### Clean Build

If you encounter persistent build issues:

```bash
# Clean everything
yarn prebuild:clean
cd android && ./gradlew clean

# Or manually
rm -rf android ios node_modules
yarn install
yarn build-local:android:development
```

### Expo Prebuild Issues

```bash
# Force clean prebuild
expo prebuild --platform android --clean
```

---

## 📦 What Was Changed

### 1. Package.json Scripts

Added new build scripts:
- `prebuild:clean` - Removes native folders
- `prebuild:android` - Runs expo prebuild with clean flag
- `build-local:android` - Main build command
- `build-local:android:production` - Production build
- `build-local:android:preview` - Preview build
- `build-local:android:development` - Development build
- `build-local:android:bundle` - AAB bundle build

### 2. Google Services Configuration

Updated both `google-services.json` files with all package variants:
- Added `com.piquetapp.customer.preview`
- Added `com.piquetapp.customer.development`

### 3. Documentation

- Updated README.md with comprehensive build documentation
- Created this BUILD_GUIDE.md for detailed instructions

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Build development APK
yarn build-local:android:development

# 3. Find your APK in the opened folder
# File: app-release.apk
```

---

## 📱 Installing the APK

### On Physical Device

1. Transfer the APK to your device
2. Enable "Install from Unknown Sources" in Settings
3. Tap the APK file to install

### Using ADB

```bash
# Install directly via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or install and launch
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.piquetapp.customer.development/.MainActivity
```

---

## 🔄 Build Process Flow

```
Start
  ↓
Clean Previous Build (prebuild:clean)
  ↓
Generate Native Android Code (expo prebuild)
  ↓
Clean Gradle Cache (./gradlew clean)
  ↓
Bundle JavaScript & Assets (Metro Bundler)
  ↓
Compile Native Code (./gradlew assembleRelease)
  ↓
Package APK
  ↓
Open Output Folder
  ↓
Done! 🎉
```

---

## 📊 Build Statistics

**Latest Build (Development)**:
- **Time**: ~111 seconds (1m 51s)
- **Bundle Size**: 2532 modules
- **Tasks Executed**: 1503 tasks
- **Success**: ✅

---

## 🆘 Need Help?

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the README.md
3. Check build logs in terminal
4. Verify all prerequisites are installed

---

## 📝 Notes

- The build process automatically opens the output folder on macOS
- All builds are signed with the debug keystore by default
- For production releases, configure a production keystore
- The APK includes all assets and JavaScript bundle
- The build is optimized with Hermes engine enabled

---

**Last Updated**: January 30, 2026
**Build System Version**: Gradle 8.10.2, Expo 52.0.42
