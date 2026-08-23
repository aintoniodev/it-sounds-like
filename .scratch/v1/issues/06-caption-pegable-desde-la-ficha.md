# 06: Caption pegable desde la ficha

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** Un botón junto a la ficha (panel lateral del buscador y confirmación del formulario de captura) copia al portapapeles el caption de Instagram renderizado: gancho = primera frase del "Por qué", resto del cuerpo, "Para cuando:", "Escucha:", firma "titulo — artista", link si existe, 4 hashtags (#canciondeldia #itsoundslike + título y artista normalizados). Es un borrador pegable que el autor retoca; cero emojis. El render es función pura ficha → texto; `tools/caption.mjs` la prototipa y es la referencia.

**Blocked by:** 04, 05.

**Status:** ready-for-agent

- [ ] el botón copia al portapapeles el caption completo de la ficha mostrada
- [ ] snapshots del render para fichas representativas: completa, sin secciones (solo intro), sin link
- [ ] cero emojis en el texto generado
