// Cálculo del estado del pie de tabla del Power Ranking (contador y «Mostrar
// más»). Función pura usada por el cliente de PowerRankingExperience.
//
// Regla de coherencia: el total anunciado nunca supera las filas realmente
// disponibles en el DOM/dataset local salvo que los datos completos
// (datos.json) se hayan cargado. Si datos.json falla, la tabla degrada: el
// total es el dataset parcial y «Mostrar más» no promete filas inexistentes.

export function tableStatus({
  query,
  visibleLimit,
  matchesCount,
  availableRows,
  totalCount,
  pageSize,
  fullDataLoaded,
}) {
  const total = query === ''
    ? (fullDataLoaded ? Math.max(totalCount, availableRows) : availableRows)
    : matchesCount;

  return {
    shown: Math.min(visibleLimit, total),
    total,
    showMoreHidden: visibleLimit >= total,
    showMoreLabel: `Mostrar ${Math.min(pageSize, Math.max(0, total - visibleLimit))} más`,
  };
}
