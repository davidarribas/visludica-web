import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

async function publicSpreadsheets(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await publicSpreadsheets(path)));
    else if (entry.name.endsWith(".xlsx")) found.push(path);
  }
  return found;
}

async function zipEntryText(file, entry) {
  try {
    const { stdout } = await execFileAsync("unzip", ["-p", file, entry], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return "";
  }
}

test("septiembre es la edición por defecto y agosto y julio siguen en el histórico", async () => {
  const [current, august, july] = await Promise.all([
    readFile(join(root, "dist/power-ranking/index.html"), "utf8"),
    readFile(join(root, "dist/power-ranking/2026/08/index.html"), "utf8"),
    readFile(join(root, "dist/power-ranking/2026/07/index.html"), "utf8"),
  ]);

  assert.match(current, /<title>Power Ranking — Septiembre 2026/);
  assert.match(current, /<option value="\/power-ranking\/2026\/09\/" selected/);
  assert.match(current, /<option value="\/power-ranking\/2026\/08\/"/);
  assert.match(august, /<title>Power Ranking — Agosto 2026/);
  assert.match(current, /<option value="\/power-ranking\/2026\/07\/"/);
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
  assert.equal(belica.power_ranking[0].power, "0.387590");
  assert.equal(belica.annual_ranking[0].annual, "3.797");
});

test("ningún Excel público del ranking expone papeletas individuales", async () => {
  // dist/ es el resultado público real tras el build: cualquier xlsx publicado
  // acabaría aquí, esté o no enlazado desde la interfaz. Se valida su contenido
  // (nombres de hoja y cadenas compartidas), no su tamaño ni su firma ZIP.
  for (const file of await publicSpreadsheets(join(root, "dist"))) {
    const [workbook, sharedStrings] = await Promise.all([
      zipEntryText(file, "xl/workbook.xml"),
      zipEntryText(file, "xl/sharedStrings.xml"),
    ]);
    assert.doesNotMatch(workbook, /name="[^"]*Votos[^"]*"/, `${file} publica una hoja de votos individuales`);
    assert.doesNotMatch(
      sharedStrings,
      />Votante<|>Comentario<|>1º \(3 pts\)</,
      `${file} publica alias, comentarios o papeletas individuales`,
    );
  }
});

test("agosto conserva su presentación sin descargas de Excel", async () => {
  const ranking = await readFile(join(root, "dist/power-ranking/2026/08/index.html"), "utf8");
  assert.doesNotMatch(ranking, /href="[^"]*\.xlsx"/);
});
