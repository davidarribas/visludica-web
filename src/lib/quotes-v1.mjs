// Lectura del contrato `quotes-v1`: las citas de papeleta que el motor exporta
// después de que David las elija sobre los candidatos del mes.
//
// Aquí no se decide nada editorial. Solo se comprueba que lo que llega se puede
// publicar tal cual, porque una cita mal formada es una persona mal citada: se
// prefiere romper el build a publicar media frase o una atribución en blanco.
//
// Devuelve `{ quotes }` o `{ problem }`; nunca lanza, para que quien llama
// componga el mensaje con el nombre de la edición.

export const QUOTES_SCHEMA_VERSION = 'quotes-v1';
export const QUOTE_PROJECT_IDS = ['vis-ludica', 'vis-belica'];

export function emptyQuotes() {
  return { 'vis-ludica': [], 'vis-belica': [] };
}

export function readQuotesV1(editionId, artifact) {
  if (artifact === undefined || artifact === null) return { quotes: emptyQuotes() };

  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    return { problem: 'quotes.json no contiene un objeto' };
  }
  if (artifact.schema_version !== QUOTES_SCHEMA_VERSION) {
    return { problem: `quotes.json declara el esquema «${artifact.schema_version}», no ${QUOTES_SCHEMA_VERSION}` };
  }
  if (artifact.period_id !== editionId) {
    return { problem: `quotes.json dice ser del periodo «${artifact.period_id}»` };
  }
  const projects = artifact.projects;
  if (!projects || typeof projects !== 'object' || Array.isArray(projects)) {
    return { problem: 'quotes.json no trae projects' };
  }
  if (Object.keys(projects).length === 0) {
    return { problem: 'quotes.json no trae citas de ningún proyecto' };
  }

  const quotes = emptyQuotes();
  for (const [projectId, citas] of Object.entries(projects)) {
    if (!QUOTE_PROJECT_IDS.includes(projectId)) {
      return { problem: `quotes.json menciona el proyecto desconocido «${projectId}»` };
    }
    if (!Array.isArray(citas) || citas.length === 0) {
      return { problem: `quotes.json no trae ninguna cita para «${projectId}»` };
    }
    for (const [indice, cita] of citas.entries()) {
      const donde = `quotes.json · ${projectId}[${indice}]`;
      for (const campo of ['label', 'text']) {
        if (typeof cita?.[campo] !== 'string' || !cita[campo].trim()) {
          return { problem: `${donde} no tiene ${campo}` };
        }
      }
      if (cita.attribution !== undefined
        && (typeof cita.attribution !== 'string' || !cita.attribution.trim())) {
        return { problem: `${donde} tiene una atribución vacía; omítela en vez de dejarla en blanco` };
      }
      const sobrante = Object.keys(cita).filter((k) => !['label', 'text', 'attribution'].includes(k));
      if (sobrante.length) {
        return { problem: `${donde} trae campos que no se publican: ${sobrante.join(', ')}` };
      }
    }
    quotes[projectId] = citas;
  }
  return { quotes };
}
