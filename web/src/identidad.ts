// La identidad del visitante: un hash aleatorio en su propio navegador.
// Único hogar de la clave de localStorage — el servidor solo ve el valor.
// Sin localStorage (bloqueado): identidad nueva por visita, nada persistido.
const CLAVE = "visitante";

export function leerVisitante(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function nuevoVisitante(): string {
  const v = crypto.randomUUID();
  try {
    localStorage.setItem(CLAVE, v);
  } catch {}
  return v;
}

export function borrarVisitante(): void {
  try {
    localStorage.removeItem(CLAVE);
    localStorage.removeItem("soundprint-historial"); // el historial local es tan "tú" como el hash
  } catch {}
}
