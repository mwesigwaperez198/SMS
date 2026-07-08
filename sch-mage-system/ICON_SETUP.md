# NovaAdmin Branding & Icon Setup Guide

## Logo Asset Overview

**Logo File:** `novaadmin-logo.png` (uploaded)
- Contains: Blue book with "A" symbol, stars, graph lines
- Colors: Navy Blue (#003D82), Teal (#17A2B8), Yellow (#FFD700)
- Style: Modern, educational, professional
- Text: "NOVAADMIN SCHOOL MANAGEMENT SYSTEM"

---

## Web App (React/Vue)

### File Structure
```
public/
├── favicon.ico                 (16x16, 32x32)
├── favicon-16x16.png          (16x16)
├── favicon-32x32.png          (32x32)
├── apple-touch-icon.png       (180x180 - iPad)
├── mstile-150x150.png         (150x150 - Windows Tile)
├── android-chrome-192x192.png (192x192)
├── android-chrome-512x512.png (512x512)
├── logo.png                   (Full size logo - 1024x1024)
└── og-image.png               (Open Graph - 1200x630)

src/
├── assets/
│   ├── logo-light.svg
│   ├── logo-dark.svg
│   ├── icon-192.png
│   └── icon-512.png
```

### HTML Head Configuration (index.html)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#003D82">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    
    <!-- Apple Touch Icon -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    
    <!-- Android Chrome -->
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    
    <!-- Windows Tile -->
    <meta name="msapplication-TileColor" content="#003D82">
    <meta name="msapplication-TileImage" content="/mstile-150x150.png">
    
    <!-- Open Graph (Social Media) -->
    <meta property="og:image" content="https://novaadmin.com/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    
    <!-- Web App Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <title>NovaAdmin - School Management System</title>
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

### Web App Manifest (public/manifest.json)
```json
{
  "name": "NovaAdmin School Management System",
  "short_name": "NovaAdmin",
  "description": "Complete school management solution for students, teachers, and parents",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#003D82",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["education", "productivity"],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "540x720",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-desktop.png",
      "sizes": "1280x720",
      "form_factor": "wide"
    }
  ]
}
```

### React Component Usage
```typescript
// Logo component
export const Logo = () => (
  <img src="/logo.png" alt="NovaAdmin" width={40} height={40} />
);

// Dark mode variant
export const LogoDark = () => (
  <img src="/src/assets/logo-dark.svg" alt="NovaAdmin" />
);
```

---

## Android App (React Native / Kotlin / Flutter)

### Icon Sizes Required
```
mipmap-ldpi/    ic_launcher.png    36x36
mipmap-mdpi/    ic_launcher.png    48x48
mipmap-hdpi/    ic_launcher.png    72x72
mipmap-xhdpi/   ic_launcher.png    96x96
mipmap-xxhdpi/  ic_launcher.png   144x144
mipmap-xxxhdpi/ ic_launcher.png   192x192
```

### File Structure (Android)
```
android/
├── app/
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   └── res/
│       │       ├── mipmap-ldpi/
│       │       │   ├── ic_launcher.png (36x36)
│       │       │   └── ic_launcher_foreground.png
│       │       ├── mipmap-mdpi/
│       │       │   └── ic_launcher.png (48x48)
│       │       ├── mipmap-hdpi/
│       │       │   └── ic_launcher.png (72x72)
│       │       ├── mipmap-xhdpi/
│       │       │   └── ic_launcher.png (96x96)
│       │       ├── mipmap-xxhdpi/
│       │       │   └── ic_launcher.png (144x144)
│       │       └── mipmap-xxxhdpi/
│       │           └── ic_launcher.png (192x192)
│       └── res/
│           └── colors.xml
```

### AndroidManifest.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.novaadmin.school">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <!-- Activities, etc. -->
    </application>

</manifest>
```

### React Native Setup (expo)
```json
{
  "app.json": {
    "expo": {
      "name": "NovaAdmin",
      "slug": "novaadmin",
      "version": "1.0.0",
      "icon": "./assets/icon.png",
      "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#003D82"
      },
      "ios": {
        "supportsTabletMode": true,
        "bundleIdentifier": "com.novaadmin.school"
      },
      "android": {
        "adaptiveIcon": {
          "foregroundImage": "./assets/adaptive-icon.png",
          "backgroundColor": "#ffffff"
        },
        "package": "com.novaadmin.school"
      }
    }
  }
}
```

### Flutter Setup (pubspec.yaml)
```yaml
flutter:
  uses-material-design: true

flutter_icons:
  android: true
  ios: true
  image_path: "assets/icon/icon.png"
  
  # Adaptive icon for Android 8+
  adaptive_icon_background: "#ffffff"
  adaptive_icon_foreground: "assets/icon/adaptive-icon.png"
```

---

## iOS App (Native / Swift / React Native)

### Icon Sizes
```
Icon-20.png          20x20   (Notification)
Icon-29.png          29x29   (Settings)
Icon-40.png          40x40   (Spotlight)
Icon-60.png          60x60   (App iPhone)
Icon-76.png          76x76   (App iPad)
Icon-120.png        120x120  (App iPhone Retina)
Icon-152.png        152x152  (App iPad Retina)
Icon-167.png        167x167  (App iPad Pro)
Icon-180.png        180x180  (App iPhone 6 Plus)
```

### Info.plist Configuration
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIcons</key>
    <dict>
        <key>CFBundlePrimaryIcon</key>
        <dict>
            <key>CFBundleIconFiles</key>
            <array>
                <string>Icon-60</string>
                <string>Icon-120</string>
                <string>Icon-180</string>
            </array>
        </dict>
    </dict>
    
    <key>CFBundleIcons~ipad</key>
    <dict>
        <key>CFBundlePrimaryIcon</key>
        <dict>
            <key>CFBundleIconFiles</key>
            <array>
                <string>Icon-76</string>
                <string>Icon-152</string>
                <string>Icon-167</string>
            </array>
        </dict>
    </dict>
</dict>
</plist>
```

### Asset Catalog (Xcode)
```
Assets.xcassets/
└── AppIcon.appiconset/
    ├── Contents.json
    ├── Icon-20@1x.png
    ├── Icon-20@2x.png
    ├── Icon-20@3x.png
    ├── Icon-29@1x.png
    ├── Icon-29@2x.png
    ├── Icon-29@3x.png
    ├── Icon-40@1x.png
    ├── Icon-40@2x.png
    ├── Icon-40@3x.png
    ├── Icon-60@2x.png
    ├── Icon-60@3x.png
    ├── Icon-76@1x.png
    ├── Icon-76@2x.png
    ├── Icon-83.5@2x.png
    ├── Icon-1024@1x.png
```

---

## Desktop App (Electron / Tauri)

### Icon Sizes
```
icon.ico        (Windows) - 256x256
icon.png        (Linux)   - 512x512
icon.icns       (macOS)   - 512x512
```

### Electron Main Process (main.js)
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
});

// macOS dock icon
if (process.platform === 'darwin') {
  app.dock.setIcon(path.join(__dirname, 'assets/icon.icns'));
}
```

### Tauri Configuration (tauri.conf.json)
```json
{
  "build": {
    "iconPath": "src/assets/icon.png"
  },
  "tauri": {
    "window": {
      "title": "NovaAdmin",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    }
  }
}
```

### Electron Packager Config (package.json)
```json
{
  "name": "novaadmin",
  "version": "1.0.0",
  "build": {
    "appId": "com.novaadmin.app",
    "productName": "NovaAdmin",
    "files": [
      "dist/**/*",
      "assets/**/*"
    ],
    "win": {
      "target": [
        "nsis",
        "portable"
      ],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "assets/icon.icns",
      "category": "public.app-category.education"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "assets/icon.png"
    }
  }
}
```

---

## Icon Generation Workflow

### Using ImageMagick (command line)
```bash
# Create all web icons from original logo.png
convert logo.png -define icon:auto-resize=16,32,48,64 favicon.ico
convert logo.png -resize 192x192 android-chrome-192x192.png
convert logo.png -resize 512x512 android-chrome-512x512.png
convert logo.png -resize 180x180 apple-touch-icon.png
convert logo.png -resize 150x150 mstile-150x150.png
convert logo.png -resize 1200x630 og-image.png

# Android icons
convert logo.png -resize 36x36 android/mipmap-ldpi/ic_launcher.png
convert logo.png -resize 48x48 android/mipmap-mdpi/ic_launcher.png
convert logo.png -resize 72x72 android/mipmap-hdpi/ic_launcher.png
convert logo.png -resize 96x96 android/mipmap-xhdpi/ic_launcher.png
convert logo.png -resize 144x144 android/mipmap-xxhdpi/ic_launcher.png
convert logo.png -resize 192x192 android/mipmap-xxxhdpi/ic_launcher.png

# iOS icons
convert logo.png -resize 180x180 Icon-180.png
convert logo.png -resize 152x152 Icon-152.png
convert logo.png -resize 120x120 Icon-120.png
convert logo.png -resize 76x76 Icon-76.png
convert logo.png -resize 60x60 Icon-60.png

# Desktop icons
convert logo.png -resize 256x256 icon.ico
convert logo.png -resize 512x512 icon.png
```

### Using Online Tools (Alternative)
- **AppIcon.co** - Generates all sizes from one image
- **Icon Kitchen** - Creates cross-platform icons
- **Favicon Generator** - Web-specific icons
- **ConvertIO** - Format conversion

---

## Brand Color Palette

```css
/* Primary Colors */
--primary-dark: #003D82;     /* Navy Blue */
--primary: #17A2B8;          /* Teal */
--secondary: #FFD700;        /* Golden Yellow */

/* Backgrounds */
--bg-light: #F8F9FA;
--bg-white: #FFFFFF;

/* Text */
--text-dark: #212529;
--text-muted: #6C757D;

/* Status Colors */
--success: #28A745;          /* Green */
--warning: #FFC107;          /* Amber */
--danger: #DC3545;           /* Red */
--info: #17A2B8;             /* Teal */
```

---

## CSS/SCSS Logo Usage

```css
/* Logo component */
.logo {
  width: 40px;
  height: 40px;
  background-image: url('/logo.png');
  background-size: contain;
  background-repeat: no-repeat;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .logo {
    background-image: url('/src/assets/logo-dark.svg');
  }
}

/* Responsive */
@media (max-width: 768px) {
  .logo {
    width: 32px;
    height: 32px;
  }
}
```

---

## Checklist

- [ ] Generate all icon sizes
- [ ] Upload to web app (public folder)
- [ ] Create manifest.json
- [ ] Configure HTML head tags
- [ ] Setup Android icons in mipmap folders
- [ ] Configure Android Manifest
- [ ] Setup iOS Info.plist
- [ ] Create iOS asset catalog
- [ ] Generate desktop icons (Windows, Mac, Linux)
- [ ] Configure Electron/Tauri
- [ ] Test on all platforms
- [ ] Verify favicon appears in browser tab
- [ ] Test app icons in stores (Google Play, App Store)

---

## Files to Create/Upload

```
web/
├── public/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── mstile-150x150.png
│   ├── og-image.png
│   └── manifest.json
└── src/assets/
    ├── logo-light.svg
    └── logo-dark.svg

android/app/src/main/res/
├── mipmap-ldpi/ic_launcher.png
├── mipmap-mdpi/ic_launcher.png
├── mipmap-hdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
└── mipmap-xxxhdpi/ic_launcher.png

ios/
└── Assets.xcassets/AppIcon.appiconset/
    └── (all icon sizes)

desktop/
├── assets/icon.ico
├── assets/icon.icns
└── assets/icon.png
```

---

## Questions?
Email: branding@novaadmin.com
