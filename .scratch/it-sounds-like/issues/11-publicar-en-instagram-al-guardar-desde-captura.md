# Publicar en Instagram al guardar desde captura

Type: task
Status: done
Labels: wayfinder:task

## Question

Cuando el autor guarde una ficha desde la captura (`/captura`), que se
publique en Instagram sin más: la foto de portada de la canción en Spotify
(por defecto, salvo que el autor la sobrescriba en la propia captura) y la
descripción que él escribió — el caption ya validado en el issue 06
(gancho, cuerpo, «Para cuando:», «Escucha:», firma, link de Spotify,
hashtags; cero emojis).

Contexto conocido:

- El caption es un borrador pegable desde el 06 (`tools/caption.mjs`); este
  ticket lo lleva a publicación automática. La ficha sigue siendo la única
  fuente de verdad.
- La imagen: la portada se resuelve desde el link de Spotify que la ficha ya
  lleva (oEmbed / metadata del track). La sobrescritura en captura es un
  campo opcional de imagen que, si llega, gana.
- Publicar en Instagram exige Graph API con cuenta vinculada a Instagram
  Business/Creator: hay que resolver dónde vive el token, quién lo renueva
  y qué pasa cuando caduca (la ficha nunca se pierde por un fallo de
  publicación: se guarda igual y la publicación queda pendiente con su
  error accionable).
- Decidir si publica toda ficha guardada o solo las de estado `publicada`
  (hoy captura guarda con estado; el borrador no debería disparar nada).

Criterio de éxito: el autor guarda en captura desde el móvil y el post está
en Instagram con la portada correcta y su descripción; sin portada
sobreescrita usa la de Spotify; un fallo de Instagram no pierde la ficha ni
el texto.

## Comments

**2026-08-25 (agente):** Hecho y verificado en todos los caminos que no necesitan la cuenta real. El caption del 06 vive ahora en `functions/caption.mjs` (server y edge comparten render). Al publicarse una ficha —guardar directo en publicada o publicar un borrador, que el DoD pilló como laguna y corrigió— `waitUntil` dispara el post: la imagen del autor (campo opcional en captura, persiste en `fichas_web.imagen` para sobrevivir al borrador y a las ediciones) gana; si no, la portada del oEmbed de Spotify (verificado en producción: resuelve la imagen real del track); si no, pendiente. Graph en dos pasos (`media` + `media_publish`) con `IG_USER_ID`/`IG_TOKEN` como secrets; el desenlace queda en `publicaciones` — publicado con su post, pendiente con la razón (verificado en producción: «sin token de Instagram configurado» + portada real resuelta), error con el mensaje accionable de Graph (verificado con token falso: «Invalid OAuth access token…») — y la ficha nunca se pierde: el 201 no espera a Instagram. El listado lleva badge IG y botón reintentar (`/api/captura/republicar` reusa imagen y caption exactos; verificado). Decisión pedida por el ticket: publica solo `publicada`; el borrador no dispara nada. **Para el primer post real**: cuenta Instagram Business/Creator vinculada, token de Graph de larga vida en el gestor de contraseñas → `npx wrangler pages secret put IG_USER_ID --project-name it-sounds-like` e `IG_TOKEN`; cuando caduque (~60 días), lo mismo y reintentar desde captura.
