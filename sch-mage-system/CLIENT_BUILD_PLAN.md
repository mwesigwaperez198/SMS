# NovaAdmin Web, Android, iOS, and Desktop Plan

The backend is now prepared for a shared client strategy:

- Web: React + Vite production build served from `https://novaadmin.kesug.com`
- Android APK: Capacitor Android wrapper around the same web app
- iOS app: Capacitor iOS wrapper around the same web app
- Desktop app: Electron or Tauri wrapper around the same web app

## Required Local Tooling

Install these before generating app binaries:

- Node.js LTS + npm
- Android Studio + Android SDK for APK builds
- Xcode on macOS for iOS builds
- Electron Builder or Tauri CLI for desktop installers

## Recommended Client Layout

```text
clients/
  web/        # React/Vite role-aware UI
  mobile/     # Capacitor Android/iOS projects generated from web build
  desktop/    # Electron/Tauri shell generated from web build
```

## Production API Base URL

All clients should use:

```text
https://novaadmin.kesug.com
```

## Role UX

The frontend should route dashboards by the `role` returned from:

```http
GET /api/v1/auth/me
```

Supported roles:

- `super_admin`
- `school_admin`
- `principal`
- `teacher`
- `student`
- `parent`
- `accountant`
- `librarian`
- `transport_manager`
- `receptionist`

## Build Commands Once Node Is Installed

```bash
npm create vite@latest clients/web -- --template react-ts
cd clients/web
npm install
npm run build
```

Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init NovaAdmin com.kesug.novaadmin --web-dir dist
npx cap add android
npx cap add ios
npm run build
npx cap sync
npx cap open android
npx cap open ios
```

Desktop with Electron:

```bash
npm install electron electron-builder --save-dev
npm run build
npm run dist
```

Note: iOS builds require macOS and Xcode; they cannot be produced on this Windows machine.
