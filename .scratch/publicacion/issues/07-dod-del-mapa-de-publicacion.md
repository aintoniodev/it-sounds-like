# DoD del mapa de publicación

Type: grilling
Status: resolved
Labels: wayfinder:grilling
Blocked by: 03, 05, 06

## Question

Criterios de aceptación cerrados que hacen "publicado" este mapa: desplegado en *.pages.dev desde el main por CI; la matemática de carga del ticket 01 con margen documentado; feedback fluyendo al almacenamiento elegido; re-ranking activo tras su umbral (o tras flag, según el 03) y con el arranque en frío degradando a cosine puro; PNG firmado; privacidad mínima publicada. Este ticket cierra el mapa: sin nada por decidir antes de ejecutar.

## Answer

DoD del mapa de publicación, cerrado (2026-08-24). Q1 del usuario: **bge-m3 aceptado** (recall 0.737 contra suelo 0.754: diferencia de ruido de suite; a cambio, cliente ligero). Q2: criterios ajustados al estado real (v1 construida en rama `v1`, desplegado placeholder ya vivo en pages.dev).

**Criterios de aceptación del esfuerzo de publicación (para su propia spec de construcción):**

1. **Fuente del sitio público**: la UI pública nace de la v1 real (Escenario sobre el servicio, cliente fino sin modelo local), no del placeholder. Prerrequisito: integrar `v1` en main (`git merge v1`); el CI despliega desde main.
2. **Modelo público**: bge-m3 en el edge para queries; índice de fichas embedeado en CI contra Workers AI (cache por hash + sonda de drift del ticket 04). El recall 0.737 queda documentado como el suelo público de referencia en el summary de cada run.
3. **Feedback**: Worker con D1 (tupla y permisos del ticket 02, retención 90 días con purge por cron, sin IP/cookies/UA), botones clavo/no-encaja en el sitio público.
4. **Re-ranking**: memory-based con shrinkage (ticket 03), arranque en frío degradando a cosine puro por construcción, replay offline en `eval/` como gate, rank pre-boost en cada evento.
5. **Soundprint público**: export PNG con la firma del canal real del autor — fuente única: la constante `ENLACE_IG` de v1 (`web/src/soundprint.ts`) deja de ser placeholder cuando exista la cuenta.
6. **Privacidad**: las cinco líneas del pie, publicadas.
7. **Matemática de carga**: márgenes del ticket 01 (61× en neurons, 6% en requests) citados en la spec de publicación.
8. **Analytics**: nada. La tabla de feedback ES la analítica; sin telemetría de terceros (decisión del DoD, coherente con unslop y privacidad).
9. **ε-greedy**: fuera del build; se activa solo si la telemetría (rank pre-boost) muestra rich-get-richer.

**Deliverable del mapa**: completo. La publicación pasa a ejecución con spec propia (ampliación de la v1 o esfuerzo nuevo), igual que hizo v1.
