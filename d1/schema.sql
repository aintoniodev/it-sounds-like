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
-- [{clave, valor}]: las dimensiones de la ficha. vector (ticket 02) es el
-- embedding bge-m3 del cuerpo en el edge, para que la búsqueda fusione la
-- ficha sin esperar al deploy.
CREATE TABLE IF NOT EXISTS fichas_web (
  slug TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  artista TEXT NOT NULL,
  fecha TEXT NOT NULL,
  spotify TEXT,
  imagen TEXT,
  claves TEXT,
  cuerpo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'publicada' CHECK (estado IN ('borrador', 'publicada')),
  editada_en INTEGER NOT NULL,
  adoptada_en INTEGER,
  borrado_pedido INTEGER NOT NULL DEFAULT 0,
  vector TEXT
);

-- Contador de intentos fallidos de login por IP (ticket 06): ventana de 10
-- minutos, bloqueo tras 5 fallos. Un puñado de filas; el cron retira las
-- ventanas viejas. La IP solo vive aquí — nunca en feedback ni fichas.
CREATE TABLE IF NOT EXISTS intentos_login (
  ip TEXT PRIMARY KEY,
  fallos INTEGER NOT NULL,
  ventana_desde INTEGER NOT NULL
);

-- Publicaciones en Instagram disparadas al guardar (ticket 11 de
-- captura-web): estado del post por ficha, con el detalle accionable (url
-- del post o el error de Graph — el token caduca y se renueva a mano) y la
-- imagen+caption exactos usados, para reintentar sin recomponer nada.
CREATE TABLE IF NOT EXISTS publicaciones (
  slug TEXT PRIMARY KEY,
  estado TEXT NOT NULL CHECK (estado IN ('publicado', 'pendiente', 'error')),
  detalle TEXT,
  imagen TEXT,
  caption TEXT,
  ts INTEGER NOT NULL
);
