import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const requiredAssets = [
  "public/generated/article-zero-seal.webp",
  "public/generated/constitutional-field.webm",
  "public/generated/constitutional-field-poster.webp",
];
const missingAssets = requiredAssets.filter((asset) => !existsSync(join(root, asset)));

if (missingAssets.length > 0) {
  console.error("Generated asset verification failed. Missing required Task 15 assets:\n" + missingAssets.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Generated asset verification passed.");
}
