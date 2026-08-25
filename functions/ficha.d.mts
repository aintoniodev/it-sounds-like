// Contrato tipado del núcleo compartido (functions/ficha.mjs) para el
// cliente: la implementación vive una sola vez, en el .mjs.
export type FichaEntrante = {
  titulo: string;
  artista: string;
  fecha: string;
  spotify?: string;
  claves?: { clave: string; valor: string | number }[];
  cuerpo?: string;
};
export declare function nucleoCompleto(ficha: Partial<FichaEntrante> | undefined | null): boolean;
export declare function errorDeFicha(ficha: Partial<FichaEntrante> | undefined | null): string | null;
export declare function slugDe(ficha: { fecha: string; artista: string; titulo: string }): string;
