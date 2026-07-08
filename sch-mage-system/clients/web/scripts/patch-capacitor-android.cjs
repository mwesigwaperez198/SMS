const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function patchFile(relativePath, patches) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return;
  }

  let source = fs.readFileSync(filePath, "utf8");
  let next = source;

  for (const [find, replace] of patches) {
    next = next.replace(find, replace);
  }

  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`Patched ${relativePath}`);
  }
}

patchFile("android/build.gradle", [
  ["classpath 'com.android.tools.build:gradle:8.13.0'", "classpath 'com.android.tools.build:gradle:8.11.1'"],
  ["        classpath 'com.google.gms:google-services:4.4.4'\n", ""],
]);

patchFile("android/capacitor-cordova-android-plugins/build.gradle", [
  ["classpath 'com.android.tools.build:gradle:8.13.0'", "classpath 'com.android.tools.build:gradle:8.11.1'"],
  [/JavaVersion\.VERSION_21/g, "JavaVersion.VERSION_17"],
]);

patchFile("android/app/capacitor.build.gradle", [
  [/JavaVersion\.VERSION_21/g, "JavaVersion.VERSION_17"],
]);

patchFile("android/app/build.gradle", [
  [
    /\ntry \{\n    def servicesJSON = file\('google-services\.json'\)\n    if \(servicesJSON\.text\) \{\n        apply plugin: 'com\.google\.gms\.google-services'\n    \}\n\} catch\(Exception e\) \{\n    logger\.info\("google-services\.json not found, google-services plugin not applied\. Push Notifications won't work"\)\n\}\n/s,
    "\n",
  ],
]);

patchFile("node_modules/@capacitor/android/capacitor/build.gradle", [
  ["classpath 'com.android.tools.build:gradle:8.13.0'", "classpath 'com.android.tools.build:gradle:8.11.1'"],
  [/JavaVersion\.VERSION_21/g, "JavaVersion.VERSION_17"],
]);
