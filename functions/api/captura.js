// /api/captura — la puerta de escritura del autor en la web pública (tracer
// del esfuerzo captura-web). POST: con token válido valida la ficha con el
// módulo compartido de functions/ficha.mjs (mismas reglas que el server
// local), deduplica el slug contra fichas_web y contra el índice público
// horneado, y guarda la fila en estado publicada. La ficha NO aparece aún en
// búsquedas: eso es el ticket 02 — aquí solo se demuestra escritura y
// guardado. GET: el listado de fichas web del autor. Sin token válido, el
// 401 genérico de functions/auth.mjs — mismo cuerpo para ausente y erróneo.
import { autorizado, noAutorizado } from "../auth.mjs";
import { errorDeFicha, slugDe } from "../ficha.mjs";
import { MODELO } from "../rank.mjs";
import { leerCuerpo } from "./cuerpo.mjs";
import { cargarIndice } from "./indice.mjs";

// lo opcional llega con tipos de JSON sanos o no entra: el núcleo ya lo
// validó el módulo compartido; esto frena formas inesperadas con 400
export function errorDeTipos(ficha) {
  if (ficha.titulo !== undefined && typeof ficha.titulo !== "string") return "titulo debe ser texto";
  if (ficha.artista !== undefined && typeof ficha.artista !== "string") return "artista debe ser texto";
  if (ficha.spotify !== undefined && typeof ficha.spotify !== "string") return "spotify debe ser un link opcional";
  if (ficha.cuerpo !== undefined && typeof ficha.cuerpo !== "string") return "cuerpo debe ser texto";
  if (ficha.estado !== undefined && !["borrador", "publicada"].includes(ficha.estado))
    return "estado debe ser borrador o publicada";
  if (
    ficha.claves !== undefined &&
    (!Array.isArray(ficha.claves) ||
      ficha.claves.some((c) => typeof c?.clave !== "string" || !["string", "number"].includes(typeof c?.valor)))
  )
    return "claves debe ser una lista de {clave, valor}";
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await autorizado(request, env))) return noAutorizado();
  const { cuerpo: ficha, error } = await leerCuerpo(request);
  if (error) return error;

  const err = errorDeFicha(ficha) ?? errorDeTipos(ficha);
  if (err) return new Response(err, { status: 400 });

  const slug = slugDe(ficha);
  if (await env.DB.prepare("SELECT slug FROM fichas_web WHERE slug = ?").bind(slug).first())
    return new Response(`ya existe una ficha con ese nombre: ${slug}`, { status: 409 });
  try {
    if ((await cargarIndice(request)).some((f) => f.slug === slug))
      return new Response(`ya existe una ficha con ese nombre: ${slug}`, { status: 409 });
  } catch {
    // índice ilegible (deploy a medias, caché fría): el dedupe cae al D1 —
    // la bandeja de entrada — y la adopción del 03 reconcilia con el catálogo
  }

  try {
    // el embed de la fusión (ticket 02): bge-m3 en el edge, el mismo runtime
    // contra el que CI hornea el índice (~1 ficha/día: dentro del margen 61×
    // del README). Solo lo publicada: el borrador es invisible para la
    // búsqueda y se embedeará al publicarse (o al adoptarlo el 03). Sin
    // embedding la ficha guarda igual y espera a la adopción para buscar.
    const borrador = ficha.estado === "borrador";
    let vector = null;
    if (!borrador) {
      try {
        const { data } = await env.AI.run(MODELO, { text: [ficha.cuerpo ?? ""] });
        vector = JSON.stringify(data[0]);
      } catch {}
    }
    await env.DB.prepare(
      "INSERT INTO fichas_web (slug, titulo, artista, fecha, spotify, claves, cuerpo, estado, editada_en, vector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        slug,
        ficha.titulo,
        ficha.artista,
        ficha.fecha,
        ficha.spotify?.trim() || null,
        ficha.claves ? JSON.stringify(ficha.claves) : null,
        ficha.cuerpo ?? "",
        borrador ? "borrador" : "publicada",
        Date.now(),
        vector,
      )
      .run();
  } catch (e) {
    // dos POST con el mismo slug en carrera: gana la PK, y el contrato del
    // 409 con mensaje claro se cumple igual que por el pre-check
    if (String(e?.message).includes("UNIQUE constraint failed"))
      return new Response(`ya existe una ficha con ese nombre: ${slug}`, { status: 409 });
    throw e;
  }
  return Response.json({ ok: true, slug }, { status: 201 });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await autorizado(request, env))) return noAutorizado();
  const { results } = await env.DB.prepare(
    "SELECT slug, titulo, artista, fecha, spotify, claves, cuerpo, estado, borrado_pedido, editada_en FROM fichas_web ORDER BY editada_en DESC",
  ).all();
  // las fichas del catálogo (adoptadas o nacidas locales) para el listado y
  // la edición con sombra del 05: resumen ligero, el cuerpo completo lo
  // saca el cliente del índice público. Índice ilegible → solo la web.
  let catalogo = [];
  try {
    const sombras = new Set(results.map((r) => r.slug));
    catalogo = (await cargarIndice(request))
      .filter((e) => !sombras.has(e.slug))
      .map(({ slug, titulo, artista, fecha }) => ({ slug, titulo, artista, fecha }));
  } catch {}
  return Response.json({ fichas: results, catalogo });
}
