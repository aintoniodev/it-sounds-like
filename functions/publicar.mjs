// Publicación en Instagram al guardar desde la web (ticket 11 de
// captura-web). Graph API con cuenta Business/Creator: IG_USER_ID e IG_TOKEN
// viven como secrets de Pages; el token caduca (el flujo largo dura ~60
// días) y cuando eso pasa la publicación queda pendiente con su error
// accionable — la ficha ya está guardada y no se pierde nunca por esto.
// La imagen: la que el autor ponga a mano gana; si no, la portada que
// resuelve el oEmbed de Spotify; si tampoco, pendiente hasta que haya una.
import { renderCaption } from "./caption.mjs";

export function elegirImagen(imagenDelAutor, cover) {
  return imagenDelAutor?.trim() || cover || null;
}
// la portada pública de un track de Spotify vía oEmbed (sin key); devuelve
// null si el link no resuelve — publicar es best-effort, la ficha manda
export async function coverDeSpotify(spotify) {
  if (!spotify) return null;
  try {
    const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotify)}`);
    if (!r.ok) return null;
    const thumb = (await r.json()).thumbnail_url;
    return typeof thumb === "string" && thumb ? thumb : null;
  } catch {
    return null;
  }
}

// el flujo de Graph en dos pasos: crear el container con la imagen y el
// caption, y publicarlo. Lanza Error con el mensaje accionable de Graph.
export async function publicarEnInstagram(env, { imagen, caption }) {
  const base = `https://graph.facebook.com/v21.0/${env.IG_USER_ID}`;
  const crear = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image_url: imagen, caption, access_token: env.IG_TOKEN }),
  });
  const container = await crear.json();
  if (!container.id) throw new Error(container.error?.message ?? "Graph no creó el container");

  const publicar = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: env.IG_TOKEN }),
  });
  const post = await publicar.json();
  if (!post.id) throw new Error(post.error?.message ?? "Graph no publicó el container");
  return post.id;
}

// La publicación completa de una ficha guardada (solo publicadas: el
// borrador no dispara nada). Corre en waitUntil tras el 201: el guardado ya
// está a salvo y ningún percance de Instagram puede con él. El desenlace
// queda en publicaciones: publicado con su id, pendiente con la razón
// accionable, o error con el mensaje de Graph.
async function registrar(env, slug, estado, detalle, imagen, caption) {
  try {
    await env.DB.prepare(
      `INSERT INTO publicaciones (slug, estado, detalle, imagen, caption, ts) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET estado = excluded.estado, detalle = excluded.detalle,
         imagen = excluded.imagen, caption = excluded.caption, ts = excluded.ts`,
    )
      .bind(slug, estado, detalle, imagen, caption, Date.now())
      .run();
  } catch {}
}

export async function publicarFicha(env, ficha, slug) {
  const caption = renderCaption({
    titulo: ficha.titulo,
    artista: ficha.artista,
    spotify: ficha.spotify?.trim() || null,
    body: ficha.cuerpo ?? "",
  });
  const imagen = elegirImagen(ficha.imagen, await coverDeSpotify(ficha.spotify));

  if (!env.IG_TOKEN || !env.IG_USER_ID)
    return registrar(env, slug, "pendiente", "sin token de Instagram configurado", imagen, caption);
  if (!imagen)
    return registrar(env, slug, "pendiente", "sin portada: pon el link de Spotify o una imagen", null, caption);
  try {
    const id = await publicarEnInstagram(env, { imagen, caption });
    await registrar(env, slug, "publicado", `post ${id}`, imagen, caption);
  } catch (e) {
    await registrar(env, slug, "error", String(e?.message ?? e), imagen, caption);
  }
}
