# ADR-0001 — Ferramentas do monorepo

- Status: aceito
- Data: 2026-11-18

## Contexto

O doc 09 define pnpm + Turborepo, TypeScript strict, Vitest, fast-check e Stryker. Faltava fixar versões e resolver incompatibilidades encontradas na instalação.

## Decisão

- **pnpm 12** via corepack (`packageManager` no `package.json` raiz) e **Turborepo 2** para orquestrar `build`, `typecheck`, `test`, `test:coverage` e `test:mutation`.
- **TypeScript 6.0.x**, não 7.x: o `typescript-eslint` 8.73 exige `typescript <6.1`. Revisar quando o `typescript-eslint` suportar o TS 7 (registrado no tech-debt-tracker).
- `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `verbatimModuleSyntax`; módulos ESM com `NodeNext`.
- **Vitest 5** com cobertura v8 e limites por pacote no `vitest.config.ts` de cada pacote (RNF-QA-01/02).
- **Stryker 10** com `@stryker-mutator/vitest-runner` declarado em `plugins` no `stryker.config.json`: com o isolamento do pnpm, o Stryker não encontra o runner sozinho.
- **ESLint 10** (flat config) com regras de gosto em `no-restricted-syntax`/`no-restricted-imports`, mensagens em português que dizem como corrigir; **dependency-cruiser** para regras entre pacotes e apps.
- Ferramentas de teste declaradas como `devDependencies` de cada pacote que as usa.

## Consequências

- `pnpm check` é o gate local e o mesmo comando roda no CI.
- Atualizar TypeScript para 7.x exige reavaliar o lint com tipos.
