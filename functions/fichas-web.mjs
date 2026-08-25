// El contrato de la fusión (ticket captura-web 02): una fila publicada de
// fichas_web convertida a la MISMA forma que una entrada del índice horneado,
// para que rankear no distinga procedencia — filtros, dimensiones y tarjeta
// incluidos. Módulo puro: el edge lo usa al buscar y la suite lo prueba sin
// HTTP ni bindings (mismo patrón que rank.mjs y ficha.mjs).
export function entradaDeFila(fila) {
  return {
    slug: fila.slug,
    titulo: fila.titulo,
    artista: fila.artista,
    fecha: fila.fecha,
    spotify: fila.spotify || null,
    body: fila.cuerpo,
    // dims como las del índice horneado: valores en string (el build público
    // no convierte números — la energia del catálogo llega "7"), para que un
    // filtro trate igual una ficha web y una del índice
    dims: Object.fromEntries(JSON.parse(fila.claves ?? "[]").map((c) => [c.clave, String(c.valor)])),
    cover: null,
    vector: JSON.parse(fila.vector),
  };
}

// la fila en dirección adopción (ticket 03): la ficha que markdownDe
// serializa a catalogo/ cuando el sync del CI la adopta
export function fichaDeFila(fila) {
  return {
    titulo: fila.titulo,
    artista: fila.artista,
    fecha: fila.fecha,
    spotify: fila.spotify ?? undefined,
    claves: JSON.parse(fila.claves ?? "[]"),
    cuerpo: fila.cuerpo,
  };
}

// la fusión como pieza pura (ticket 05): las entradas web PISAN la versión
// horneada del mismo slug (la edición web se sirve por delante del deploy)
// y los slugs con borrado pedido desaparecen del todo — ocultos ya, el
// próximo sync los quita del catálogo
export function fusionar(indice, entradasWeb, slugsOcultos) {
  const ocultos = new Set(slugsOcultos);
  const web = new Set(entradasWeb.map((e) => e.slug));
  return [...indice.filter((e) => !ocultos.has(e.slug) && !web.has(e.slug)), ...entradasWeb];
}
