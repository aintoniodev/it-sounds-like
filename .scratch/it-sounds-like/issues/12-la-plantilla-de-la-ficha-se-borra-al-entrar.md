# La plantilla de la ficha se borra al entrar

Type: task
Status: done
Labels: wayfinder:task

## Question

En captura (`web/src/captura.ts`), la plantilla de la ficha — «## Por qué
esta canción / ## Para cuándo / ## Escucha» — es un `placeholder` del
textarea: al entrar a escribir desaparece. El autor la pierde de vista y
escribe desde cero.

Debería quedarse y ser editable: la plantilla precargada como valor del
campo, que el autor borre o edite lo que quiera (el glosario la define como
sugerencia, nunca obligación — «la ficha de ejemplo que el autor edita
libremente para dar forma a las nuevas»).

Criterio de éxito: al abrir la ficha nueva en captura, las secciones de la
plantilla están en el textarea como texto editable; guardar sin tocarlas no
rompe la validación del núcleo (título, artista y fecha) ni el render del
caption del issue 06.

## Comments

**2026-08-25 (agente):** Hecho: la plantilla («## Por qué esta canción / ## Para cuándo / ## Escucha») es el valor inicial del textarea — texto editable, no placeholder — y vuelve a sembrarse tras cada guardado. El cuerpo es libre desde siempre: guardar sin tocar las secciones pasa la validación del núcleo (compartida con el endpoint) y el markdown de las secciones es exactamente el que el caption del 06 ya sabe renderar. Desplegado con el resto del esfuerzo captura-web.
