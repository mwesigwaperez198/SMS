# NovaAdmin Client

Shared production client for:

- Web: `dist/`
- Android: `android/`
- iOS: `ios/`
- Desktop: `electron/`

## Tooling

This repo includes portable Node under `.tools/node-v24.16.0-win-x64` for this machine. If Node is installed globally, regular `npm` commands also work.

## Web

```bash
npm install
npm run build
```

Upload `dist/` to the web host or serve it behind Nginx.

## Android

```bash
npm run cap:sync
cd android
gradlew.bat assembleDebug
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Android builds require Android SDK/command-line tools and Gradle.

## iOS

```bash
npm run cap:sync
npm run ios:open
```

iOS builds require macOS and Xcode.

## Desktop

```bash
npm run desktop:build
```

Desktop outputs are written to `release/`.
