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
