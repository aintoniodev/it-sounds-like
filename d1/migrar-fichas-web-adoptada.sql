-- Migración del 05 (captura-web), tras el code-review: memoria de adopción.
-- adoptada_en marca cuándo el sync llevó la fila al catálogo; con ella el
-- relatorio distingue "sin cambios desde la adopción" (retiro silencioso)
-- de un conflicto real de ediciones, y el borrado duro decide contra la
-- verdad del catálogo y no contra el índice desplegado.
ALTER TABLE fichas_web ADD COLUMN adoptada_en INTEGER;
