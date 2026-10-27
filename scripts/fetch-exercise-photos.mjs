import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const media = readFileSync(new URL("../src/data/exercise-media.ts", import.meta.url), "utf8");
const pairs = [...media.matchAll(/"([^"]+)": "([^"]+)"/g)].map((match) => [match[1], match[2]]);

let fetched = 0;
for (const [slug, id] of pairs) {
  const folder = new URL(`../public/exercises/${slug}/`, import.meta.url);
  mkdirSync(folder, { recursive: true });
  for (const frame of [0, 1]) {
    const target = new URL(`${frame}.jpg`, folder);
    if (existsSync(target)) continue;
    const response = await fetch(`${source}/${encodeURIComponent(id)}/${frame}.jpg`);
    if (!response.ok) throw new Error(`${slug} (${id}) frame ${frame}: ${response.status}`);
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    fetched += 1;
  }
}
console.log(`${pairs.length} ejercicios, ${fetched} fotos nuevas`);
