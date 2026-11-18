/** Faixa reservada para ambientes por worktree: 20000–29999, longe de 3000/5432/6379. */
export const PORT_BASE = 20_000;
const SLOTS = 1_000;
const MAX_SLUG = 40;

export interface WorktreePorts {
  readonly postgres: number;
  readonly redis: number;
  readonly api: number;
  readonly web: number;
}

/** Nome seguro para projeto e volume do Docker: minúsculas, dígitos e hífen. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
  return slug === '' ? 'main' : slug;
}

export function projectName(slug: string): string {
  return `zooloo-${slug}`;
}

/** FNV-1a 32 bits: hash estável e simples, suficiente para espalhar slots. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Portas derivadas do nome da worktree: duas worktrees rodam lado a lado sem conflito. */
export function portsFor(slug: string): WorktreePorts {
  const postgres = PORT_BASE + (fnv1a(slug) % SLOTS) * 10;
  return { postgres, redis: postgres + 1, api: postgres + 2, web: postgres + 3 };
}
