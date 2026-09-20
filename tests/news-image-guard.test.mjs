import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { MAX_NEWS_IMAGE_BYTES, newsImageWeightErrors } from "../scripts/validate-news-content.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("Header y Footer ya no descargan el logo grande para su representación pequeña", async () => {
  for (const component of ["src/components/Header.astro", "src/components/Footer.astro"]) {
    const source = await readFile(join(root, component), "utf8");
    assert.match(source, /src="\/logo-small\.png"/, `${component} debe usar la variante pequeña`);
    assert.doesNotMatch(source, /src="\/logo\.png"/, `${component} no debe referenciar el logo original`);
    assert.match(source, /width="(40|48)" height="(40|48)"/, `${component} reserva sus dimensiones`);
  }
});

test("la variante pequeña existe, es ligera, y el original sigue disponible para og:image", async () => {
  const small = await stat(join(root, "public/logo-small.png"));
  assert.ok(small.size < 60 * 1024, `logo-small.png pesa ${small.size} B; debe ser una variante ligera`);

  const header = await readFile(join(root, "src/layouts/BaseLayout.astro"), "utf8");
  assert.match(header, /image = '\/logo\.png'/, "el original sigue legítimamente como og:image por defecto");

  await access(join(root, "public/logo.png"));
});

test("el validador rechaza una imagen de noticia por encima del límite de peso", () => {
  const errors = newsImageWeightErrors([
    { id: "2026-09-15-ejemplo", src: "/images/news/foto-enorme.jpg", bytes: 600 * 1024 },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /news\/2026-09-15-ejemplo\.image\.src/);
  assert.match(errors[0], /foto-enorme\.jpg/);
  assert.match(errors[0], /máximo permitido es 500 KB/);
});

test("imágenes dentro del límite pasan y el umbral cubre el corpus actual", () => {
  assert.deepEqual(newsImageWeightErrors([{ id: "x", src: "/images/news/foto.jpg", bytes: 439 * 1024 }]), []);
  // El límite admite exactamente su valor (se rechaza solo por encima).
  assert.deepEqual(newsImageWeightErrors([{ id: "x", src: "/images/news/foto.jpg", bytes: MAX_NEWS_IMAGE_BYTES }]), []);
  // El máximo del corpus optimizado (429 KiB) queda dentro.
  assert.ok(MAX_NEWS_IMAGE_BYTES > 439 * 1024, "el umbral debe dejar margen sobre el corpus actual");
});
