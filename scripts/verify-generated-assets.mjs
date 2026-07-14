import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const requiredAssets = [
  "public/generated/article-zero-seal.webp",
  "public/generated/breach-lattice.webp",
  "public/generated/verified-lattice.webp",
];
const missingAssets = requiredAssets.filter((asset) => !existsSync(join(root, asset)));
const oversizedAssets = requiredAssets.filter((asset) => existsSync(join(root, asset)) && statSync(join(root, asset)).size > 500_000);

if (missingAssets.length > 0) {
  console.error("Generated asset verification failed. Missing required Task 15 assets:\n" + missingAssets.join("\n"));
  process.exitCode = 1;
} else if (oversizedAssets.length > 0) {
  console.error("Generated asset verification failed. Assets exceed the 500 KB budget:\n" + oversizedAssets.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Generated asset verification passed.");
}
