import type { APIRoute } from 'astro';
import {
  diagramDescriptionMapping,
  diagramTitleMapping,
  diagramRelated,
  diagramCCD
} from '../../../lib/data/diagram-fields';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      descriptions: diagramDescriptionMapping,
      titles: diagramTitleMapping,
      related: diagramRelated,
      ccd: diagramCCD,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
