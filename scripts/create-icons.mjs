import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("assets/jsf-fashion-logo.svg");
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

for (const [density, size] of Object.entries(sizes)) {
  const dir = "android/app/src/main/res/mipmap-" + density;
  await mkdir(dir, { recursive: true });
  await sharp(svg).resize(size, size).png().toFile(dir + "/ic_launcher.png");
  await sharp(svg).resize(size, size).png().toFile(dir + "/ic_launcher_round.png");
}

const drawableDir = "android/app/src/main/res/drawable";
const adaptiveDir = "android/app/src/main/res/mipmap-anydpi-v26";
const valuesDir = "android/app/src/main/res/values";
await Promise.all([mkdir(drawableDir, { recursive: true }), mkdir(adaptiveDir, { recursive: true }), mkdir(valuesDir, { recursive: true })]);

const foreground = await sharp(svg).resize(324, 324).extend({
  top: 54, bottom: 54, left: 54, right: 54,
  background: { r: 6, g: 21, b: 47, alpha: 0 }
}).png().toBuffer();
await writeFile(drawableDir + "/ic_launcher_foreground.png", foreground);

const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
  '  <background android:drawable="@color/ic_launcher_background"/>\n' +
  '  <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n' +
  '</adaptive-icon>';
await writeFile(adaptiveDir + "/ic_launcher.xml", adaptive);
await writeFile(adaptiveDir + "/ic_launcher_round.xml", adaptive);
await writeFile(valuesDir + "/ic_launcher_background.xml", '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#06152F</color></resources>');

const stringsPath = valuesDir + "/strings.xml";
let strings = await readFile(stringsPath, "utf8");
const appName = '<string name="app_name">JSF FASHION Admin</string>';
if (/<string name="app_name">[\s\S]*?<\/string>/.test(strings)) {
  strings = strings.replace(/<string name="app_name">[\s\S]*?<\/string>/, appName);
} else {
  strings = strings.replace("</resources>", "  " + appName + "\n</resources>");
}
await writeFile(stringsPath, strings);

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");
if (!/<application\b/.test(manifest)) throw new Error("Android manifest application element was not found.");
manifest = manifest.replace(/<application\b([^>]*)>/, (_match, attrs) => {
  const clean = attrs.replace(/\s+android:icon="[^"]*"/g, "").replace(/\s+android:roundIcon="[^"]*"/g, "");
  return '<application' + clean + ' android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round">';
});
if (!/android:icon="@mipmap\/ic_launcher"/.test(manifest)) throw new Error("Launcher icon was not applied to AndroidManifest.xml.");
await writeFile(manifestPath, manifest);
console.log("JSF launcher icons generated and verified in AndroidManifest.xml.");