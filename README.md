"version": "2026.6.1", -> year, month, build number


# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

## Building Android APK Locally

### Prerequisites

1. **Java 23**: Required for Gradle 8.10.2
   ```bash
   java --version
   # Should output: openjdk 23 2024-09-17
   ```

2. **Android SDK**: Ensure Android SDK is installed via Android Studio

3. **Environment Variables**: Create a `.env` file (see `.env.local.example`)

### Build Commands

#### Build for Production
```bash
yarn build-local:android:production
```
Builds the production APK with production API endpoint (`app.piquetapp.com`)

#### Build for Preview
```bash
yarn build-local:android:preview
```
Builds the preview APK with preview API endpoint (`piquet.rwinteractive.net`)

#### Build for Development
```bash
yarn build-local:android:development
```
Builds the development APK with your local API endpoint

#### Build Android App Bundle (AAB)
```bash
yarn build-local:android:bundle
```
Builds an Android App Bundle for Google Play Store submission

### Build Process

Each build command performs the following steps:

1. **Clean Prebuild**: Removes existing `android/` and `ios/` folders
2. **Expo Prebuild**: Generates native Android project with `--clean` flag
3. **Gradle Clean**: Cleans previous build artifacts
4. **Gradle Assemble**: Builds the release APK
5. **Open Output**: Opens the output folder with the APK

### Output Location

- **APK**: `android/app/build/outputs/apk/release/`
- **AAB**: `android/app/build/outputs/bundle/release/`

### Build Variants

The app supports multiple build variants based on `APP_ENV`:

| Environment | Package Name | API Endpoint |
|------------|--------------|--------------|
| Production | `com.piquetapp.customer` | `app.piquetapp.com` |
| Preview | `com.piquetapp.customer.preview` | `piquet.rwinteractive.net` |
| Development | `com.piquetapp.customer.development` | Local (from `.env`) |

### Troubleshooting

#### Google Services Configuration

The `google-services.json` file must include all package name variants:
- `com.piquetapp.customer` (production)
- `com.piquetapp.customer.preview` (preview)
- `com.piquetapp.customer.development` (development)

If you get an error like "No matching client found for package name", ensure all variants are configured in both:
- `/keys/google-services.json`
- `/android/app/google-services.json`

#### Gradle Version
Check your Gradle version in `android/gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-all.zip
```
Gradle 8.10.2 requires Java 23. See [Gradle compatibility matrix](https://docs.gradle.org/current/userguide/compatibility.html)

#### Clean Build
If you encounter build issues, clean everything:
```bash
yarn prebuild:clean
cd android && ./gradlew clean
```

---

# Possible fixes for gradle error:



I had the same issue and i resolved it by adding the following to android/app/build.gradle

android {

packagingOptions {
    pickFirst 'lib/x86/libc++_shared.so'
    pickFirst 'lib/x86_64/libc++_shared.so'
    pickFirst 'lib/armeabi-v7a/libc++_shared.so'
    pickFirst 'lib/arm64-v8a/libc++_shared.so'
}

/** rest of your code here **/

}
----------------------------------------------------------------------
yarn add react-native-gradle-plugin
----------------------------------------------------------------------
I've managed to get it working by taking a look at /android/gradle/gradle-wrapper.properties, on the variable distributionUrl you have the gradle version. Go to https://docs.gradle.org/current/userguide/compatibility.html and take a look at the compatible java version, mine was 8.10.2, so I needed java 23, which I installed:
❯ java --version
openjdk 23 2024-09-17
OpenJDK Runtime Environment (build 23)
OpenJDK 64-Bit Server VM (build 23, mixed mode, sharing)






Build for simulator

xcodebuild \
-workspace ios/PiquetPreview.xcworkspace \
-scheme PiquetPreview \
-configuration Release \
-sdk iphonesimulator \
-destination 'platform=iOS Simulator,OS=26.2,name=iPhone 17' \
-derivedDataPath build
