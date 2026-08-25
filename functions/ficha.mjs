// El contrato de una ficha entrante (captura): núcleo obligatorio, fecha
// bien formada y slug canónico. Módulo puro — el server local, el edge de
// la web pública y el cliente validan lo mismo sin arrastrar el servicio
// de embeddings (mismo patrón que rank.mjs; ticket captura-web 01).
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// el núcleo obligatorio de una ficha; lo validan el índice y la captura
export function nucleoCompleto(ficha) {
  return Boolean(ficha?.titulo && ficha?.artista && ficha?.fecha);
}

// null si la ficha puede guardarse; si no, el mensaje claro del 400
export function errorDeFicha(ficha) {
  if (!nucleoCompleto(ficha)) return "falta el núcleo: titulo, artista y fecha";
  if (!FECHA.test(ficha.fecha)) return "la fecha debe ir como AAAA-MM-DD";
  return null;
}

// nombre de fichero: AAAA-MM-DD-artista-cancion, minúsculas, sin acentos
export function slugDe(ficha) {
  const norm = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${ficha.fecha}-${norm(ficha.artista)}-${norm(ficha.titulo)}`;
}

const quoted = (v) => `"${String(v).replace(/"/g, "")}"`;

// la ficha como markdown del catálogo: front-matter con el núcleo citado,
// spotify opcional y las claves custom (numéricas sin comillas, igual que
// escribe a mano el autor). Lo serializan igual la captura local y el sync
// del CI que adopta fichas web — un solo formato, una sola casa (ticket
// captura-web 03).
export function markdownDe(ficha) {
  const meta = [
    `titulo: ${quoted(ficha.titulo)}`,
    `artista: ${quoted(ficha.artista)}`,
    `fecha: ${ficha.fecha}`,
  ];
  if (ficha.spotify?.trim()) meta.push(`spotify: ${quoted(ficha.spotify.trim())}`);
  for (const { clave, valor } of ficha.claves ?? []) {
    if (!clave.trim() || !String(valor).trim()) continue;
    const v = String(valor).trim();
    meta.push(`${clave.trim()}: ${/^-?\d+(?:[.,]\d+)?$/.test(v) ? v : quoted(v)}`);
  }
  return `---\n${meta.join("\n")}\n---\n\n${(ficha.cuerpo ?? "").trim()}\n`;
}
