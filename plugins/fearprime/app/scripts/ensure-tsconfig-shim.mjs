import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(appDir, "../../..");
const shimDir = path.join(repoRoot, ".nuxt");
const shimPath = path.join(shimDir, "tsconfig.json");
const appTsconfig = path.relative(shimDir, path.join(appDir, ".nuxt/tsconfig.json"));

await mkdir(shimDir, { recursive: true });
await writeFile(
  shimPath,
  `${JSON.stringify({ extends: appTsconfig }, null, 2)}\n`,
);
