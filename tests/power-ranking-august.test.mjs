import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("agosto es la edición por defecto y julio sigue en el histórico", async () => {
  const [current, august, july] = await Promise.all([
    readFile(join(root, "dist/power-ranking/index.html"), "utf8"),
    readFile(join(root, "dist/power-ranking/2026/08/index.html"), "utf8"),
    readFile(join(root, "dist/power-ranking/2026/07/index.html"), "utf8"),
  ]);

  assert.match(current, /<title>Power Ranking — Agosto 2026/);
  assert.match(current, /<option value="\/power-ranking\/2026\/08" selected/);
  assert.match(current, /<option value="\/power-ranking\/2026\/07"/);
  assert.match(august, />Acumulado 2026</);
  assert.doesNotMatch(august, /Palmarés/i);
  assert.match(july, /<title>Power Ranking — Julio 2026/);
});

test("los datos principales de agosto coinciden con las fuentes revisadas", async () => {
  const data = JSON.parse(await readFile(join(root, "src/data/power-ranking/2026-08/data.json"), "utf8"));
  const ludica = data.projects["vis-ludica"];
  const belica = data.projects["vis-belica"];

  assert.deepEqual(ludica.stats, { voters: 181, distinctGames: 322, totalPoints: 1082 });
  assert.deepEqual(
    ludica.rankings.monthly.slice(0, 3).map(({ title, points, votes }) => ({ title, points, votes })),
    [
      { title: "The Elder Scrolls: La Traición de la Segunda Era", points: 41, votes: 17 },
      { title: "Arkham Horror LCG", points: 26, votes: 12 },
      { title: "D-Day at Omaha Beach", points: 23, votes: 10 },
    ],
  );
  assert.deepEqual(
    ludica.rankings.annual.slice(0, 3).map(({ rank, score }) => ({ rank, score })),
    [{ rank: 1, score: 1.28 }, { rank: 2, score: 1.102 }, { rank: 3, score: 1.001 }],
  );
  assert.deepEqual(belica.stats, { voters: 64, distinctGames: 74, totalPoints: 237 });
  assert.deepEqual(
    belica.rankings.annual.slice(0, 3).map(({ rank, score }) => ({ rank, score })),
    [{ rank: 1, score: 2.641 }, { rank: 2, score: 1.0816 }, { rank: 3, score: 0.9998 }],
  );
});

test("las dos descargas revisadas se publican por separado", async () => {
  const [main, belica] = await Promise.all([
    readFile(join(root, "public/downloads/power-ranking/power_ranking_agosto_2026_revisado.xlsx")),
    readFile(join(root, "public/downloads/power-ranking/power_ranking_vis_belica_agosto_2026_revisado.xlsx")),
  ]);

  assert.equal(main.subarray(0, 2).toString(), "PK");
  assert.equal(belica.subarray(0, 2).toString(), "PK");
  assert.notEqual(main.length, belica.length);
});
