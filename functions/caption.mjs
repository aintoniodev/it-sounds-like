// Render de caption para Instagram: función pura ficha → texto pegable.
// Borrador que el autor retoca antes de publicar (y que el edge publica
// directo en el ticket 11 de captura-web). Cero emojis (unslop).
// Prototipado en tools/caption.mjs (ticket 06 del wayfinder).

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function secciones(body) {
  const secs = {};
  let intro = [];
  for (const block of body.split(/(?=^##\s)/m)) {
    const h = block.match(/^##\s+(.+)$/m);
    if (h) secs[h[1].trim()] = block.replace(/^##\s+.*$/m, "").trim();
    else if (block.trim()) intro.push(block.trim());
  }
  return { intro: intro.join("\n").trim(), secs };
}

export function renderCaption(ficha) {
  const { intro, secs } = secciones(ficha.body);
  const porque = secs["Por qué esta canción"] || intro;
  const primeraFrase = porque.match(/^[^.!?]+[.!?]/)?.[0] ?? porque;

  const L = [primeraFrase, ""];
  if (porque.length > primeraFrase.length) L.push(porque.slice(primeraFrase.length).trim(), "");
  if (secs["Para cuándo"]) L.push(`Para cuando: ${lower(secs["Para cuándo"])}`, "");
  if (secs["Escucha"]) L.push(`Escucha: ${lower(secs["Escucha"])}`, "");
  L.push(`${ficha.titulo} — ${ficha.artista}`);
  if (ficha.spotify) L.push(ficha.spotify);
  L.push("");

  const tag = (s) =>
    "#" +
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");
  L.push(["#canciondeldia", "#itsoundslike", tag(ficha.titulo), tag(ficha.artista)].join(" "));
  return L.join("\n");
}
