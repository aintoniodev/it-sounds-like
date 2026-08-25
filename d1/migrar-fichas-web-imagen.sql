-- Migración del ticket 11 (captura-web): la imagen opcional del autor para
-- Instagram persiste en la fila — así un borrador publicado después (o una
-- edición) no pierde la portada elegida a mano.
ALTER TABLE fichas_web ADD COLUMN imagen TEXT;
