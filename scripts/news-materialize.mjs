#!/usr/bin/env node
// Materializa en el repositorio una noticia ya redactada por el paso editorial
// (WORK_FIRST_NEWS_PLAN, Parte B, §35). Es código determinista: no redacta ni
// corrige; escribe, normaliza la imagen y valida contra el contrato real.
//
// Uso:
//   node scripts/news-materialize.mjs <pieza.json> [opciones]
//     --replace            sustituye una noticia existente con el mismo slug
//                          (corrección o cambio de imagen); conserva su fecha
//     --now <ISO>          momento provisional de publicación (por defecto, ahora)
//     --pr-body <fichero>  escribe ahí el cuerpo del pull request
//     --no-validate        no ejecuta astro sync + validación (solo para pruebas)
//   node scripts/news-materialize.mjs --print-slug <pieza.json>
//
// Pieza (JSON):
//   {
//     "slug": "sky-team-turbulence",          // propuesto; se normaliza
//     "frontmatter": { title, summary, event, products, tags?, date? },
//     "body_markdown": "…",
//     "telegram": "…",                        // < 1000 caracteres, sin enlaces
//     "image": { "url" | "path" | "telegram_file_path": "…", "alt": "…" },
//     "fuentes_internas": [{ "url": "…", "aporta": "…" }],
//     "dudas": ["…"],
//     "origen": "bot" | "freshrss_marcado" | "freshrss_consulta"
//   }
//
// published_at, schema e image.src los pone este script; si la pieza los trae,
// se ignoran. La imagen se convierte a WebP de 1200 px de ancho como máximo y
// menos de 200 KB, en public/images/news/<slug>.webp.
//
// Salida: una línea JSON en stdout con slug, rama, fichero y published_at.
// Si algo falla, no deja ficheros a medias y sale con código distinto de 0.

import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import {
  IMAGE_MAX_WIDTH, IMAGE_TARGET_BYTES, ROOT, buildPullRequestBody, contentNewsDir,
  findNewsFile, madridTimestamp, normalizeSlug, pieceErrors, publicDir,
  renderNewsFile,
} from "./news-lib.mjs";

const run = promisify(execFile);

function parseArgs(argv) {
  const options = { replace: false, validate: true };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--replace") options.replace = true;
    else if (arg === "--no-validate") options.validate = false;
    else if (arg === "--print-slug") options.printSlug = true;
    else if (arg === "--now") options.now = argv[++i];
    else if (arg === "--pr-body") options.prBody = argv[++i];
    else rest.push(arg);
  }
  options.input = rest[0];
  return options;
}

async function loadImage(image) {
  if (image.path) return readFile(resolve(process.cwd(), image.path));
  let url = image.url;
  if (image.telegram_file_path) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("IMAGEN_NO_DISPONIBLE: falta TELEGRAM_BOT_TOKEN para descargar la imagen de Telegram.");
    url = `https://api.telegram.org/file/bot${token}/${image.telegram_file_path}`;
  }
  const response = await fetch(url, {
    headers: { "User-Agent": "visludica-news-materializer/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const where = image.telegram_file_path ? "Telegram" : image.url;
    throw new Error(`IMAGEN_NO_DISPONIBLE: ${where} respondió HTTP ${response.status}.`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** WebP de como mucho IMAGE_MAX_WIDTH px; baja calidad hasta quedar bajo IMAGE_TARGET_BYTES. */
export async function normalizeImage(input) {
  const base = sharp(input, { failOn: "error" }).rotate()
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .flatten({ background: "#ffffff" });
  let output;
  for (const quality of [82, 74, 66, 58, 50]) {
    output = await base.clone().webp({ quality, effort: 5 }).toBuffer();
    if (output.length <= IMAGE_TARGET_BYTES) break;
  }
  if (output.length > IMAGE_TARGET_BYTES) {
    output = await sharp(output).resize({ width: 900 }).webp({ quality: 60, effort: 5 }).toBuffer();
  }
  return output;
}

async function validate() {
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" };
  try {
    await run(resolve(ROOT, "node_modules/.bin/astro"), ["sync"], { cwd: ROOT, env, maxBuffer: 20 * 1024 * 1024 });
    await run(process.execPath, [resolve(ROOT, "scripts/validate-news-content.mjs")], { cwd: ROOT, env, maxBuffer: 20 * 1024 * 1024 });
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`
      .split("\n").map((line) => line.replace(/\x1b\[[0-9;]*m/g, "").trimEnd()).filter(Boolean);
    const relevant = output.filter((line) => /inválid|invalid|error|debe|obligatori|expected|required|news\//i.test(line));
    throw new Error(`VALIDACION_FALLIDA:\n${(relevant.length ? relevant : output).slice(-25).join("\n")}`);
  }
}

export async function materialize(piece, options = {}) {
  const errors = pieceErrors(piece);
  if (errors.length) throw new Error(`PIEZA_INVALIDA:\n- ${errors.join("\n- ")}`);

  const slug = normalizeSlug(piece.slug);
  const existing = await findNewsFile(slug);
  if (existing && !options.replace) {
    throw new Error(`SLUG_EXISTENTE: ya hay una noticia ${relative(ROOT, existing)}; usa --replace para corregirla o propone otro slug.`);
  }

  let previousSource;
  let publishedAt = madridTimestamp(options.now ? new Date(options.now) : new Date());
  if (existing) {
    previousSource = await readFile(existing, "utf8");
    if (!options.now) publishedAt = previousSource.match(/^published_at: (.+)$/m)?.[1] ?? publishedAt;
  }
  const file = resolve(contentNewsDir(), `${publishedAt.slice(0, 10)}-${slug}.md`);

  const { published_at: _p, schema: _s, image: _i, ...editorial } = piece.frontmatter;
  const frontmatter = { schema: "visludica-news-v1", ...editorial, published_at: publishedAt };

  let imageFile;
  let previousImage;
  if (piece.image) {
    const src = `/images/news/${slug}.webp`;
    imageFile = resolve(publicDir(), src.slice(1));
    previousImage = await readFile(imageFile).catch(() => undefined);
    const buffer = await normalizeImage(await loadImage(piece.image));
    await mkdir(resolve(publicDir(), "images/news"), { recursive: true });
    await writeFile(imageFile, buffer);
    frontmatter.image = { src, alt: piece.image.alt.trim() };
  } else if (previousSource) {
    const kept = previousSource.match(/^image:\n {2}src: (\S+)\n {2}alt: (.+)$/m);
    if (kept) frontmatter.image = { src: kept[1], alt: JSON.parse(kept[2]) };
  }

  await mkdir(contentNewsDir(), { recursive: true });
  if (existing && existing !== file) await rm(existing);
  await writeFile(file, renderNewsFile(frontmatter, piece.body_markdown));

  if (options.validate !== false) {
    try {
      await validate();
    } catch (error) {
      // Deshace exactamente lo escrito: el repositorio queda como estaba.
      await rm(file, { force: true });
      if (previousSource) await writeFile(existing, previousSource);
      if (imageFile) {
        if (previousImage) await writeFile(imageFile, previousImage);
        else await rm(imageFile, { force: true });
      }
      throw error;
    }
  }

  const result = {
    slug,
    branch: `news/${slug}`,
    file: relative(ROOT, file),
    image: frontmatter.image?.src ?? null,
    title: frontmatter.title,
    published_at: publishedAt,
    replaced: Boolean(existing),
  };
  if (options.prBody) {
    await writeFile(options.prBody, buildPullRequestBody(piece, {
      file: result.file, imageSrc: result.image, publishedAt,
    }));
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const options = parseArgs(process.argv.slice(2));
  try {
    if (!options.input) throw new Error("USO: node scripts/news-materialize.mjs <pieza.json> [--replace] [--now ISO] [--pr-body fichero]");
    const piece = JSON.parse(await readFile(options.input, "utf8"));
    if (options.printSlug) {
      console.log(normalizeSlug(piece.slug));
    } else {
      console.log(JSON.stringify(await materialize(piece, options)));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

