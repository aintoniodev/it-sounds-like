// Cron de retención (ticket 03 de publicación): purga el feedback con más de
// 90 días. Pages no tiene cron triggers, así que vive como Worker aparte con
// el mismo binding de D1; la retención es la constante compartida de
// functions/feedback.mjs. También retira las ventanas de intentos fallidos
// de login con más de un día (ticket 06 de captura-web): el bloqueo caducó
// solo a los diez minutos, la fila solo era el recuerdo. Corre 04:00 UTC.
import { RETENCION_MS } from "../functions/feedback.mjs";

export default {
  async scheduled(_event, env, _ctx) {
    const corte = Date.now() - RETENCION_MS;
    const borradas = await env.DB.prepare("DELETE FROM feedback WHERE ts < ?").bind(corte).run();
    console.log(
      `purge: ${borradas.meta.changes} filas anteriores a ${new Date(corte).toISOString()}`,
    );
    const ayer = Date.now() - 24 * 60 * 60 * 1000;
    const intentos = await env.DB.prepare("DELETE FROM intentos_login WHERE ventana_desde < ?")
      .bind(ayer)
      .run();
    console.log(`purge: ${intentos.meta.changes} ventanas de login caducadas retiradas`);
  },
};
