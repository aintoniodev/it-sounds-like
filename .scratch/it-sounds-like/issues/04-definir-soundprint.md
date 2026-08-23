# Definir soundprint

Type: grilling
Status: resolved
Labels: wayfinder:grilling

## Question

Al estilo del loveprint de Nectar App: ¿qué es exactamente nuestro soundprint? ¿De qué se genera — las búsquedas de un usuario, sus matches, el catálogo entero del autor? ¿Qué representa — la identidad sonora de quien busca, la firma de quien cura, o ambas? ¿Y dónde aparece en un producto local (resultado de búsqueda, perfil, shareable)? Es la pieza de identidad/diferenciación del producto. Su visualización (ThreeUI/shaders) es niebla posterior: aquí se define el concepto, inputs y dónde vive. Al resolver, actualizar `CONTEXT.md` (Skill "domain-modeling").

## Answer

Grilling completo en una ronda (2026-08-23), cinco decisiones validadas:

- **De quién**: las dos caras. La del que busca es la protagonista (su gusto retratado en el vocabulario del autor); la del autor sale del mismo mecanismo (su catálogo visualizado como pieza única). Sin cuentas: la del buscador vive por navegador/dispositivo.
- **Input**: pasivo, los matches. Cada ficha que el sistema devuelve pinta el print. Sin favoritos explícitos en v1 (ya se podrán añadir si el DoD los quiere; no bloquean el concepto).
- **Tres capas**: el significado son las palabras del autor (las frases de las fichas matcheadas: "deseo con rabia", "alegría química pura"); la estructura son las dimensiones (energia, momento_del_dia, extraídas de las fichas); la forma generativa (ThreeUI/shader) es solo el lienzo, sembrado por los embeddings de los matches. El print se lee, no solo se mira.
- **Dónde vive**: panel "tu soundprint" siempre visible que evoluciona con cada búsqueda + export a imagen (PNG). La imagen exportada es el enlace con el canal de Instagram del autor: su audiencia comparte soundprints hechos con su vocabulario sin que el producto sea público.
- **Nombre**: soundprint (una palabra, enlaza con el nombre del producto).

La visualización concreta (qué genera la forma, cómo se presentan palabras y dimensiones, cómo se exporta) es el ticket 10. Término registrado en `CONTEXT.md`.
