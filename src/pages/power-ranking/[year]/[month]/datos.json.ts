import type { APIRoute } from 'astro';
import { editions, presentRow, type ProjectId, type RankingView } from '../../../../lib/power-ranking';

// Filas completas de una edición, formateadas exactamente como en la tabla
// (mismas reglas de índice, movimiento y silenciado de cola que las filas
// estáticas — ver presentRow en ../../../../lib/power-ranking). El cliente
// las inserta como texto, sin recalcular nada.
export function getStaticPaths() {
  return editions.map((edition) => ({
    params: {
      year: String(edition.year),
      month: String(edition.month).padStart(2, '0'),
    },
    props: { edition },
  }));
}

const projectIds: ProjectId[] = ['vis-ludica', 'vis-belica'];
const listViews: Array<Exclude<RankingView, 'analysis'>> = ['power', 'monthly', 'annual'];

export const GET: APIRoute = ({ props }) => {
  const { edition } = props as { edition: any };

  const payload: Record<string, Record<string, unknown[]>> = {};
  for (const projectId of projectIds) {
    const project = edition.projects[projectId];
    payload[projectId] = {};
    for (const view of listViews) {
      const rows = project.rankings[view] ?? [];
      payload[projectId][view] = rows.map((row: any) => presentRow(project, view, row, edition.month));
    }
  }

  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
};
