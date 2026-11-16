import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("assets/jsf-fashion-logo.svg");
const sizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192
};

for (const [density, size] of Object.entries(sizes)) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  await mkdir(dir, { recursive: true });
  await sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher_round.png`);
}

const drawableDir = "android/app/src/main/res/drawable-nodpi";
const adaptiveDir = "android/app/src/main/res/mipmap-anydpi-v26";
const valuesDir = "android/app/src/main/res/values";
await Promise.all([
  mkdir(drawableDir, { recursive: true }),
  mkdir(adaptiveDir, { recursive: true }),
  mkdir(valuesDir, { recursive: true })
]);

const foreground = await sharp(svg)
  .resize(324, 324)
  .extend({
    top: 54, bottom: 54, left: 54, right: 54,
    background: { r: 6, g: 21, b: 47, alpha: 0 }
  })
  .png()
  .toBuffer();

await writeFile(`${drawableDir}/ic_launcher_foreground.png`, foreground);

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

await writeFile(`${adaptiveDir}/ic_launcher.xml`, adaptive);
await writeFile(`${adaptiveDir}/ic_launcher_round.xml`, adaptive);

const colorsPath = `${valuesDir}/ic_launcher_background.xml`;
await writeFile(colorsPath, `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#06152F</color></resources>`);

const stringsPath = `${valuesDir}/strings.xml`;
let strings = await readFile(stringsPath, "utf8");
if (/<string name="app_name">.*?<\\/string>/.test(strings)) {
  strings = strings.replace(/<string name="app_name">.*?<\\/string>/, '<string name="app_name">JSF FASHION Admin</string>');
} else {
  strings = strings.replace("</resources>", '  <string name="app_name">JSF FASHION Admin</string>\n</resources>');
}
await writeFile(stringsPath, strings);

console.log("Applied the existing JSF logo as the Android launcher icon.");
