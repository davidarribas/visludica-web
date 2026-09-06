import { access, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { unflatten } from "devalue";
import { load } from "js-yaml";

const STORE_URL = new URL("../node_modules/.astro/data-store.json", import.meta.url);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLISHERS_PATH = resolve(ROOT, "src/data/publishers.yaml");
const EXTERNAL_MARKDOWN_LINK = /\]\(\s*<?https?:\/\/|\]:\s*<?https?:\/\//im;
const NEWS_FILENAME = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

export function validatePublisherRegistry(publishers) {
  if (!Array.isArray(publishers)) return ["publishers.yaml: debe contener una lista"];

  const errors = [];
  const names = new Set();
  const slugs = new Set();
  const aliases = new Set();
  for (const [index, publisher] of publishers.entries()) {
    const path = `publishers.yaml[${index}]`;
    if (!publisher || typeof publisher !== "object") {
      errors.push(`${path}: debe ser una editorial`);
      continue;
    }
    if (typeof publisher.name !== "string" || publisher.name.trim() === "") errors.push(`${path}.name: obligatorio`);
    else if (names.has(publisher.name) || aliases.has(publisher.name)) errors.push(`${path}.name: duplicado`);
    else names.add(publisher.name);
    if (typeof publisher.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publisher.slug)) {
      errors.push(`${path}.slug: debe usar minúsculas y guiones`);
    } else if (slugs.has(publisher.slug)) errors.push(`${path}.slug: duplicado`);
    else slugs.add(publisher.slug);
    if (!Array.isArray(publisher.aliases)) errors.push(`${path}.aliases: debe ser una lista`);
    else for (const alias of publisher.aliases) {
      if (typeof alias !== "string" || alias.trim() === "") errors.push(`${path}.aliases: contiene un alias vacío`);
      else if (aliases.has(alias) || names.has(alias)) errors.push(`${path}.aliases: ${alias} está duplicado`);
      else aliases.add(alias);
    }
  }
  return errors;
}

export function validateNewsFilenames(files) {
  const errors = [];
  const slugs = new Map();
  for (const filename of files.filter((name) => name.endsWith(".md"))) {
    if (!NEWS_FILENAME.test(filename)) {
      errors.push(`news/${filename}: debe usar YYYY-MM-DD-<slug-descriptivo>.md`);
      continue;
    }
    const slug = filename.slice(11, -3);
    if (slugs.has(slug)) errors.push(`news/${filename}: slug duplicado con news/${slugs.get(slug)}`);
    else slugs.set(slug, filename);
  }
  return errors;
}

export function validateNewsEntries(entries, publishers) {
  const errors = [];
  const validPublishers = publishers?.filter((publisher) =>
    publisher && typeof publisher.name === "string" && Array.isArray(publisher.aliases)
  ) ?? [];
  const canonicalPublishers = new Set(validPublishers.map(({ name }) => name));
  const publisherAliases = new Map(
    validPublishers.flatMap(({ name, aliases }) => aliases.map((alias) => [alias, name])),
  );

  for (const [id, entry] of entries ?? []) {
    const { data } = entry;
    if (EXTERNAL_MARKDOWN_LINK.test(entry.body ?? "")) {
      errors.push(`news/${id}: contiene un enlace Markdown externo (http:// o https://)`);
    }

    for (const [index, product] of data.products.entries()) {
      if (publishers && product.publisher_es && !canonicalPublishers.has(product.publisher_es)) {
        const canonical = publisherAliases.get(product.publisher_es);
        errors.push(canonical
          ? `news/${id}.products[${index}].publisher_es: usa el alias ${product.publisher_es}; debe usar ${canonical}`
          : `news/${id}.products[${index}].publisher_es: no existe en publishers.yaml`);
      }
      if (product.players_max !== undefined && product.players_max < product.players_min) {
        errors.push(`news/${id}.products[${index}].players_max: debe ser >= players_min`);
      }
      if (product.duration_max !== undefined && product.duration_max < product.duration_min) {
        errors.push(`news/${id}.products[${index}].duration_max: debe ser >= duration_min`);
      }
    }
  }
  return errors;
}

async function validateImageFiles(entries) {
  const errors = [];
  for (const [id, entry] of entries ?? []) {
    if (!entry.data.image) continue;
    const path = resolve(new URL("../public", import.meta.url).pathname, entry.data.image.src.slice(1));
    try { await access(path); }
    catch { errors.push(`news/${id}.image.src: no existe ${entry.data.image.src}`); }
  }
  return errors;
}

async function main() {
  const store = unflatten(JSON.parse(await readFile(STORE_URL, "utf8")));
  const entries = store.get("news");
  const publishers = load(await readFile(PUBLISHERS_PATH, "utf8"));
  const contentRoot = resolve(ROOT, process.env.ASTRO_NEWS_CONTENT_ROOT ?? "./src/content");
  const errors = [
    ...validatePublisherRegistry(publishers),
    ...validateNewsFilenames(await readdir(resolve(contentRoot, "news"))),
    ...validateNewsEntries(entries, Array.isArray(publishers) ? publishers : []),
    ...(await validateImageFiles(entries)),
  ];
  if (errors.length > 0) throw new Error(`Contenido Work-first inválido:\n- ${errors.join("\n- ")}`);
  console.log(`Contenido Work-first válido: ${entries?.size ?? 0} noticias`);
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  await main();
}
