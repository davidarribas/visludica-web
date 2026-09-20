// Controlador de búsquedas del formulario de votación: debounce + token
// incremental + AbortController.
//
// Garantía: una respuesta solo se entrega a onResults/onError si sigue siendo
// la consulta vigente. Cada nueva consulta (o invalidate) hace obsoletas las
// anteriores, aborta la petición en vuelo y, aunque el fetch no respete el
// aborto, la comprobación de token descarta su respuesta. Los abortos no se
// comunican como error; solo los fallos de la consulta vigente llegan a
// onError.

export function createGameSearch({
  searchGames,
  onResults,
  onError,
  debounceMs = 300,
  schedule = (handler, ms) => setTimeout(handler, ms),
  cancelScheduled = (id) => clearTimeout(id),
} = {}) {
  if (typeof searchGames !== 'function') throw new Error('createGameSearch requiere searchGames');
  if (typeof onResults !== 'function') throw new Error('createGameSearch requiere onResults');
  if (typeof onError !== 'function') throw new Error('createGameSearch requiere onError');

  let token = 0;
  let timer = null;
  let controller = null;

  // Hace obsoletas la búsqueda en vuelo y la pendiente: sube el token,
  // cancela el debounce y aborta el fetch (si lo hubiera).
  function invalidate() {
    token += 1;
    if (timer !== null) {
      cancelScheduled(timer);
      timer = null;
    }
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  function query(rawText) {
    invalidate();
    const query = String(rawText ?? '').trim();
    if (query.length < 2) return;
    const current = token;
    controller = new AbortController();
    timer = schedule(async () => {
      timer = null;
      try {
        const result = await searchGames(query, { signal: controller.signal });
        if (current !== token) return; // respuesta obsoleta: se ignora
        onResults(Array.isArray(result?.games) ? result.games : []);
      } catch (error) {
        if (current !== token) return; // abortada o sustituida: nunca es error visible
        onError(error);
      }
    }, debounceMs);
  }

  return { query, invalidate };
}
