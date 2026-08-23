# 07: Soundprint completo

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** El soundprint de quien busca, acumulado en el navegador: tres capas — palabras del autor (primera frase del "Por qué" del último top 3, en Departure Mono), dimensiones en formato ficha técnica (media de las numéricas, valor dominante de las categóricas) y lienzo generativo (shader fbm: una mancha por canción matcheada, posición y forma por hash del slug, color por su energia, grosor por repetición). Historial persistente por navegador (localStorage) y export PNG que composiciona lienzo y texto con el enlace al canal del autor. Corregir el issue conocido del prototipo —el lienzo apenas cambia entre búsquedas con resultados solapados— con los fixes ya decididos: pulso de frescura en los últimos matches, fondo sembrado por el hash de la query, más contraste, entrada animada de manchas nuevas. El soundprint del prototipo (`prototype/ui-busqueda`) es la base: levantar y corregir.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] buscar alimenta el soundprint sin ninguna acción del buscador
- [ ] dos búsquedas distintas con resultados solapados producen lienzos claramente distintos (el issue conocido, corregido)
- [ ] cerrar el navegador y volver días después conserva el historial
- [ ] el export PNG composiciona lienzo + palabras + ficha técnica de dimensiones + enlace al canal del autor
- [ ] verificación manual del look (decisión de la spec: UI se verifica a mano)
