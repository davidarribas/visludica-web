import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const readDist = (path) => readFile(join(root, "dist", path), "utf8");

// El suite construye dist/ antes de ejecutar los tests (npm test = build + tests).

test("el skip link existe en todas las páginas y apunta al contenido principal real", async () => {
  for (const page of ["index.html", "noticias/index.html", "podcast/index.html", "power-ranking/index.html"]) {
    const html = await readDist(page);
    assert.match(html, /<a class="skip-link" href="#contenido-principal"[^>]*>Saltar al contenido<\/a>/, `falta skip link en ${page}`);
    assert.match(html, /<main id="contenido-principal"/, `el destino del skip link no existe en ${page}`);
  }
});

test("el menú «Más» ya no declara el patrón ARIA Menu incompleto", async () => {
  const html = await readDist("index.html");
  assert.doesNotMatch(html, /role="menu"/);
  assert.doesNotMatch(html, /role="menuitem"/);
  assert.doesNotMatch(html, /role="none"/);
  assert.doesNotMatch(html, /aria-haspopup="true"/);
});

test("el control del desplegable mantiene sus relaciones accesibles", async () => {
  const html = await readDist("index.html");
  const button = html.match(/<button[^>]*class="[^"]*dropdown-btn[^"]*"[^>]*>/)?.[0];
  assert.ok(button, "no se encuentra el control del desplegable");
  assert.match(button, /aria-expanded="false"/);
  assert.match(button, /aria-controls="mas-menu"/);
  assert.match(html, /<ul id="mas-menu" class="dropdown-menu"/, "el panel anunciado debe existir");
  assert.match(html, /<a href="https:\/\/barton\.visludica\.com"|href="[^"]*"[^>]*class="dropdown-item"/, "los enlaces del desplegable siguen presentes");
});

test("el Power Ranking ya no declara tabs parciales y usa botones con estado", async () => {
  const html = await readDist("power-ranking/index.html");
  assert.doesNotMatch(html, /role="tab"/);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.doesNotMatch(html, /aria-selected/);

  // El selector de vistas: grupo de botones con aria-pressed (uno activo).
  const group = html.match(/<div class="view-tabs"[^>]*>[\s\S]*?<\/div>/)?.[0];
  assert.ok(group, "no se encuentra el selector de vistas");
  assert.match(group, /role="group" aria-label="Tipo de clasificación"/);
  const viewButtons = group.match(/<button[^>]*data-view-button="[^"]+"[^>]*>/g) ?? [];
  assert.equal(viewButtons.length, 4);
  assert.ok(viewButtons.every((button) => button.includes("aria-pressed=")), "cada botón de vista expone su estado");
  assert.equal(viewButtons.filter((button) => button.includes('aria-pressed="true"')).length, 1);
});

test("el desplegable implementa Escape con devolución de foco al control", async () => {
  const source = await readFile(join(root, "src/components/Header.astro"), "utf8");
  assert.match(source, /closeDropdownAndFocus/);
  assert.match(source, /e\.key === 'Escape'/);
  assert.match(source, /dropdownBtn\?\.focus\(\)/);
  // El global.css mantiene el outline de foco; no se elimina sin sustitución.
  const globalCss = await readFile(join(root, "src/styles/global.css"), "utf8");
  assert.match(globalCss, /:focus-visible\s*\{[^}]*outline:/);
});

test("no quedan aria-controls que apunten a IDs inexistentes en las zonas modificadas", async () => {
  const html = await readDist("index.html");
  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(controls.length > 0);
  for (const id of controls) {
    assert.match(html, new RegExp(`id="${id}"`), `aria-controls apunta a un ID inexistente: ${id}`);
  }
});
