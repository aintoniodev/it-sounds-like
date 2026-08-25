# Publicar en Instagram al guardar desde captura

Type: task
Status: open
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
