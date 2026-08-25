// POST /api/captura/publicar — el borrador sale del cajón (ticket
// captura-web 04): se embedea con bge-m3 y pasa a publicada, con lo que la
// fusión del 02 lo sirve al instante. Solo el autor. Sin embedding (AI
// caída) publica igual: buscará cuando el sync del 03 lo adopte y hornee.
import { autorizado, noAutorizado } from "../../auth.mjs";
import { MODELO } from "../../rank.mjs";
import { leerCuerpo } from "../cuerpo.mjs";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await autorizado(request, env))) return noAutorizado();
  const { cuerpo, error } = await leerCuerpo(request);
  if (error) return error;
  const slug = typeof cuerpo?.slug === "string" ? cuerpo.slug.trim() : "";
  if (!slug) return new Response("falta el slug del borrador", { status: 400 });

  const fila = await env.DB.prepare(
    "SELECT cuerpo FROM fichas_web WHERE slug = ? AND estado = 'borrador' AND borrado_pedido = 0",
  )
    .bind(slug)
    .first();
  if (!fila) return new Response(`no hay borrador pendiente con ese nombre: ${slug}`, { status: 404 });

  let vector = null;
  try {
    const { data } = await env.AI.run(MODELO, { text: [fila.cuerpo ?? ""] });
    vector = JSON.stringify(data[0]);
  } catch {}
  await env.DB.prepare("UPDATE fichas_web SET estado = 'publicada', editada_en = ?, vector = ? WHERE slug = ?")
    .bind(Date.now(), vector, slug)
    .run();
  return Response.json({ ok: true, slug });
}
