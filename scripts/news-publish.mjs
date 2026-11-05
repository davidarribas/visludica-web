#!/usr/bin/env node
// Prepara una noticia para su publicación efectiva (WORK_FIRST_NEWS_PLAN §37):
// fija published_at con la hora real de Madrid y, si cambia el día, renombra el
// fichero para que el prefijo YYYY-MM-DD siga siendo la fecha de publicación.
// La URL pública no cambia: depende solo del slug.
//
// Uso: node scripts/news-publish.mjs <slug> [--now <ISO>]
// Salida: una línea JSON con el fichero anterior, el nuevo y published_at.

import { readFile, rename, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  ROOT, contentNewsDir, findNewsFile, madridTimestamp, normalizeSlug, replacePublishedAt,
} from "./news-lib.mjs";

export async function publish(slugInput, { now } = {}) {
  const slug = normalizeSlug(slugInput);
  const current = await findNewsFile(slug);
  if (!current) throw new Error(`NOTICIA_NO_ENCONTRADA: no hay ninguna noticia con el slug ${slug}.`);

  const publishedAt = madridTimestamp(now ? new Date(now) : new Date());
  const target = resolve(contentNewsDir(), `${publishedAt.slice(0, 10)}-${slug}.md`);
  const source = await readFile(current, "utf8");
  await writeFile(current, replacePublishedAt(source, publishedAt));
  if (target !== current) await rename(current, target);

  return {
    slug,
    previous_file: relative(ROOT, current),
    file: relative(ROOT, target),
    published_at: publishedAt,
    renamed: target !== current,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const nowIndex = args.indexOf("--now");
  const now = nowIndex >= 0 ? args.splice(nowIndex, 2)[1] : undefined;
  try {
    if (!args[0]) throw new Error("USO: node scripts/news-publish.mjs <slug> [--now ISO]");
    console.log(JSON.stringify(await publish(args[0], { now })));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
