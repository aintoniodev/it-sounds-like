# 03: Portadas y metadatos resueltos al indexar, cacheados

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** Al indexar, cada ficha resuelve su portada: con link de Spotify vía oEmbed (`open.spotify.com/oembed`, sin key; da título y portada, el artista vive en el núcleo de la ficha), sin link vía iTunes Search (una petición da el artwork). El resultado se cachea junto a la ficha de forma que reindexar no vuelva a pedir nada y la búsqueda funcione con la red cortada. Las portadas se sirven en local a la UI.

**Blocked by:** 01.

**Status**: done

- [x] ficha con link de Spotify muestra la portada del oEmbed sin configurar ninguna key
- [x] ficha sin link obtiene artwork de iTunes Search en la primera indexación
- [x] una segunda indexación (incluida cold start del servidor) no hace ninguna petición externa: todo sale del caché
- [x] con la red cortada después del primer índice, buscar y ver portadas sigue funcionando
- [x] un fallo de red al resolver no rompe la indexación: la ficha entra sin portada y se reintenta en la próxima pasada
