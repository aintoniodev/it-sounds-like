// POST /api/feedback — append de la tupla a D1. Sin IP, sin cookies, sin
// user-agent: el request solo aporta el cuerpo. Lo que no pasa la validación
// se rechaza en 400 sin tocar la base.
import { validarEvento } from "../feedback.mjs";

export async function onRequestPost(context) {
  const { request, env } = context;
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return new Response("cuerpo no es JSON", { status: 400 });
  }
  const evento = validarEvento(cuerpo);
  if (!evento) return new Response("evento malformado", { status: 400 });

  await env.DB.prepare(
    "INSERT INTO feedback (query, ficha, accion, ts, rank_pre_boost, visitante) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      evento.query,
      evento.ficha,
      evento.accion,
      evento.ts,
      evento.rank_pre_boost ?? null,
      evento.visitante,
    )
    .run();
  return Response.json({ ok: true });
}
