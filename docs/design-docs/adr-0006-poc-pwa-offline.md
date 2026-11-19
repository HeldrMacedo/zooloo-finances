# ADR-0006 — PoC 1: PWA offline com SQLite WASM em OPFS e aba líder

- Status: aceito (Chrome e Edge no Windows); Safari/macOS pendente
- Data: 2026-11-19
- Origem: doc 09 §8 (PoC 1), doc 11 §3, RNF-PWA-01..06

## Pergunta

O PWA consegue guardar dados num SQLite real no navegador, funcionar sem rede, coordenar várias abas sem corromper o banco e passar nos critérios de instalação, sem COOP/COEP?

## Decisão

1. **Banco local**: `@sqlite.org/sqlite-wasm` (oficial) num **Web Worker dedicado**, VFS **`opfs-sahpool`**, arquivo `/zooloo.sqlite3`. Dispensa COOP/COEP e `SharedArrayBuffer`, então widgets de terceiros (Pluggy, checkout) não quebram.
2. **Aba líder**: `navigator.locks.request('zooloo-local-db')` elege a aba que abre o Worker; as outras mandam consultas pelo `BroadcastChannel('zooloo-local-db')`. Quando a líder fecha, a trava é liberada, a próxima aba assume e reenvia o que estava pendente (`apps/web-app/src/data/local-db/coordinator.ts`).
3. **ORM**: Drizzle com o driver **`sqlite-proxy`**, apontando para o coordenador. As tabelas vêm de `@zooloo/db-schema/local`, as mesmas do teste de paridade com o PostgreSQL.
4. **Migrações locais** embutidas num módulo TS gerado (`migrations.generated.ts`) a partir dos SQL do drizzle-kit e aplicadas por `migrateLocal` (uma transação por migração, registro em `__zooloo_migrations`). Serve também ao mobile, que não lê arquivos.
5. **Service Worker**: Serwist (`@serwist/vite`, injectManifest), escopo `/app/`, precache do app shell incluindo o `sqlite3.wasm`, `navigateFallback` para `/app/index.html`, **sem `runtimeCaching`**: nada de `/api` em cache (RNF-PWA-04). `skipWaiting: false` (versão nova espera as abas fecharem; o aviso de atualização RF-PWA-09 fica para depois).
6. **Fallback**: sem Web Locks ou se o Worker não abre (sem OPFS), o coordenador fica `unavailable` e rejeita consultas com o motivo; o app segue sem banco local (modo online, RN-PWA-05).

## Evidências

E2E Playwright (`apps/web-app/e2e/pwa-offline.spec.ts`) contra o build de produção (`vite build --mode e2e` + `vite preview`), **12/12 em Chrome e Edge** (Windows 11):

- banco abre no VFS `zooloo-sahpool`, aplica migrações e mantém dados após recarregar;
- duas abas: uma líder, outra seguidora; a seguidora grava pela líder; ao fechar a líder, a seguidora assume e continua gravando sem perder dados;
- com a rede desligada (`context.setOffline`), o app recarrega do precache, mostra "Offline · nenhuma alteração pendente" e o banco local grava;
- Cache Storage só contém `/app/*` (inclui `index.html` e `.wasm`), nenhuma URL de API;
- manifest com nome, `start_url`, `scope`, `display` e ícones PNG respondendo 200; Service Worker com escopo `/app/`;
- apagar o banco local remove os dados (base para logout sem "manter dados" e remote wipe, F7).

Testes unitários do coordenador (eleição, seguidora, erro, pedido antes da líder, troca de líder, sem escrita duplicada quando chega aba nova, indisponível) e do executor de migrações (idempotência, aplicação incremental, rollback de migração quebrada).

## Limitações e pendências

- **Safari 17+/macOS 14+ e instalação real** ("Instalar" no Chrome/Edge do Windows e "Adicionar ao Dock" no Safari) não foram exercitados: exigem máquina macOS e clique humano. Pendente para validação manual (TD-017).
- **Reenvio após troca de líder** pode repetir uma escrita que a líder antiga gravou sem responder. Mitigação: IDs gerados no cliente (UUIDv7) e escritas idempotentes; o `sync-core` (PoC 2) deve tratar toda mutação como idempotente.
- **Sem cifra**: o arquivo em OPFS está em claro. A estratégia de cifra é a PoC 3 (SEC-CR-08); até lá, só dados sintéticos.
- O pacote sqlite-wasm traz o `sqlite3-worker1` (≈216 kB) que não usamos e que entra no precache (TD-018).
- Precache ≈ 1,9 MiB; medir a abertura a frio (RNF-PWA-02) em homologação.
