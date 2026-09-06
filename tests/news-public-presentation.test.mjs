import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("Godzilla se publica sin enlace externo ni metadatos editoriales de cabecera", async () => {
  const detail = await readFile(
    join(root, "dist/noticias/king-of-tokyo-godzilla-disponible-devir/index.html"),
    "utf8",
  );

  assert.match(detail, /<p>Devir tiene ya disponible/);
  assert.doesNotMatch(detail, /https:\/\/devir\.es/);
  assert.doesNotMatch(detail, /Fecha editorial sin confirmar/);
  assert.doesNotMatch(detail, />Lanzamiento</);
  assert.match(detail, />Distribución<\/dt><dd[^>]*>Devir Iberia<\/dd>/);
  assert.match(detail, />2–6 jugadores<\/dd>/);
});
