# Spec: publicación de it sounds like

Status: ready-for-agent
Labels: ready-for-agent

## Problem Statement

La v1 de it sounds like funciona en local, pero su catálogo solo lo ve quien esté en la red del autor. Quien llega desde Instagram al canal del autor no tiene dónde describir cómo quiere sentirse y recibir canciones; y el producto no aprende nada de quien busca: cada búsqueda es la primera. El despliegue tiene que ser gratuito y aguantar 1.000 visitas al día sin operarlo.

## Solution

La web pública en Cloudflare: el buscador de la v1 como cliente fino (sin modelo en el navegador, la query se embede en el edge con bge-m3), el catálogo actualizado por push del autor vía CI, y un backend mínimo en Workers que recoge feedback anónimo por match en D1 y alimenta un re-ranking con shrinkage que aprende de lo que la gente marca. El soundprint se exporta con la firma del canal del autor. Privacidad de cinco líneas, sin cookies ni IPs, sin telemetría de terceros.

## User Stories

1. Como buscador, quiero abrir la web en el móvil y que cargue ligera (sin descargarme 120 MB de modelo), para encontrar música desde cualquier sitio.
2. Como buscador, quiero escribir cómo quiero sentirme y recibir el top 3 con las palabras del autor, igual que en local.
3. Como buscador, quiero filtrar por las dimensiones que el autor invente, para acotar por energía o momento.
4. Como buscador, quiero pulsar "clavo" o "no me encaja" en cada resultado, para que el sitio aprenda de mí sin darme de alta en nada.
5. Como buscador, quiero que las búsquedas que no encajan con el catálogo me lo digan con la línea honesta, para no confundir un mal match con una respuesta.
6. Como buscador, quiero un botón sorpréndeme, para salir de mi burbuja.
7. Como buscador, quiero que mis matches pinten mi soundprint y exportarlo con la firma del canal, para compartirlo en Instagram.
8. Como buscador, quiero que mi soundprint me espere si vuelvo días después, para verlo crecer.
9. Como buscador, quiero leer en cinco líneas qué se guarda de mí y cómo borrarme, para decidir con información.
10. Como buscador, quiero que nadie me siga con cookies ni guarde mi IP, porque lo que escribo son sentimientos.
11. Como autor, quiero publicar cambios del catálogo con un push, para que la web refleje mi ficha nueva en minutos sin tocar nada.
12. Como autor, quiero que la firma del PNG apunte a mi canal real, para que cada soundprint compartido traiga gente.
13. Como mantenedor, quiero que el índice público se genere en CI contra Workers AI (cache por hash y sonda de drift), para que fichas y query vivan en el mismo espacio vectorial.
14. Como mantenedor, quiero el recall de cada build escrito en el summary del CI (suelo público: 0.737), para detectar derivas del modelo o del catálogo.
15. Como mantenedor, quiero el feedback en D1 con purge automático a 90 días, para cumplir la promesa publicada sin operar nada.
16. Como mantenedor, quiero que el re-ranking arranque en frío como cosine puro y crezca con shrinkage, para que el primer visitante tenga la misma calidad que el millonésimo.
17. Como mantenedor, quiero que cada evento de feedback guarde el rank pre-boost, para auditar rich-get-richer con una SQL.
18. Como mantenedor, quiero la matemática de carga documentada (61× de margen en neurons, 6% en requests), para dormir tranquilo con el tier gratuito.
19. Como mantenedor, quiero poder apagar el aprendizaje poniendo un parámetro a cero, para matar el mecanismo sin desplegar cirugía.

## Implementation Decisions

- **Base**: la v1 ya integrada en main (buscador Escenario sobre el servicio, Departure Mono, soundprint con export). La web pública es el mismo producto adaptado a cliente fino: sin servidor local, sin watcher, sin captura.
- **Embeddings públicos**: `@cf/baai/bge-m3` en Workers AI para la query; índice de fichas embedeado en CI contra el mismo runtime (identidad cross-runtime no garantizada; cache por hash de cuerpo + sonda de drift + assert de dims 1024). Aceptado por el usuario con recall 0.737 (vs 0.754 de e5-small local: diferencia de ruido de suite a cambio de cliente ligero). El índice público viaja como asset estático.
- **Arquitectura**: Pages sirve el cliente estático; un Worker expone buscar (embed de query + cosine sobre el índice + re-ranking) y feedback (append a D1). Sin cuentas; el visitante es un hash aleatorio en localStorage.
- **Feedback**: tupla `{query en claro, ficha, acción (clavo/no-encaja), ts, rank_pre_boost, visitante}`; sin IP, sin cookies, sin user-agent; retención 90 días con cron trigger que purga; D1 elegido por límites (KV roza 1.000 writes/día; D1 da 100k filas/día y la agregación del re-ranker es SQL).
- **Re-ranking**: memory-based — `score = coseno + α_efectivo · Σ wᵢ · feedbackᵢ`, `wᵢ = cos(query_actual, query_pasada)` decaída por antigüedad de 90 días; la negativa pesa más (β > α) solo dentro de su contexto de query, jamás penalización global; shrinkage `α_efectivo = α · n/(n+K)` con K en 5–15; a señal cero es cosine puro. Apagar es α = 0.
- **Umbral honesto**: el calibrado en la v1 (top-1 de las consultas reales ≥ 0.834, fuera de tema ≤ 0.822) se recalibra para el espacio de bge-m3 con el mismo método antes de salir a producción.
- **Soundprint**: el de la v1 con la firma ya viva (`instagram.com/itdoesoundlike`, constante única compartida con el build).
- **Privacidad**: las cinco líneas del pie de la v1; página mínima con el detalle de la tupla y el borrado del identificador.
- **CI existente**: el workflow que ya despliega (npm ci, suite contra Workers AI, índice, Pages) se extiende con el build del cliente fino y el deploy del Worker.
- **Coste**: gratis mientras sea posible (decisión del usuario); los márgenes del tier documentados en el mapa.
- **Idioma y voz**: español, unslop, cero emojis (preferencia permanente del esfuerzo).

## Testing Decisions

- Un seam principal heredado: **el servicio de búsqueda**, ya testeado por la suite de `eval/` y los 26 tests de la v1. Para la publicación, el mismo patrón en el borde nuevo: el Worker de buscar/feedback se prueba como función pura (índice + feedback store → ranking), sin tocar HTTP ni D1 real.
- **Gate de calidad**: la suite corre en cada build contra Workers AI (ya lo hace); el suelo público de referencia es 0.737 y ninguna refactorización puede bajarlo.
- **Re-ranking**: replay offline extendiendo `eval/` con feedback sintético (el mecanismo no puede bajar el recall sin feedback, y con feedback de la suite debe subir los aciertos marcados); unidades para el shrinkage (señal cero = cosine exacto, K domina con pocos eventos, saturación con muchos).
- **Feedback Worker**: append correcto de la tupla, rechazo de eventos malformados, purge por edad. La D1 real se verifica una vez con wrangler local, no en cada test.
- Prior art: los 26 tests de la v1 (seam del servicio con embedder inyectable) y la suite de `eval/` con su runner contra Workers AI.
- UI pública: verificación visual manual sobre el prototipo ya validado; sin tests de navegador.

## Out of Scope

- Login de oráculo o captura online: el autor captura en local y publica con push.
- Dominio propio (subdominio pages.dev de momento), fine-tuning de embeddings, ε-greedy (solo si la telemetría muestra rich-get-richer), línea de plegamiento del soundprint, analytics de terceros, pagar infraestructura.

## Further Notes

- Decisiones completas con contexto: `.scratch/publicacion/map.md` (7/7) y sus tickets; números de límites en `docs/research/cf-limits.md` (rama `research/cf-limits`), embeddings del deploy en `docs/research/embeddings-deploy.md` (rama `research/embeddings-deploy`).
- El prototipo del sitio público (cliente fino con feedback stubado) está validado en `prototype/ui-busqueda/publico.html` (rama `prototype/ui-de-busqueda`): es la referencia visual de este build.
- La firma usa `itdoesoundlike` — decisión de naming del canal tomada al configurar `ENLACE_IG`; el repo y el producto siguen siendo "it sounds like".
