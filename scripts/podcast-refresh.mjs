#!/usr/bin/env node
// Actualiza el contenido del podcast (snapshot last-known-good) y su
// identidad pública (registro GUID→slug).
//
// Es la única forma en que cambian: `npm run podcast:refresh`.
// El build normal nunca escribe en el repositorio.
//
// Flujo: fetch → parse → validación → resolución de identidades →
// escritura atómica (primero el registro, después el snapshot), solo cuando
// todo ha validado. Los GUID ya conocidos conservan su slug aunque cambie el
// título o el orden; los GUID nuevos reciben un slug derivado del título y
// quedan reservados; los GUID ausentes del feed NO se eliminan del registro.
//
// Si el remoto falla o es inválido, el script falla con exit 1 SIN tocar el
// snapshot ni el registro existentes. Tras actualizar, revisa el diff y haz
// commit si los cambios son correctos.

import {
  DEFAULT_FEED_URL,
  DEFAULT_REGISTRY_PATH,
  DEFAULT_SNAPSHOT_PATH,
  FEED_TIMEOUT_MS,
  refreshFeed,
} from '../src/lib/podcast-feed.mjs';

try {
  const result = await refreshFeed({
    feedUrl: DEFAULT_FEED_URL,
    snapshotPath: DEFAULT_SNAPSHOT_PATH,
    registryPath: DEFAULT_REGISTRY_PATH,
    timeoutMs: FEED_TIMEOUT_MS,
  });
  console.log(`Episodios en el feed: ${result.total}`);
  if (result.assigned.length) {
    console.log('Recuerda hacer commit del registro y del snapshot actualizados.');
  }
} catch (error) {
  console.error(`No se pudo actualizar el podcast: ${error.message}`);
  console.error('El snapshot y el registro existentes no se han modificado.');
  process.exit(1);
}
