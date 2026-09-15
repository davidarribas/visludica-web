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

test("los datos principales de agosto coinciden con public-results-v1", async () => {
  const data = JSON.parse(await readFile(join(root, "src/data/power-ranking/2026-08/public-results.json"), "utf8"));
  const ludica = data.projects["vis-ludica"];
  const belica = data.projects["vis-belica"];

  assert.equal(data.schema_version, "public-results-v1");
  assert.deepEqual(
    { voters: ludica.stats.valid_voters, distinctGames: ludica.stats.distinct_games, totalPoints: ludica.stats.total_points },
    { voters: 181, distinctGames: 322, totalPoints: 1082 },
  );
  assert.deepEqual(
    ludica.monthly_ranking.slice(0, 3).map(({ game_id, points, voters }) => ({ game_id, points, voters })),
    [
      { game_id: "vlg_000830", points: 41, voters: 17 },
      { game_id: "vlg_000070", points: 26, voters: 12 },
      { game_id: "vlg_000240", points: 23, voters: 10 },
    ],
  );
  assert.equal(ludica.power_ranking[0].power, "0.216800");
  assert.equal(ludica.annual_ranking[0].annual, "1.282");
  assert.deepEqual(
    { voters: belica.stats.valid_voters, distinctGames: belica.stats.distinct_games, totalPoints: belica.stats.total_points },
    { voters: 63, distinctGames: 73, totalPoints: 235 },
  );
  assert.equal(belica.power_ranking[0].power, "0.386810");
  assert.equal(belica.annual_ranking[0].annual, "3.681");
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
