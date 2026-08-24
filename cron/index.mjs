// Cron de retención (ticket 03 de publicación): purga el feedback con más de
// 90 días. Pages no tiene cron triggers, así que vive como Worker aparte con
// el mismo binding de D1; la retención es la constante compartida de
// functions/feedback.mjs. Corre una vez al día (04:00 UTC).
import { RETENCION_MS } from "../functions/feedback.mjs";

export default {
  async scheduled(_event, env, _ctx) {
    const corte = Date.now() - RETENCION_MS;
    const borradas = await env.DB.prepare("DELETE FROM feedback WHERE ts < ?").bind(corte).run();
    console.log(
      `purge: ${borradas.meta.changes} filas anteriores a ${new Date(corte).toISOString()}`,
    );
  },
};
