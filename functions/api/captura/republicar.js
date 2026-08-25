// POST /api/captura/republicar — reintentar la publicación de Instagram
// (ticket 11): usa la imagen y el caption exactos que quedaron en
// publicaciones, así el reintento no recompone nada. Solo el autor.
import { puerta } from "../../auth.mjs";
import { publicarEnInstagram } from "../../publicar.mjs";
import { leerCuerpo } from "../cuerpo.mjs";

export async function onRequestPost(context) {
  const { request, env } = context;
  const fallo = await puerta(request, env);
  if (fallo) return fallo;
  const { cuerpo, error } = await leerCuerpo(request);
  if (error) return error;
  const slug = typeof cuerpo?.slug === "string" ? cuerpo.slug.trim() : "";
  if (!slug) return new Response("falta el slug", { status: 400 });
  if (!env.IG_TOKEN || !env.IG_USER_ID)
    return new Response("sin token de Instagram configurado", { status: 409 });

  const fila = await env.DB.prepare("SELECT imagen, caption FROM publicaciones WHERE slug = ?")
    .bind(slug)
    .first();
  if (!fila) return new Response(`no hay publicación registrada para: ${slug}`, { status: 404 });
  if (!fila.imagen)
    return new Response("sin portada: pon el link de Spotify o una imagen y guarda de nuevo", { status: 409 });

  try {
    const id = await publicarEnInstagram(env, { imagen: fila.imagen, caption: fila.caption ?? "" });
    await env.DB.prepare("UPDATE publicaciones SET estado = 'publicado', detalle = ?, ts = ? WHERE slug = ?")
      .bind(`post ${id}`, Date.now(), slug)
      .run();
    return Response.json({ ok: true, detalle: `post ${id}` });
  } catch (e) {
    const detalle = String(e?.message ?? e);
    await env.DB.prepare("UPDATE publicaciones SET estado = 'error', detalle = ?, ts = ? WHERE slug = ?")
      .bind(detalle, Date.now(), slug)
      .run();
    return new Response(detalle, { status: 502 });
  }
}
