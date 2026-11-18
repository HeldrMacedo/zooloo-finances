# ADR-0004 — Pacotes internos consumidos pelo código-fonte em dev e teste

- Status: aceito
- Data: 2026-11-18

## Contexto

Os pacotes de `packages/` exportam `dist/` para produção. Exigir `build` antes de cada teste ou typecheck deixa o ciclo do agente lento e gera erros confusos quando o `dist/` está velho.

## Decisão

- Cada pacote declara a condição de export **`@zooloo/source`** apontando para `src/index.ts`, antes de `types` e `default` (`dist/`).
- `tsconfig.base.json` usa `customConditions: ["@zooloo/source"]`: typecheck e editor leem o código-fonte.
- `tsconfig.build.json` de cada pacote zera `customConditions`: o build usa o `dist/` das dependências (Turborepo roda `^build` antes).
- O Vitest resolve a mesma condição pela configuração compartilhada em **`tools/vitest-config`** (`@zooloo/vitest-config`), que também guarda as metas de cobertura por camada. Ela é um pacote, e não um arquivo relativo, porque o Stryker copia cada pacote para um sandbox e caminhos `../../` deixam de existir.

## Consequências

- Testes e typecheck não dependem de build.
- Apps empacotados (Vite, NestJS) precisam declarar a condição na própria configuração de resolução ou consumir `dist/`; decidir junto com o primeiro app.
- Alterar `tools/vitest-config` muda os gates de cobertura: arquivo coberto por CODEOWNERS.
