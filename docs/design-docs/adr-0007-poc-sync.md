# ADR-0007 — PoC 2: sincronização com merge por campo (HLC)

- Status: aceito (categorias e perfis, Chrome e Edge); notificação em tempo real e carga de 20 mil lançamentos pendentes
- Data: 2026-11-19
- Origem: doc 07 §4 e §4A, doc 09 §8 (PoC 2), doc 11 §3, RNF-SYN-02..04, F6

## Pergunta

O PWA sincroniza o banco local com a API, com edição concorrente offline em dois computadores e exclusão, convergindo sem duplicar e sem perder escrita?

## Decisão

1. **`@zooloo/sync-core`** (pacote puro, sem I/O, mesmas regras de pureza do `domain`):
   - **HLC** serializado em largura fixa `parede(15)-contador(6)-nó(16 hex)`, então a ordem do texto é a ordem do HLC e o nó desempata. Relógio remoto mais de 5 min à frente é recusado (`MAX_DRIFT_MS`), para um relógio errado não vencer sempre.
   - **Merge por campo**: para cada campo vence o maior HLC. Comutativo, associativo e idempotente (testes de propriedade com fast-check). Exclusão é o campo `deletedAt` (tombstone): edição antiga não ressuscita o registro.
   - **Motor** (`SyncEngine`): envia o outbox em lotes de 500 e puxa o delta em páginas de 1.000, mesclando campo a campo. Banco e rede entram pelas portas `SyncStore` e `SyncTransport`, implementadas no app (e, na Fase 2, no mobile).
   - Mutação recusada volta com o estado do servidor; o cliente substitui o registro local (ou o apaga, se não existe no servidor).
2. **HLC por campo** em coluna `field_hlc` (jsonb no PostgreSQL, JSON em texto no SQLite), em toda tabela sincronizada. `hlc` da linha passa a ser o maior entre os campos. Linhas sem `field_hlc` usam o `hlc` da linha.
3. **Versão por usuário** na tabela `sync_state` (RLS forçada, sem DELETE para a aplicação). Cada push faz `INSERT … ON CONFLICT DO UPDATE … RETURNING`, que trava a linha e serializa os pushes do mesmo usuário; as linhas alteradas recebem essa versão.
4. **API** (`apps/api/src/modules/sync`): `POST /api/v1/sync/push` e `GET /api/v1/sync/pull?since&limit`.
   - Cada mutação roda num *savepoint*: recusa (`invalid`, `conflict`, `not_found`) não derruba o lote.
   - Campos graváveis por entidade validados com Zod (`SYNC_FIELDS`); `isSystem`, `userId` e colunas de controle nunca vêm do cliente. Tipo da categoria e moeda do perfil não mudam depois de criados.
   - O pull não divide uma versão entre páginas (o cursor é a última versão entregue).
5. **Identificação provisória**: cabeçalho `X-Dev-User-Id` aceito só com `DEV_AUTH=true`; a API não sobe com `DEV_AUTH` em produção. O guard de sessão real substitui `CurrentUserGuard` sem mudar os controllers (TD-008).
6. **Cliente** (`apps/web-app/src/data/sync`): `LocalSyncStore` (banco local como réplica e outbox `sync_outbox`, cursor, nó e último HLC em `sync_meta`) e `HttpSyncTransport` (respostas validadas com Zod). Página de PoC em `/app/dev/sync`; o sync roda ao clicar e quando a rede volta.

## Evidência

- `@zooloo/sync-core`: 55 testes, incluindo propriedade de convergência com 3 dispositivos e qualquer intercalação de escritas e syncs; cobertura 100% de linhas; mutação 90,95%.
- API: 16 testes de integração contra PostgreSQL 17 real (Testcontainers): criação e pull com HLC por campo, edição concorrente de campos diferentes (F6), tombstone, idempotência, recusas sem derrubar o lote (nome duplicado, campo proibido, tipo imutável, inexistente, HLC adiantado, perfil de outro usuário), isolamento entre usuários (IDOR) e paginação sem dividir versão.
- Web-app: 8 testes do `LocalSyncStore` sobre SQLite real (`node:sqlite`, mesmo driver proxy) e 4 do transporte.
- Playwright contra a API e o PostgreSQL da worktree, em Chrome e Edge: dois contextos (OPFS separados) criam e recebem categoria; os dois ficam offline, renomeiam a mesma categoria e um exclui outra; ao voltar a rede a fila sai sozinha e os dois convergem para a escrita mais nova, sem a excluída.

## Consequências e limites

- O proxy do SQLite não abre transação entre mensagens: gravar registro, outbox e cursor são escritas separadas. Como o merge é idempotente, uma interrupção é corrigida no próximo pull; o risco residual é uma mutação aplicada localmente sem entrada no outbox (TD-019).
- Conflito de unicidade (duas categorias com o mesmo nome criadas offline) é recusado e desfeito no cliente, sem aviso na interface ainda (TD-020).
- Notificação em tempo real (WS/SSE, RNF-SYN-04) e o teste de 20 mil lançamentos (RNF-PWA-03) ficam para a próxima etapa (TD-021).
- Identificação por cabeçalho é só para desenvolvimento e E2E (TD-008 continua alta).
