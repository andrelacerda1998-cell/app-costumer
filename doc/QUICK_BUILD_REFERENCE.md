# 🚀 Quick Reference - Android Build Commands

## One-Line Commands

```bash
# Development Build (Default)
yarn build-local:android:development

# Preview Build
yarn build-local:android:preview

# Production Build
yarn build-local:android:production

# Android App Bundle (for Play Store)
yarn build-local:android:bundle
```

## Output Location

```
📁 android/app/build/outputs/apk/release/app-release.apk
```

## Build Status

✅ **Last Build**: Successful (78 MB)
⏱️ **Build Time**: ~2 minutes
📦 **Size**: 78 MB

## Quick Install

```bash
# Install via ADB
adb install android/app/build/outputs/apk/release/app-release.apk
```

## What's Different from app-vendor?

### ✅ Implemented (Similar to app-vendor)

- ✅ Multiple build variants (production, preview, development)
- ✅ Clean build process with prebuild
- ✅ Automatic folder opening after build
- ✅ Gradle clean before assembly
- ✅ Google Services configuration for all variants
- ✅ Comprehensive documentation

### 📝 Package Details

| App | Production Package | Preview Package | Development Package |
|-----|-------------------|-----------------|---------------------|
| **Vendor** | com.piquetapp.vendor | com.piquetapp.vendor.preview | com.piquetapp.vendor.development |
| **Customer** | com.piquetapp.customer | com.piquetapp.customer.preview | com.piquetapp.customer.development |

## Environment Variables

Each build uses different API endpoints configured in `app.config.ts`:

- **Production**: `app.piquetapp.com`
- **Preview**: `piquet.rwinteractive.net`  
- **Development**: From your `.env` file

## Troubleshooting One-Liners

```bash
# Clean everything and rebuild
yarn prebuild:clean && yarn build-local:android:development

# Just clean gradle
cd android && ./gradlew clean && cd ..

# Check Java version (need Java 23)
java --version

# Check APK details
adb shell dumpsys package com.piquetapp.customer.development
```

---

**For full documentation, see `BUILD_GUIDE.md`**
