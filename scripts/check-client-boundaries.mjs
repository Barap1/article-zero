import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const sourceRoot = join(root, "src");
const aiRoot = join(sourceRoot, "ai");
const inMemoryTools = join(sourceRoot, "hospital", "in-memory-tools");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (sourceExtensions.has(path.slice(path.lastIndexOf(".")))) {
      files.push(path);
    }
  }
  return files;
}

function importSpecifiers(source) {
  return [
    ...source.matchAll(/\b(?:import|export)\s*(?:[^"']*?\s+from\s*)?["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(\s*(?:\/\*[\s\S]*?\*\/\s*)*["']([^"']+)["']/g),
  ].map((match) => match[1]);
}

function isRelativeImportOf(filePath, moduleSpecifier, target) {
  return moduleSpecifier.startsWith(".") && resolve(dirname(filePath), moduleSpecifier).replace(/\.[cm]?[jt]sx?$/, "") === target;
}

function isRelativeImportWithin(filePath, moduleSpecifier, target) {
  const normalizedPath = resolve(dirname(filePath), moduleSpecifier).replace(/\.[cm]?[jt]sx?$/, "");
  return moduleSpecifier.startsWith(".") && (normalizedPath === target || normalizedPath.startsWith(`${target}${sep}`));
}

function isClientProtectedImport(filePath, moduleSpecifier) {
  const normalizedSpecifier = moduleSpecifier.replace(/\.[cm]?[jt]sx?$/, "");
  return (
    normalizedSpecifier === "server-only" ||
    normalizedSpecifier === "groq-sdk" ||
    normalizedSpecifier === "@/ai" ||
    normalizedSpecifier.startsWith("@/ai/") ||
    normalizedSpecifier === "src/ai" ||
    normalizedSpecifier.startsWith("src/ai/") ||
    isRelativeImportWithin(filePath, moduleSpecifier, aiRoot)
  );
}

function isInMemoryToolsImport(filePath, moduleSpecifier) {
  const normalizedSpecifier = moduleSpecifier.replace(/\.[cm]?[jt]sx?$/, "");
  return (
    normalizedSpecifier === "@/hospital/in-memory-tools" ||
    normalizedSpecifier === "src/hospital/in-memory-tools" ||
    isRelativeImportOf(filePath, moduleSpecifier, inMemoryTools)
  );
}

const violations = [];
if (statSync(sourceRoot, { throwIfNoEntry: false })?.isDirectory()) {
  for (const filePath of collectSourceFiles(sourceRoot)) {
    const source = readFileSync(filePath, "utf8");
    const fileName = relative(root, filePath).split(sep).join("/");
    const specifiers = importSpecifiers(source);
    if (/^[\"']use client[\"'];?/m.test(source)) {
      for (const moduleSpecifier of specifiers) {
        if (isClientProtectedImport(filePath, moduleSpecifier)) {
          violations.push(`${fileName}: client module imports protected module ${moduleSpecifier}`);
        }
      }
    }
    if (fileName !== "src/hospital/enforcement-gateway.ts" && specifiers.some((specifier) => isInMemoryToolsImport(filePath, specifier))) {
      violations.push(`${fileName}: only src/hospital/enforcement-gateway.ts may import in-memory-tools directly`);
    }
  }
}

if (violations.length > 0) {
  console.error("Client boundary check failed:\n" + violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Client boundary check passed.");
}
