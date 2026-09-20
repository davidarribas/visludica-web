import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { tableStatus } from "../src/lib/power-ranking/ranking-table.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const componentSource = () => readFile(
  new URL("../src/components/PowerRankingExperience.astro", import.meta.url),
  "utf8",
);

const base = {
  query: "",
  visibleLimit: 25,
  matchesCount: 100,
  availableRows: 100,
  totalCount: 808,
  pageSize: 25,
};

test("con datos.json cargado el contador anuncia el total completo", () => {
  const status = tableStatus({ ...base, fullDataLoaded: true });
  assert.deepEqual(status, { shown: 25, total: 808, showMoreHidden: false, showMoreLabel: "Mostrar 25 más" });

  const nearEnd = tableStatus({ ...base, fullDataLoaded: true, visibleLimit: 790 });
  assert.deepEqual(nearEnd, { shown: 790, total: 808, showMoreHidden: false, showMoreLabel: "Mostrar 18 más" });

  const complete = tableStatus({ ...base, fullDataLoaded: true, visibleLimit: 808 });
  assert.equal(complete.showMoreHidden, true);
});

test("si datos.json falla, el total es el dataset disponible y nunca hay cifras imposibles", () => {
  // Escenario del bug: "125 de 808" con solo 100 filas en el DOM.
  const degraded = tableStatus({ ...base, fullDataLoaded: false, visibleLimit: 125 });
  assert.equal(degraded.total, 100, "el total no anuncia filas inaccesibles");
  assert.equal(degraded.shown, 100, "no se muestra más de lo disponible");
  assert.equal(degraded.showMoreHidden, true, "«Mostrar más» desaparece al alcanzar el dataset parcial");

  const start = tableStatus({ ...base, fullDataLoaded: false });
  assert.equal(start.total, 100);
  assert.equal(start.shown, 25);
  assert.equal(start.showMoreLabel, "Mostrar 25 más");

  // La búsqueda degradada solo opera sobre el dataset disponible.
  const searched = tableStatus({ ...base, fullDataLoaded: false, query: "catan", matchesCount: 3, visibleLimit: 25 });
  assert.equal(searched.total, 3);
  assert.equal(searched.shown, 3);
  assert.equal(searched.showMoreHidden, true);
});

test("el total degradado nunca supera el dataset disponible, pase lo que pase fuera", () => {
  for (const visibleLimit of [0, 25, 99, 100, 125, 808]) {
    const status = tableStatus({ ...base, fullDataLoaded: false, visibleLimit });
    assert.ok(status.total <= base.availableRows);
    assert.ok(status.shown <= base.availableRows);
    assert.equal(status.showMoreHidden, visibleLimit >= base.availableRows);
  }
});

test("el cliente del ranking degrada con aviso accesible y sin reintentos", async () => {
  const source = await componentSource();
  // El estado de carga completa se activa solo tras insertar filas de datos.json…
  assert.match(source, /fullDataLoaded = true/);
  // …el fallo muestra el aviso (role=status, texto real, oculto por defecto)…
  assert.match(source, /data-data-status role="status" hidden/);
  assert.match(source, /if \(dataStatus\) dataStatus\.hidden = false/);
  // …y el pie se calcula con el estado coherente (contador y «Mostrar más»).
  assert.match(source, /tableStatus\(\{/, "filterRows debe usar el cálculo compartido");
  // El fallo se cachea: la promesa única evita reintentos y spam de avisos.
  assert.match(source, /if \(fullDataPromise\) return fullDataPromise;/);
});
