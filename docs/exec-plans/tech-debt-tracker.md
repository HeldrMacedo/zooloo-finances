# Dívida técnica

| ID | Descrição | Origem | Prioridade |
|---|---|---|---|
| TD-001 | TypeScript fixado em 6.0.x por compatibilidade com `typescript-eslint`; migrar para 7.x quando suportado | ADR-0001 | baixa |
| TD-002 | Lint de "dinheiro como `number`" ainda heurístico (bloqueia `toFixed`/`parseFloat`); falta regra com tipos que exija `Money` em campos monetários | doc 12 §5.2 | média |
| TD-003 | Mutantes sobreviventes em mensagens de erro do domínio (score 89%); avaliar ignorar `StringLiteral` de mensagens ou testar mensagens | Stryker | baixa |
| TD-005 | drizzle-kit 0.31 gera SQL inválido para índice de expressão com vírgula no SQLite; `categories_name_unique` local está em migração custom. Remover a exceção ao atualizar o drizzle-kit | passo 8 | baixa |
| TD-006 | Login, verificação de e-mail e jobs sem usuário na transação precisam de caminho fora da RLS do titular (`SECURITY DEFINER` ou papel de serviço) | ADR-0005 | alta (antes da autenticação) |
| TD-007 | `docs/generated/db-schema.md` ainda não é gerado pelo CI a partir do Drizzle (doc 12 §3.1) | passo 8 | média |
| TD-008 | Autenticação ausente: o `userId` ainda vem de `X-Dev-User-Id` com `DEV_AUTH`; falta o guard de sessão (SEC-ID). IDOR de categorias pelo sync feito no passo 17 (dois usuários: B não lê, não altera, não exclui e não usa categoria de A como mãe, em `apps/api/src/modules/sync/category-rules.test.ts`); refazer contra o login real quando existir | passo 9 | alta |
| TD-009 | Rate limiting (RNF-SEG-09), `Idempotency-Key` em POST de criação (doc 07 §3) e CORS ainda não configurados na API | passo 9 | alta (antes do primeiro endpoint de escrita) |
| TD-010 | Testcontainers no Windows exige `docker-credential-desktop` no PATH ao rodar `pnpm test` fora do `dev:worktree`; o `dev:worktree` já resolve sozinho (`pathWithDocker`) | passo 8/9 | baixa |
| TD-011 | Observabilidade local por worktree (OTel Collector, Loki, Prometheus, Tempo) do doc 12 §4 ainda não existe; a API também não emite OTel | passo 10 | média |
| TD-012 | Lista oficial de categorias padrão do onboarding (RF-ONB-02) não definida pelo produto; o seed de dev usa um conjunto sintético | passo 10 | média (antes do onboarding) |
| TD-013 | `dev:worktree` não detecta colisão de porta entre duas worktrees que caiam no mesmo slot (chance ~1/1000 por par); hoje o Docker falha com "port is already allocated" | passo 10 | baixa |
| TD-014 | `<ZoolooLogo>` está em `apps/web-app/src/ui/brand`, não em `@zooloo/ui-tokens` como diz o doc 13 §7.1: o pacote de tokens é consumido também pelo mobile (React Native), que não usa SVG do DOM. Atualizar o doc 13 ou criar `@zooloo/ui-web` quando houver segundo consumidor web (`apps/site`) | passo 11 | baixa |
| TD-015 | Playwright E2E existe só para a PoC 1 (Chrome e Edge); falta WebKit e cobertura dos fluxos F1–F8 conforme forem implementados | passo 12 | média |
| TD-016 | Fonte Nunito (Zooloo Kids, doc 13 §3) não empacotada; só entra na Fase 5 | passo 11 | baixa |
| TD-017 | PoC 1 sem validação em Safari 17+/macOS 14+ e sem instalação real do PWA (clique em "Instalar"/"Adicionar ao Dock") | ADR-0006 | alta (antes do beta) |
| ~~TD-018~~ | ~~Precache inclui `sqlite3-worker1` (~216 kB) não usado pelo app~~ — resolvido no ADR-0008: o build do SQLite3MC não traz o worker1 | ADR-0006 | — |
| TD-019 | Escrita local do sync (registro, outbox e cursor) não é atômica: o proxy do SQLite não abre transação entre mensagens. Adicionar lote transacional no Worker | ADR-0007 | média (antes do beta) |
| ~~TD-020~~ | ~~Mutação recusada pelo servidor (ex.: nome duplicado criado offline) é desfeita sem aviso na interface~~ — resolvido no passo 17: aviso "N alterações foram recusadas pelo servidor" no app shell (`SyncNotice`) | ADR-0007 | — |
| TD-021 | Sync sem notificação em tempo real (WS/SSE, RNF-SYN-04), sem Background Sync e sem teste de carga de 20 mil lançamentos (RNF-PWA-03) | ADR-0007 | alta (antes do beta) |
| TD-022 | Chave do banco local perdida (IndexedDB limpo pelo navegador ou pelo usuário) recria o banco vazio: alterações ainda só no outbox se perdem sem aviso. Avisar na interface e, com login, tentar enviar antes (RN-PWA-08) | ADR-0008 | média (com o login) |
| TD-023 | Bundle do SQLite3MC conferido só por SHA256 contra o `SHA256SUMS` da release; falta verificar a assinatura Sigstore (`.sig`/`.pem`) desse arquivo ao atualizar | ADR-0008 | baixa |
| TD-024 | Excluir categoria não move as transações dela para "Outros" do mesmo tipo (RN-CAT-02): ainda não existe tabela de transações. Implementar no servidor, na mesma transação da exclusão em cascata, junto com o módulo de transações | passo 17 | alta (com o módulo de transações) |
| TD-025 | Unicidade de nome no SQLite local usa `lower()`, que só dobra ASCII: "Ação" e "AÇÃO" passam no banco local e só o domínio (`toLowerCase` do JS, que dobra Unicode) e o PostgreSQL recusam. Avaliar coluna normalizada ou função registrada no Worker | passo 17 | baixa |
| TD-026 | Pull ordena por versão; um lote aplica mães antes de filhas (`parentsFirst`), mas entre páginas uma filha pode chegar antes da mãe editada depois dela, e a FK local falharia. Só acontece com mais de 1.000 mudanças pendentes no pull (`SYNC_PULL_LIMIT`); tratar com pull adiando filhas órfãs ou FK `DEFERRABLE` | passo 17 | média (antes do beta) |
| TD-027 | Várias abas abertas: só a aba líder grava no SQLite, mas cada aba roda seu `SyncProvider` e a tela de uma aba não recarrega quando outra grava ou sincroniza. Avisar pelo BroadcastChannel do `LocalDbCoordinator` e eleger uma só aba para o sync | passo 17 | média (antes do beta) |
| TD-028 | O push valida cada mutação de categoria com `select … for update` de todas as categorias do perfil (`categoriesOfProfile`), serializando pushes concorrentes do mesmo perfil. Suficiente para dezenas de categorias; revisar se o volume crescer | passo 17 | baixa |
| TD-029 | Sem login, o web-app só sincroniza se o build tiver `VITE_ZL_DEV_USER_ID` (o `dev:worktree` e o build de E2E definem); sem ele o sync fica "indisponível" e a tela de categorias mostra "sem perfil". Some com o login (TD-008) | passo 17 | média (com o login) |
| TD-030 | `pnpm dev:worktree api` reinicia a API com `node --watch-path apps/api/dist`; no Windows o Node observa a árvore inteira e reinicia a cada arquivo gravado no repositório (capturas, `node_modules`, saída de testes), causando 502 no proxy do Vite durante E2E. Contorno usado: subir `node --env-file=.env.worktree apps/api/dist/main.js` sem watch | passo 17 | média |
| TD-031 | E2E da PoC 1 "app abre e o banco local funciona sem rede" falhou uma vez no Edge com `SQLITE_CANTOPEN` após recarregar (corrida ao reabrir o OPFS); passou em 4/4 repetições e na rodada completa seguinte. Investigar liberação do `opfs-sahpool` no `pagehide` | passo 17 | baixa |
| TD-032 | `/app/dev/sync` (PoC 2) ainda cria seu próprio `SyncEngine`, separado do `SyncProvider` do app; remover a página ou fazê-la usar o provider | passo 17 | baixa |
