/** Adaptador de relógio da API: único ponto que lê a hora do sistema (doc 12 §5.2). */
export function currentWallMs(): number {
  return Date.now();
}
