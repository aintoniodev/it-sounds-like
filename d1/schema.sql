-- Esquema del feedback público (D1). La tupla exacta del ticket 03: query en
-- claro, ficha, acción, ts (ms epoch), rank pre-boost (nullable: sorpréndeme
-- no tiene rank) y visitante (hash aleatorio del navegador). qvec (ticket 05):
-- el embedding bge-m3 de la query en el momento del evento, para que el
-- re-ranking pese cada señal por su contexto sin re-embedear nada al buscar.
CREATE TABLE IF NOT EXISTS feedback (
  query TEXT NOT NULL,
  ficha TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('clavo', 'no-encaja')),
  ts INTEGER NOT NULL,
  rank_pre_boost INTEGER,
  visitante TEXT NOT NULL,
  qvec TEXT
);
CREATE INDEX IF NOT EXISTS feedback_ts_idx ON feedback (ts);
CREATE INDEX IF NOT EXISTS feedback_ficha_idx ON feedback (ficha);

-- Fichas del autor escritas desde la web pública (esfuerzo captura-web). El
-- D1 es bandeja de entrada, no fuente de verdad: cada push del CI adopta las
-- publicadas a catalogo/ y retira la fila. El ciclo de vida (estados, sombra
-- de edición, borrado pedido, gana la edición más reciente) es el reducer
-- validado en la rama prototype/fichas-desde-la-web. claves es JSON
-- [{clave, valor}]: las dimensiones de la ficha.
CREATE TABLE IF NOT EXISTS fichas_web (
  slug TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  artista TEXT NOT NULL,
  fecha TEXT NOT NULL,
  spotify TEXT,
  claves TEXT,
  cuerpo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'publicada' CHECK (estado IN ('borrador', 'publicada')),
  editada_en INTEGER NOT NULL,
  borrado_pedido INTEGER NOT NULL DEFAULT 0
);
