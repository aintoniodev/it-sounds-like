// POST /api/feedback — append de la tupla a D1. Sin IP, sin cookies, sin
// user-agent: el request solo aporta el cuerpo. Lo que no pasa la validación
// se rechaza en 400 sin tocar la base. El embedding de la query se calcula
// aquí (una vez por evento): el re-ranking de /api/buscar pesa cada señal
// por su contexto de query sin re-embedear nada al buscar.
import { validarEvento } from "../feedback.mjs";
import { MODELO } from "../rank.mjs";
import { leerCuerpo } from "./cuerpo.mjs";

export async function onRequestPost(context) {
  const { request, env } = context;
  const { cuerpo, error } = await leerCuerpo(request);
  if (error) return error;
  const evento = validarEvento(cuerpo);
  if (!evento) return new Response("evento malformado", { status: 400 });

  let qvec = null;
  try {
    const { data } = await env.AI.run(MODELO, { text: [evento.query] });
    qvec = JSON.stringify(data[0]);
  } catch {
    // sin embedding el evento se guarda igual: cuenta como feedback, no como señal
  }

  await env.DB.prepare(
    "INSERT INTO feedback (query, ficha, accion, ts, rank_pre_boost, visitante, qvec) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      evento.query,
      evento.ficha,
      evento.accion,
      evento.ts,
      evento.rank_pre_boost ?? null,
      evento.visitante,
      qvec,
    )
    .run();
  return Response.json({ ok: true });
}
