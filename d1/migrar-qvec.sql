-- Migración del ticket 05: la tabla feedback ya existe en producción sin
-- qvec. Los eventos previos quedan con NULL y el re-ranking los ignora.
ALTER TABLE feedback ADD COLUMN qvec TEXT;
