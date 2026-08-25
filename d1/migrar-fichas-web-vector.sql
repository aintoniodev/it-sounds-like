-- Migración del ticket 02 (captura-web): fichas_web ya existe en producción
-- sin vector. Las filas previas quedan con NULL: no rankean en la fusión
-- (el 01 no guardaba vectores) y el sync del 03 las adopta igual.
ALTER TABLE fichas_web ADD COLUMN vector TEXT;
