import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("src/SubnetTreeCalculator.css");
const outDir = resolve("dist");
mkdirSync(outDir, { recursive: true });
copyFileSync(src, resolve(outDir, "style.css"));

console.log("Copied CSS to dist/style.css");
