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
