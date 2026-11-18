import { describe, expect, it } from 'vitest';
import { ptBR } from './messages/pt-BR.js';
import { createTranslator, MissingParamError } from './translate.js';

describe('createTranslator', () => {
  const t = createTranslator(ptBR);

  it('traduz chave simples', () => {
    expect(t('app.name')).toBe('Zooloo Finanças');
    expect(t('nav.transactions')).toBe('Transações');
  });

  it('interpola parâmetros', () => {
    expect(t('auth.verifyEmailBanner', { email: 'ana@x.com' })).toBe(
      'Verifique seu e-mail: enviamos um link para ana@x.com.',
    );
  });

  it('escolhe plural pela regra do pt-BR (F6: indicador da topbar)', () => {
    expect(t('sync.offlinePending', { count: 0 })).toBe('Offline · nenhuma alteração pendente');
    expect(t('sync.offlinePending', { count: 1 })).toBe('Offline · 1 alteração pendente');
    expect(t('sync.offlinePending', { count: 3 })).toBe('Offline · 3 alterações pendentes');
  });

  it('formata números grandes no plural com separador de milhar', () => {
    expect(t('sync.offlinePending', { count: 1200 })).toBe('Offline · 1.200 alterações pendentes');
  });

  it('falha quando falta parâmetro', () => {
    expect(() => t('auth.verifyEmailBanner', {})).toThrow(MissingParamError);
    expect(() => t('sync.offlinePending', {})).toThrow(MissingParamError);
  });
});

describe('catálogo pt-BR', () => {
  it('não tem textos vazios nem espaços nas pontas', () => {
    const texts: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node === 'string') {
        texts.push(node);
      } else if (node && typeof node === 'object') {
        Object.values(node).forEach(walk);
      }
    };
    walk(ptBR);
    expect(texts.length).toBeGreaterThan(20);
    for (const text of texts) {
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
