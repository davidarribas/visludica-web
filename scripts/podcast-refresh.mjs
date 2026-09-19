#!/usr/bin/env node
// Actualiza el snapshot last-known-good del feed de Captivate
// (src/data/podcast/feed-snapshot.json).
//
// Es la única forma en que el snapshot cambia: `npm run podcast:refresh`.
// El build normal nunca escribe en el repositorio. Si el remoto falla o no es
// válido, el script falla con exit 1 SIN tocar el snapshot existente.
//
// Después de actualizar, revisa el diff y haz commit si los cambios son correctos.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  DEFAULT_FEED_URL,
  DEFAULT_SNAPSHOT_PATH,
  FEED_TIMEOUT_MS,
  fetchRemoteFeed,
} from '../src/lib/podcast-feed.mjs';

try {
  const { feed, fetchedAt } = await fetchRemoteFeed({
    feedUrl: DEFAULT_FEED_URL,
    timeoutMs: FEED_TIMEOUT_MS,
  });

  const snapshot = {
    captured_at: fetchedAt.toISOString(),
    feed_url: DEFAULT_FEED_URL,
    episodes: feed.episodes,
    meta: feed.meta,
  };

  await mkdir(dirname(DEFAULT_SNAPSHOT_PATH), { recursive: true });
  await writeFile(DEFAULT_SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Snapshot actualizado (${feed.episodes.length} episodios): ${DEFAULT_SNAPSHOT_PATH}`);
} catch (error) {
  console.error(`No se pudo actualizar el snapshot: ${error.message}`);
  console.error('El snapshot existente no se ha modificado.');
  process.exit(1);
}
