import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const fixtureRoots: string[] = [];

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "article-zero-assets-"));
  fixtureRoots.push(root);
  return root;
}

function runAssetCheck(root: string): void {
  execFileSync("node", ["scripts/verify-generated-assets.mjs", root], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("verify-generated-assets", () => {
  it("fails until every required generated asset exists", () => {
    const root = createFixture();

    expect(() => runAssetCheck(root)).toThrow();
  });

  it("passes when the complete generated asset set is present", () => {
    const root = createFixture();
    const generated = join(root, "public", "generated");
    mkdirSync(generated, { recursive: true });
    for (const name of ["article-zero-seal.webp", "constitutional-field.webm", "constitutional-field-poster.webp"]) {
      writeFileSync(join(generated, name), "fixture");
    }

    expect(() => runAssetCheck(root)).not.toThrow();
  });
});
