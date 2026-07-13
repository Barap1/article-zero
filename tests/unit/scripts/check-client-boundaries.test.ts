import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const fixtureRoots: string[] = [];

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "article-zero-boundary-"));
  fixtureRoots.push(root);
  return root;
}

function writeFixtureFile(root: string, relativePath: string, content: string): void {
  const filePath = join(root, relativePath);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
}

function runBoundaryCheck(root: string): void {
  execFileSync("node", ["scripts/check-client-boundaries.mjs", root], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("check-client-boundaries", () => {
  it("fails when a client module imports a server-only provider", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/components/client.tsx", '"use client";\nimport "@/ai/groq-provider";');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("allows the enforcement gateway to import in-memory tools", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/hospital/enforcement-gateway.ts", 'import "./in-memory-tools";');

    expect(() => runBoundaryCheck(root)).not.toThrow();
  });

  it("fails when another hospital module imports in-memory tools relatively", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/hospital/other.ts", 'import "./in-memory-tools";');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("fails when another hospital module imports in-memory tools with an extension", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/hospital/other.ts", 'import "./in-memory-tools.ts";');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("fails when another hospital module imports in-memory tools by alias with an extension", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/hospital/other.ts", 'import "@/hospital/in-memory-tools.ts";');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("fails when a client module imports an AI provider by alias with an extension", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/components/client.tsx", '"use client";\nimport "@/ai/groq-provider.ts";');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("fails when a client module imports an AI provider from a nested relative path", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/components/nested/client.tsx", '"use client";\nimport "../../ai/groq-provider";');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("fails when another hospital module dynamically imports in-memory tools", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/hospital/other.ts", 'import("@/hospital/in-memory-tools");');

    expect(() => runBoundaryCheck(root)).toThrow();
  });

  it("fails when a client module dynamically imports an AI provider after a block comment", () => {
    const root = createFixture();
    writeFixtureFile(root, "src/components/client.tsx", '"use client";\nimport(/* permitted syntax */ "@/ai/groq-provider");');

    expect(() => runBoundaryCheck(root)).toThrow();
  });
});
