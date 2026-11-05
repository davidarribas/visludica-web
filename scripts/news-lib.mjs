// Utilidades compartidas por la materialización y la publicación automática
// de noticias. Sin dependencias de Astro: se pueden probar en aislamiento.

import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export const ROOT = resolve(new URL("..", import.meta.url).pathname);
export const TIME_ZONE = "Europe/Madrid";
export const TELEGRAM_MAX_CHARS = 1000;
export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_TARGET_BYTES = 200 * 1024;

export function contentNewsDir(env = process.env) {
  return resolve(ROOT, env.ASTRO_NEWS_CONTENT_ROOT ?? "./src/content", "news");
}

export function publicDir(env = process.env) {
  return resolve(ROOT, env.ASTRO_NEWS_PUBLIC_DIR ?? "./public");
}

/** Minúsculas, sin acentos, solo [a-z0-9-], sin guiones repetidos ni en los extremos. */
export function normalizeSlug(value) {
  const slug = String(value ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!slug) throw new Error("SLUG_INVALIDO: el slug propuesto queda vacío al normalizarlo.");
  return slug.slice(0, 80).replace(/-+$/, "");
}

/** Marca temporal ISO 8601 en hora de Madrid con su desplazamiento: 2026-11-05T07:40:00+01:00 */
export function madridTimestamp(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  const offset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName.replace("GMT", "");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

export function madridDate(date = new Date()) {
  return madridTimestamp(date).slice(0, 10);
}

/** Busca la noticia de un slug con cualquier prefijo de fecha. */
export async function findNewsFile(slug, env = process.env) {
  const files = await readdir(contentNewsDir(env)).catch(() => []);
  const match = files.find((name) => /^\d{4}-\d{2}-\d{2}-/.test(name) && name.slice(11, -3) === slug && name.endsWith(".md"));
  return match ? resolve(contentNewsDir(env), match) : undefined;
}

// --- Frontmatter --------------------------------------------------------------
// Se escribe a mano para conservar el estilo de las noticias existentes: textos
// entre comillas dobles, enumerados, números y fechas sin comillas. El contrato
// real lo comprueba después src/content.config.ts; aquí no se duplica.

const PRODUCT_KEYS = [
  "name", "type", "parent", "bgg_id", "designers", "publisher_es", "distributor_es",
  "players_min", "players_max", "duration_min", "duration_max", "age_min",
  "price_eur", "release_date", "language",
];
const BARE_KEYS = new Set(["schema", "event", "type", "published_at", "src"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function scalar(key, value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "string") throw new Error(`FRONTMATTER_INVALIDO: ${key} no es un valor simple.`);
  if (BARE_KEYS.has(key) || DATE.test(value)) return value;
  return JSON.stringify(value);
}

function ordered(object, order) {
  const keys = [...order.filter((key) => key in object), ...Object.keys(object).filter((key) => !order.includes(key))];
  return keys.filter((key) => object[key] !== undefined && object[key] !== null && object[key] !== "");
}

function emit(lines, indent, key, value) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    lines.push(`${pad}${key}:`);
    for (const item of value) lines.push(`${pad}  - ${scalar(key, item)}`);
  } else if (value && typeof value === "object") {
    lines.push(`${pad}${key}:`);
    for (const child of ordered(value, [])) emit(lines, indent + 2, child, value[child]);
  } else {
    lines.push(`${pad}${key}: ${scalar(key, value)}`);
  }
}

export function serializeFrontmatter(data) {
  const lines = [];
  for (const key of ordered(data, ["schema", "title", "summary", "date", "published_at", "event", "image", "products", "tags"])) {
    const value = data[key];
    if (key === "products") {
      lines.push("products:");
      for (const product of value) {
        const keys = ordered(product, PRODUCT_KEYS);
        keys.forEach((productKey, index) => {
          const itemLines = [];
          emit(itemLines, 4, productKey, product[productKey]);
          if (index === 0) itemLines[0] = `  - ${itemLines[0].trimStart()}`;
          lines.push(...itemLines);
        });
      }
    } else {
      emit(lines, 0, key, value);
    }
  }
  return lines.join("\n");
}

export function renderNewsFile(frontmatter, body) {
  return `---\n${serializeFrontmatter(frontmatter)}\n---\n\n${String(body).trim()}\n`;
}

/** Sustituye published_at en un fichero ya escrito sin tocar nada más. */
export function replacePublishedAt(source, timestamp) {
  if (!/^published_at: .+$/m.test(source)) throw new Error("PUBLISHED_AT_AUSENTE: la noticia no tiene published_at.");
  return source.replace(/^published_at: .+$/m, `published_at: ${timestamp}`);
}

// --- Comprobaciones previas que el schema no cubre --------------------------

const LINK = /(https?:\/\/|www\.|t\.me\/)/i;

export function telegramErrors(text) {
  const errors = [];
  if (typeof text !== "string" || text.trim() === "") return ["telegram: falta el texto para Telegram"];
  const length = [...text.trim()].length;
  if (length >= TELEGRAM_MAX_CHARS) errors.push(`telegram: tiene ${length} caracteres; debe quedarse por debajo de ${TELEGRAM_MAX_CHARS}`);
  if (LINK.test(text)) errors.push("telegram: contiene un enlace; la versión de Telegram va sin enlaces");
  return errors;
}

export function pieceErrors(piece) {
  const errors = [];
  if (!piece || typeof piece !== "object") return ["la pieza debe ser un objeto JSON"];
  if (!piece.slug) errors.push("slug: falta el slug propuesto");
  if (!piece.frontmatter || typeof piece.frontmatter !== "object") errors.push("frontmatter: falta");
  if (typeof piece.body_markdown !== "string" || piece.body_markdown.trim() === "") errors.push("body_markdown: falta el cuerpo");
  errors.push(...telegramErrors(piece.telegram));
  const image = piece.image;
  if (image) {
    const sources = ["url", "path", "telegram_file_path"].filter((key) => image[key]);
    if (sources.length !== 1) errors.push("image: indica exactamente una de url, path o telegram_file_path");
    if (typeof image.alt !== "string" || image.alt.trim() === "") errors.push("image.alt: falta el texto alternativo");
    if (image.url && !/^https:\/\//.test(image.url)) errors.push("image.url: debe ser https");
  }
  return errors;
}

// --- Cuerpo del pull request ---------------------------------------------------
// Las marcas HTML permiten que el bot extraiga cada bloque sin interpretar Markdown.

export function buildPullRequestBody(piece, { file, imageSrc, publishedAt }) {
  const sources = (piece.fuentes_internas ?? [])
    .map(({ url, aporta }) => `- ${url}${aporta ? ` — ${aporta}` : ""}`).join("\n") || "- (sin fuentes declaradas)";
  const doubts = (piece.dudas ?? []).filter(Boolean).map((doubt) => `- ${doubt}`).join("\n") || "- Ninguna";
  return [
    `Noticia generada en modo automático (origen: \`${piece.origen ?? "desconocido"}\`).`,
    "",
    `- Fichero: \`${file}\``,
    `- Imagen: ${imageSrc ? `\`${imageSrc}\`` : "sin imagen"}`,
    `- \`published_at\` provisional: ${publishedAt} (se fija al publicar)`,
    "",
    "## Telegram",
    "",
    "<!-- telegram:start -->",
    piece.telegram.trim(),
    "<!-- telegram:end -->",
    "",
    "## Dudas",
    "",
    "<!-- dudas:start -->",
    doubts,
    "<!-- dudas:end -->",
    "",
    "## Fuentes internas",
    "",
    "<!-- fuentes:start -->",
    sources,
    "<!-- fuentes:end -->",
    "",
  ].join("\n");
}
