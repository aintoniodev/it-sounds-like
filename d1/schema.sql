-- Esquema del feedback público (D1). La tupla exacta del ticket 03: query en
-- claro, ficha, acción, ts (ms epoch), rank pre-boost (nullable: sorpréndeme
-- no tiene rank) y visitante (hash aleatorio del navegador). Nada más.
CREATE TABLE IF NOT EXISTS feedback (
  query TEXT NOT NULL,
  ficha TEXT NOT NULL,
  accion TEXT NOT NULL,
  ts INTEGER NOT NULL,
  rank_pre_boost INTEGER,
  visitante TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_ts_idx ON feedback (ts);
CREATE INDEX IF NOT EXISTS feedback_ficha_idx ON feedback (ficha);
