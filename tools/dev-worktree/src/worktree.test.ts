import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PORT_BASE, portsFor, projectName, slugify } from './worktree.js';

describe('slugify', () => {
  it.each([
    ['finances', 'finances'],
    ['Feature/Categorias CRUD', 'feature-categorias-crud'],
    ['  __açaí--pago__ ', 'acai-pago'],
    ['', 'main'],
    ['***', 'main'],
  ])('%j vira %j', (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });

  it('limita o tamanho para nomes de projeto e volume do Docker', () => {
    expect(slugify('a'.repeat(100))).toHaveLength(40);
  });
});

describe('projectName', () => {
  it('prefixa com zooloo', () => {
    expect(projectName('finances')).toBe('zooloo-finances');
  });
});

describe('portsFor', () => {
  it('é determinístico por worktree', () => {
    expect(portsFor('finances')).toEqual(portsFor('finances'));
  });

  it('serviços em portas consecutivas a partir da base do slot', () => {
    const ports = portsFor('feature-x');
    expect(ports.redis).toBe(ports.postgres + 1);
    expect(ports.api).toBe(ports.postgres + 2);
    expect(ports.web).toBe(ports.postgres + 3);
    expect((ports.postgres - PORT_BASE) % 10).toBe(0);
  });

  it('propriedade: portas sempre na faixa reservada e fora das portas padrão', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const ports = portsFor(slugify(name));
        for (const port of Object.values(ports)) {
          expect(port).toBeGreaterThanOrEqual(PORT_BASE);
          expect(port).toBeLessThan(PORT_BASE + 10_000);
        }
      }),
    );
  });

  it('nomes diferentes costumam cair em slots diferentes', () => {
    const names = Array.from({ length: 50 }, (_, index) => `feature-${index}`);
    const slots = new Set(names.map((name) => portsFor(name).postgres));
    expect(slots.size).toBeGreaterThanOrEqual(45);
  });
});
