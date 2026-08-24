# 01: Tracer: primera búsqueda en la web pública

**What to build:** quien abre el sitio en pages.dev desde el móvil escribe cómo quiere sentirse y recibe el top 3 con las palabras del autor. El sitio deja de ser un placeholder: es el cliente fino de la v1 (Escenario, Departure Mono, sin modelo en el navegador, referencia visual del prototipo validado) y un Worker expone `/buscar`, que embea la query con bge-m3 en el edge y hace cosine sobre el índice de fichas que el CI ya genera contra Workers AI. El índice viaja como asset estático.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] El sitio desplegado en pages.dev responde a una búsqueda con el top 3 sin descargar modelo alguno en el navegador
- [x] El Worker de `/buscar` embea la query con `@cf/baai/bge-m3` y rankea por cosine sobre el índice público
- [x] El CI existente extiende su build con el cliente fino y el deploy del Worker, y sigue verde
- [x] La carga inicial del cliente es ligera (verificable en la red del navegador: sin pesos de modelo)
