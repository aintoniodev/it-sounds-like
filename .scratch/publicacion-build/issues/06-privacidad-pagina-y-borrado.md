# 06: Privacidad: página y borrado

**What to build:** quien lee las cinco líneas del pie puede entrar a una página mínima que explica exactamente qué tupla se guarda de él (query, ficha, acción, ts, rank, hash) y le permite borrar su identificador, para que sus próximas visitas empiecen de cero. Sin frases legales: la verdad de la tabla en lenguaje claro, en español, unslop.

**Blocked by:** 03 (Feedback: clavo / no me encaja en D1).

**Status:** done

- [x] La página detalla cada campo de la tupla tal como vive en D1
- [x] Borrar el identificador elimina el hash del visitante y su enlace con lo guardado
- [x] Enlazada desde las cinco líneas del pie

## Comments

**2026-08-24 (agente):** `/privacidad` (entrada propia de vite, enlazada desde el pie) cuenta los siete campos tal cual viven en la tabla — incluido `qvec`, que nació con el 05 — en español plano, sin frases legales. El borrado hace las tres cosas que hacen verdad el "empezar de cero": hash del navegador, historial local del soundprint (el review pilló que sin esto la promesa era media verdad) y filas de D1 vía `POST /api/privacidad` (DELETE por visitante; el UUID local como prueba de propiedad a esta escala). Si el servidor no responde, el mensaje decae a la verdad: purga a los 90 días. Verificado en producción: página 200, enlace en el pie del bundle, DELETE borra la fila de prueba y la tabla queda a cero.
