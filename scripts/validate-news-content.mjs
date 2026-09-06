import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { unflatten } from "devalue";

const STORE_URL = new URL("../node_modules/.astro/data-store.json", import.meta.url);
const EXTERNAL_MARKDOWN_LINK = /\]\(\s*<?https?:\/\/|\]:\s*<?https?:\/\//im;

export function validateNewsEntries(entries) {
  const errors = [];
  const slugs = new Map();

  for (const [id, entry] of entries ?? []) {
    const { data } = entry;
    if (slugs.has(data.slug)) errors.push(`news/${id}.slug: duplicado con news/${slugs.get(data.slug)}`);
    slugs.set(data.slug, id);

    if (EXTERNAL_MARKDOWN_LINK.test(entry.body ?? "")) {
      errors.push(`news/${id}: contiene un enlace Markdown externo (http:// o https://)`);
    }

    for (const [index, product] of data.products.entries()) {
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
  const errors = [...validateNewsEntries(entries), ...(await validateImageFiles(entries))];
  if (errors.length > 0) throw new Error(`Contenido Work-first inválido:\n- ${errors.join("\n- ")}`);
  console.log(`Contenido Work-first válido: ${entries?.size ?? 0} noticias`);
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  await main();
}
