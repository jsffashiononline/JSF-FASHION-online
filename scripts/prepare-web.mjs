import { mkdir, copyFile } from "node:fs/promises";

await mkdir("admin-app/assets", { recursive: true });

const files = [
  ["admin.html", "admin-app/index.html"],
  ["admin.js", "admin-app/admin.js"],
  ["admin-firebase.js", "admin-app/admin-firebase.js"],
  ["admin.css", "admin-app/admin.css"],
  ["premium-theme.css", "admin-app/premium-theme.css"],
  ["assets/jsf-fashion-logo.svg", "admin-app/assets/jsf-fashion-logo.svg"]
];

for (const [source, destination] of files) {
  await copyFile(source, destination);
}

console.log("Prepared the existing JSF FASHION admin panel for Android.");
