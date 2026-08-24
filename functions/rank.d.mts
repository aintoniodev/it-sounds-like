// Contrato tipado del núcleo compartido (functions/rank.mjs) para el
// cliente: la implementación vive una sola vez, en el .mjs.
export type Filtros = { min: Record<string, number>; max: Record<string, number>; en: Record<string, string[]> };
export type DimInfo = {
  numericas: { key: string; min: number; max: number }[];
  categoricas: { key: string; valores: string[] }[];
};
export declare function coseno(a: number[], b: number[]): number;
export declare function pasaFiltros(ficha: { dims?: Record<string, string | number> }, filtros?: Partial<Filtros>): boolean;
export declare function calcularDimensiones(fichas: { dims?: Record<string, string | number> }[]): DimInfo;
export declare function rankear(
  entries: { vector: number[]; dims?: Record<string, string | number>; [k: string]: unknown }[],
  qvec: number[],
  opts?: { filtros?: Partial<Filtros>; top?: number },
): { ficha: Record<string, unknown>; score: number }[];
export declare const UMBRAL: number;
