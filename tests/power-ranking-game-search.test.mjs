import assert from "node:assert/strict";
import { test } from "node:test";
import { createGameSearch } from "../src/lib/power-ranking/game-search.mjs";

// Planificador manual: los debounce se encolan y se ejecutan al hacer flush,
// para observar carreras de forma determinista.
function manualScheduler() {
  let nextId = 1;
  const pending = new Map();
  return {
    schedule: (handler, ms) => { const id = nextId++; pending.set(id, { handler, ms }); return id; },
    cancelScheduled: (id) => { pending.delete(id); },
    pendingCount: () => pending.size,
    lastDelay: () => [...pending.values()].at(-1)?.ms,
    flush: async () => {
      const jobs = [...pending.values()];
      pending.clear();
      for (const job of jobs) job.handler();
      // Los handlers siguen en vuelo a propósito: solo esperamos a que sus
      // microtareas se asienten, no a que las búsquedas resuelvan.
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

// Búsqueda controlada que SÍ respeta el aborto, como fetch.
function abortableSearch() {
  const pending = [];
  return {
    pending,
    fn: (query, init) => new Promise((resolve, reject) => {
      const entry = { query, resolve, reject };
      pending.push(entry);
      init?.signal?.addEventListener("abort", () => {
        const index = pending.indexOf(entry);
        if (index !== -1) {
          pending.splice(index, 1);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        }
      });
    }),
    resolve: (query, games) => {
      const entry = pending.find((item) => item.query === query);
      assert.ok(entry, `no hay búsqueda pendiente para «${query}»`);
      pending.splice(pending.indexOf(entry), 1);
      entry.resolve({ games });
    },
  };
}

// Búsqueda que IGNORA el aborto (la red ya envió la respuesta y llega tarde).
function lateSearch() {
  const resolvers = [];
  return {
    resolvers,
    fn: (query) => new Promise((resolve) => resolvers.push({ query, resolve })),
    resolve: (query, games) => {
      const entry = resolvers.find((item) => item.query === query);
      assert.ok(entry, `no hay búsqueda pendiente para «${query}»`);
      entry.resolve({ games });
    },
  };
}

test("una respuesta antigua tardía no sustituye los resultados de la consulta vigente", async () => {
  const scheduler = manualScheduler();
  const search = lateSearch();
  const applied = [];
  const errors = [];
  const controller = createGameSearch({
    searchGames: search.fn,
    onResults: (games) => applied.push(games),
    onError: (error) => errors.push(error),
    schedule: scheduler.schedule,
    cancelScheduled: scheduler.cancelScheduled,
  });

  controller.query("ca");
  await scheduler.flush(); // petición A en vuelo
  controller.query("catan");
  await scheduler.flush(); // petición B en vuelo (A sigue abierta)

  // B responde primero
  search.resolve("catan", [{ display_name: "Catan" }]);
  await Promise.resolve();
  assert.deepEqual(applied, [[{ display_name: "Catan" }]]);

  // A responde después: obsoleta, se ignora sin errores
  search.resolve("ca", [{ display_name: "Carcassonne" }, { display_name: "Cascade" }]);
  await Promise.resolve();
  assert.deepEqual(applied, [[{ display_name: "Catan" }]]);
  assert.deepEqual(errors, []);
});

test("una petición abortada no genera error visible", async () => {
  const scheduler = manualScheduler();
  const search = abortableSearch();
  const applied = [];
  const errors = [];
  const controller = createGameSearch({
    searchGames: search.fn,
    onResults: (games) => applied.push(games),
    onError: (error) => errors.push(error),
    schedule: scheduler.schedule,
    cancelScheduled: scheduler.cancelScheduled,
  });

  controller.query("ca");
  await scheduler.flush();
  assert.equal(search.pending.length, 1);

  controller.query("catan"); // invalida y aborta A
  assert.equal(search.pending.length, 0, "la petición abortada se retiró");
  await scheduler.flush();
  search.resolve("catan", [{ display_name: "Catan" }]);
  await Promise.resolve();

  assert.deepEqual(errors, [], "el aborto no llega a onError");
  assert.deepEqual(applied, [[{ display_name: "Catan" }]]);
});

test("un fallo real de la consulta vigente se comunica", async () => {
  const scheduler = manualScheduler();
  const applied = [];
  const errors = [];
  const controller = createGameSearch({
    searchGames: () => Promise.reject(new Error("catálogo caído")),
    onResults: (games) => applied.push(games),
    onError: (error) => errors.push(error),
    schedule: scheduler.schedule,
    cancelScheduled: scheduler.cancelScheduled,
  });

  controller.query("catan");
  await scheduler.flush();
  assert.deepEqual(errors, [new Error("catálogo caído")]);
  assert.deepEqual(applied, []);
});

test("debounce: reescribir antes del disparo deja una única búsqueda con AbortSignal", async () => {
  const scheduler = manualScheduler();
  const calls = [];
  const controller = createGameSearch({
    searchGames: (query, init) => { calls.push({ query, init }); return Promise.resolve({ games: [] }); },
    onResults: () => {},
    onError: () => {},
    schedule: scheduler.schedule,
    cancelScheduled: scheduler.cancelScheduled,
  });

  controller.query("ca");
  controller.query("cat");
  controller.query("catan");
  assert.equal(scheduler.pendingCount(), 1, "las consultas sustituidas se desprograman");
  assert.equal(scheduler.lastDelay(), 300);

  await scheduler.flush();
  assert.deepEqual(calls.map((call) => call.query), ["catan"]);
  assert.ok(calls[0].init.signal instanceof AbortSignal, "la búsqueda recibe un AbortSignal");

  controller.query("c");
  assert.equal(scheduler.pendingCount(), 0, "menos de 2 caracteres no dispara búsqueda");
});
