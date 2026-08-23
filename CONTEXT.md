# It sounds like

Buscador local de canciones por descripción: describes cómo quieres sentirte y recibes las canciones cuyo texto mejor encaja, escrito por un autor que escucha con oído de ingeniero de sonido.

## Language

**Ficha**:
La unidad del catálogo: una canción descrita por el autor. Un fichero, una ficha.
_Avoid_: entrada, post, registro, item

**Catálogo**:
La colección completa de fichas. Es la fuente de verdad del producto.
_Avoid_: base de datos, índice

**Autor**:
Quien escribe las fichas. El resto de personas no escriben: buscan.
_Avoid_: usuario, creador, admin

**Plantilla**:
La ficha de ejemplo que el autor edita libremente para dar forma a las nuevas. Es sugerencia, nunca obligación.
_Avoid_: schema, formulario

**Núcleo**:
Lo mínimo obligatorio de una ficha: título, artista y fecha. Todo lo demás es opcional e inventable.
_Avoid_: campos requeridos, schema fijo

**Soundprint**:
La firma sonora de quien busca, pintada con las palabras del autor sobre las fichas que le han matcheado. La del autor es la misma pieza aplicada a su catálogo entero.
_Avoid_: musicprint, huella musical, perfil

**Dimensión**:
Clave de ficha con valor numérico o de pequeño vocabulario (energia, momento_del_dia, nivel_de_fiesta). No se embedea: filtra el retrieve y estructura el soundprint.
_Avoid_: metadato, tag, atributo
