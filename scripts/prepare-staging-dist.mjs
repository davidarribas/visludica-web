import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputDirectory = resolve("dist");
if (!existsSync(outputDirectory)) throw new Error("No existe dist; ejecuta el build de Astro antes de preparar staging");

// This artifact is deployed only by the isolated staging workflow. Keeping it
// out of public/ avoids changing headers when the production site is built.
writeFileSync(resolve(outputDirectory, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n");
