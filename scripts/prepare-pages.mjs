import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const textExtensions = new Set([".html", ".css", ".js", ".json"]);
let replacements = 0;

async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
    } else if ([...textExtensions].some((ext) => entry.name.endsWith(ext))) {
      const original = await readFile(path, "utf8");
      const updated = original.replaceAll("/assets/", "/v3pro/assets/");
      if (updated !== original) {
        replacements += original.split("/assets/").length - 1;
        await writeFile(path, updated);
      }
    }
  }
}

await visit(root);
if (replacements === 0) throw new Error("No asset references were rewritten");
console.log(`Rewrote ${replacements} asset references for GitHub Pages`);
