import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const general = {"2026-06": "eb524fdfba5a3f38c7f422da30de9c46b9a025dec10f873bf727fbc9250e0348", "2026-07": "b69b19004717a2986cc09f3a56133a66d8f0b506f67eb8d3c9678e4205f19f8f", "2026-08": "4f27a613c09fa305a63de48355f5273131189a3d7d5aa1e835c344cf047ef135", "2026-09": "a63d7b57c86b92e24a85ef52bf9a9cfd17e5ee98323669ebfdba2fb867ca4894"};
const editorial = {"2026-06": "f9c96c61b7c32b212263838d04442f39adcb655ed9b0341c539a98fbe0598274", "2026-07": "23b464d5f5406ce2cd9a7e016a69e92195a264a4af92f9d70e40931495683657", "2026-08": "d59142e25b863c27b0c3a993f82359b6e50a8ae87b6140de3f86b4a4dadc324d", "2026-09": "fcf312c41e8feaacd862981b0bf9416bd3354ce7ac2d0e5cbcf7d985185d1cac"};
test('la corrección de Kanal conserva íntegros los datos y textos generales publicados', () => {
  for (const [month, expected] of Object.entries(general)) {
    const filename = month < '2026-08' ? 'data.json' : 'public-results.json';
    const data = JSON.parse(readFileSync(`src/data/power-ranking/${month}/${filename}`, 'utf8'));
    assert.equal(hash(JSON.stringify(data.projects['vis-ludica'])), expected, month);
    const text = readFileSync(`src/data/power-ranking/${month}/editorial.ts`, 'utf8');
    assert.equal(hash(text.split(/['"]vis-belica['"]/)[0]), editorial[month], month);
    assert.ok(!JSON.stringify(data.projects['vis-belica']).includes('vlg_000455'), month);
    assert.ok(!JSON.stringify(data.projects['vis-belica']).includes('Kanal'), month);
  }
  assert.equal(hash(readFileSync('public/downloads/power-ranking/2026-09/power_ranking_septiembre_2026_publico.xlsx')), '632521fac77afa9ad5ac4be5e6667b2adfc51ef0b9a92f78ad4539ab9da6c6f3');
});
test('las cuatro ediciones muestran el historial oficial corregido y septiembre conserva su mensual', () => {
  for (const month of Object.keys(general)) {
    const filename = month < '2026-08' ? 'data.json' : 'public-results.json';
    const data = JSON.parse(readFileSync(`src/data/power-ranking/${month}/${filename}`, 'utf8'));
    const project = data.projects['vis-belica'];
    if (month < '2026-08') assert.deepEqual(project.voterHistory.slice(0, 4).map(row => row.value), [17, 18, 33, 40]);
    else assert.deepEqual(project.voter_history.slice(0, 4).map(row => row.valid_voters), [17, 18, 33, 40]);
  }
  const september = JSON.parse(readFileSync('src/data/power-ranking/2026-09/public-results.json', 'utf8')).projects['vis-belica'];
  assert.equal(september.annual_ranking[0].annual, '4.179');
});
