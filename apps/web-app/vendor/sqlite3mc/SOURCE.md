# SQLite3 Multiple Ciphers (WASM)

Build oficial publicado pelo autor do SQLite3 Multiple Ciphers (ADR-0008). Não editar: os arquivos são
conferidos por hash em `build/vendor-integrity.test.ts`.

- Release: [v2.7.1](https://github.com/utelle/SQLite3MultipleCiphers/releases/tag/v2.7.1) (2026-11-15), SQLite 3.54.1.
- Pacote: `sqlite3mc-2.7.1-sqlite-3.54.1-wasm.zip`, SHA256
  `be082d143a7865d22a1bfa2a66c5fe1d04eff41b8a78a370e942ea6fc0f3afac` (igual ao `sqlite3mc-2.7.1-SHA256SUMS`
  da release, assinado com Sigstore).
- Arquivos copiados de `sqlite3mc-wasm-3540100/jswasm/`:
  - `sqlite3.mjs`: `4eef14ec482818b6261e9df2641cddc8b3e63936df7e59e1fa607e2fe24a7381`
  - `sqlite3.wasm`: `5087143d75e160f19b2178c042d152575bed8befe04a0a8b80e576cd6168505d`
- `sqlite3.d.mts` é nosso: reaproveita os tipos do `@sqlite.org/sqlite-wasm` da mesma versão.
- Licenças: SQLite em domínio público; SQLite3 Multiple Ciphers sob MIT.

Para atualizar: baixe o `-wasm.zip` da nova release, confira o SHA256 contra o `SHA256SUMS`, copie os dois
arquivos de `jswasm/`, troque os hashes aqui e no teste e rode o E2E (`pnpm --filter @zooloo/web-app test:e2e`).
