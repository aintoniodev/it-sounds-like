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
