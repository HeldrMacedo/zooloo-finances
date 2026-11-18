import * as z from 'zod';

/** Mensagens padrão do Zod em pt-BR (D-03). Chamar uma vez na inicialização de cada app. */
export function useBrazilianPortugueseErrors(): void {
  z.config(z.locales.ptBR());
}
