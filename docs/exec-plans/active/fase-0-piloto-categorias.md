# Tarefa-piloto — CRUD de categorias (Fase 0, passo 17)

Fonte: `docs/product-specs/11-roadmap-e-mvp.md` §3 (critério de saída) e §4.3 (RF-CAT-01, 02 e 05). Risco: **alto** (domínio, sync, segurança).

## Contexto para quem executa

Esta é a tarefa-piloto do harness. O que está sendo medido é se um agente, só com esta tarefa, o repositório e a documentação, entrega a funcionalidade e abre o PR passando em todos os gates sem que uma pessoa escreva código. Por isso esta tarefa diz **o que** entregar e as decisões já tomadas, não **como** implementar.

- Comece por `AGENTS.md` e `ARCHITECTURE.md`.
- Trabalhe numa worktree própria e suba o ambiente com `pnpm dev:worktree`.
- Registre seus passos e decisões nas seções **Passos** e **Log** deste arquivo, como no plano da Fase 0.
- Siga o fluxo do doc 12 §6.1: testes primeiro nas regras de domínio, conferência no navegador, revisão, PR com evidências.
- Casos de `docs/design-docs/core-beliefs.md#escalar` vão para uma pessoa. Não altere CI, gates, limites de cobertura nem regras de segurança.

## Objetivo

O usuário gerencia as categorias de receita e de despesa do seu perfil na tela `/categorias` do web-app, também offline, e as regras de negócio valem tanto no aparelho quanto no servidor.

## O que já existe

- Tabelas `categories` no PostgreSQL (com RLS) e no SQLite local (`@zooloo/db-schema`).
- Schemas de categoria e contrato do sync (`@zooloo/validation`).
- Sync de categorias por `POST /sync/push` e `GET /sync/pull` (ADR-0007) e `LocalSyncStore` no web-app.
- Item "Categorias" no menu, hoje apontando para a página "em breve".
- Identificação provisória por `DEV_AUTH` / `X-Dev-User-Id` (sem login real).

## Decisões já tomadas (não reabrir)

1. **Offline-first pelo sync.** A tela lê e grava no banco local; o sync leva ao servidor. Rotas REST `/categories` (doc 07) **não** fazem parte desta tarefa.
2. **Regras em `@zooloo/domain`**, como funções puras, usadas nos dois lados: no web-app antes de gravar e no servidor ao validar cada mutação do push, contra o estado atual do servidor. O cliente pode estar adulterado ou desatualizado; o servidor é quem decide.
3. **Login real fora do escopo.** Continua `DEV_AUTH`. Os testes de IDOR pedidos no TD-008 entram aqui, pelo sync.
4. **Excluir é exclusão lógica** (`deletedAt`). Ainda não existe tabela de transações; "mover transações para Outros" (RN-CAT-02) fica como dívida nova para o módulo de transações.
5. **Fora do escopo:** lista oficial de categorias iniciais (TD-012), mover em massa (RF-CAT-03, Plus), tempo real do sync (TD-021).

## Regras

| ID | Regra |
|---|---|
| RN-CAT-01 | Toda categoria é de receita ou de despesa, e o tipo não muda depois de criada. Subcategoria tem o mesmo tipo da mãe. |
| RN-CAT-01 | No máximo 2 níveis: a mãe precisa ser de primeiro nível; categoria que tem filhas não pode virar filha. |
| RN-CAT-02 | Arquivar tira a categoria da escolha de novas transações e mantém o histórico. Pode desarquivar. |
| RN-CAT-02 | Filha de mãe arquivada conta como arquivada (estado derivado, sem gravar nas filhas), inclusive filha criada offline depois do arquivamento. Desarquivar a mãe devolve as filhas ao estado próprio delas. |
| RN-CAT-02 | Excluir a mãe exclui as filhas. No servidor a cascata acontece na mesma transação, cobrindo filhas que o cliente não conhecia. |
| RN-CAT-03 | "Outros" (`isSystem`) existe uma por tipo em cada perfil. Não pode ser excluída, arquivada, virar filha nem receber filhas; o nome não muda; ícone e cor podem mudar. `isSystem` nunca vem do cliente. |
| RN-CAT-03 | Quando o servidor cria um perfil pelo push, cria as duas "Outros" (receita e despesa) na mesma transação; o pull as entrega ao cliente. |
| RN-CAT-07 | Nome único por (perfil, tipo, mãe), sem diferenciar maiúsculas. O banco já garante; o domínio checa antes para mostrar mensagem clara. |
| RF-CAT-05 | Ordem manual entre irmãs (`sortOrder`). |
| — | Criar filha sob mãe excluída, inexistente ou de outro usuário é rejeitado. |
| — | Mutação que viola regra é rejeitada pelo servidor (`conflict` ou `invalid`) e o cliente converge para o estado do servidor no pull. Duas edições offline que, juntas, formariam 3 níveis não podem passar. |

## Tela `/categorias`

- Abas Despesas e Receitas. Lista em árvore: mães e, recuadas abaixo, as filhas. Cada linha com ícone, cor e nome, e um menu de ações: editar, arquivar ou desarquivar, excluir.
- Alternância "Mostrar arquivadas". "Outros" aparece sem as ações que a regra proíbe.
- Criar e editar em diálogo: nome, mãe (só categorias de primeiro nível do mesmo tipo, não arquivadas e diferentes de "Outros"), ícone (conjunto curto de ícones Lucide) e cor (paleta fixa com contraste validado nos dois temas).
- Erros de regra mostrados em pt-BR, ligados ao campo quando houver campo.
- Reordenar arrastando, com alternativa por teclado (mover para cima e para baixo).
- Confirmação antes de excluir, avisando quantas filhas serão excluídas junto.
- Estados de vazio e de carregamento. Funciona offline; o indicador de sync mostra o estado.
- Textos em `@zooloo/i18n`. Visual e componentes conforme doc 13 e `packages/ui-tokens`.

## Critérios de aceite

- [x] Regras da tabela acima em `@zooloo/domain`, com testes de exemplo e de propriedade (fast-check) para os invariantes (2 níveis, "Outros" protegida, unicidade de nome).
- [x] `pnpm test:mutation` em `@zooloo/domain` com score ≥ 80%.
- [x] Servidor aplica as regras no push; testes de integração contra PostgreSQL real cobrem cada regra, a cascata de exclusão e a criação das "Outros" com o perfil.
- [x] IDOR (TD-008), com dois usuários: B não lê, não altera, não exclui categoria de A e não usa categoria de A como mãe.
- [x] Tela `/categorias` conforme a seção acima, com testes de componente e axe sem violações.
- [x] Playwright em Chrome e Edge (`pnpm --filter @zooloo/web-app test:e2e`): criar, editar, reordenar, arquivar, desarquivar e excluir; criar offline e sincronizar ao voltar; dois aparelhos com edições concorrentes que formariam 3 níveis terminam convergidos e válidos.
- [x] Capturas da tela real e de `/app/design` (se houver componente novo) nos temas claro e escuro, anexadas ao PR.
- [x] Se o esquema mudar: migrações geradas e versionadas. Se o contrato da API mudar: `apps/api/openapi.json` atualizado.
- [x] Dívida nova no `tech-debt-tracker.md` para "mover transações para Outros ao excluir"; TD-008 atualizada (IDOR feito, login pendente).
- [x] `pnpm check` verde.
- [x] Log deste arquivo e do plano da Fase 0 (passo 17) atualizados.
- [x] PR aberto contra `main` (sem remoto: descrição em `PR.md` na raiz da worktree, fora do git) com descrição, evidências (saída dos gates, capturas) e lista de decisões tomadas durante a execução.

## Passos

Preenchidos por quem executa.

| # | Passo | Status |
|---|---|---|
| 1 | Worktree `finances-categorias` na branch `feat/categorias-crud`; `pnpm dev:worktree up` | feito |
| 2 | Domínio: `category.ts` (validação de criar e alterar) e `category-tree.ts` (arquivamento derivado, cascata, árvore, reordenação), testes primeiro, com propriedades fast-check | feito; 49 testes, mutação do pacote 92,50% (`category.ts` 97,2%, `category-tree.ts` 92,5%) |
| 3 | `sync-core`: gerador UUIDv7 puro compartilhado (a API precisa criar as "Outros" com id compatível) | feito |
| 4 | API: regras do domínio no push contra o estado do servidor, cascata no mesmo savepoint, "Outros" com o perfil, IDOR | feito; 21 testes de integração contra PostgreSQL 17 |
| 5 | `ui-tokens`: paleta fixa de cores de categoria com teste de contraste; doc 13 §2.5 | feito |
| 6 | Web-app: ordem segura das FKs locais no pull e no desfazer | feito |
| 7 | `i18n`: textos da tela e do sync | feito |
| 8 | Web-app: `AppSyncProvider` no app (status, pendências, aviso de recusa, TD-020) | feito |
| 9 | Web-app: tela `/categorias` (abas, árvore, menu de ações, diálogo, arrastar e teclado, arquivadas, exclusão com aviso) e componentes novos na vitrine | feito; testes de componente com axe |
| 10 | Playwright em Chrome e Edge contra a API da worktree | feito; 28/28 |
| 11 | Conferência visual nos dois temas; corrigida cor de categoria sobrescrita pelo CSS Module | feito |
| 12 | Dívidas, arquitetura, qualidade, logs; `pnpm check`; PR.md | feito |

## Log

- **2026-11-23** — Tarefa escrita e decisões tomadas com o dono do produto: offline-first pelo sync, regras no domínio aplicadas nos dois lados, login fora do escopo com IDOR pelo sync, exclusão lógica sem mover transações.
- **2026-11-23** — Executada por agente (Claude), sem código escrito por pessoa. Domínio: `category.ts` e `category-tree.ts`, 49 testes com propriedades fast-check (2 níveis com sequência aleatória de operações, "Outros" protegida, nome único sem diferenciar maiúsculas), cobertura 100% linhas e 96,5% branches, mutação 92,50%. `sync-core` ganhou o UUIDv7 puro (mutação 91,70%), usado pela API para criar as "Outros". API: cada mutação de categoria do push é validada pelo domínio contra o estado do servidor, com as categorias do perfil travadas (`for update`); recusa vira `conflict` (nome) ou `invalid` (demais regras); exclusão em cascata no mesmo savepoint, cobrindo filhas que o cliente não conhecia; perfil criado pelo push nasce com as duas "Outros"; `isSystem` nunca vem do cliente. 21 testes de integração contra PostgreSQL 17, incluindo edições concorrentes que formariam 3 níveis e IDOR com dois usuários. Contrato da API e esquema não mudaram (OpenAPI regenerado sem diferença; nenhuma migração). Web-app: `AppSyncProvider` para o app inteiro (escrita local + outbox, ciclo ao abrir, ao voltar para a aba, a cada 30 s e ao voltar a rede), `SyncStatus` com fase e pendências, aviso de mutação recusada (resolve TD-020); tela `/categorias` com abas, árvore, menu de ações no padrão WAI-ARIA, diálogo nativo, seletores de ícone e de cor, arrastar com alternativa por teclado (alça com setas e itens "Mover para cima/baixo"), "Mostrar arquivadas", confirmação de exclusão com as filhas, estados de carregamento, vazio, sem perfil e indisponível. Paleta de cores de categoria em `@zooloo/ui-tokens` com teste de contraste (doc 13 §2.5). Correção no `LocalSyncStore`: lote do pull aplica mães antes das filhas e o desfazer de criação recusada leva as filhas locais (FK). Web-app: 141 testes, 91,4% linhas e 86,8% branches, axe sem violações. Playwright 28/28 em Chrome e Edge, com 3 testes novos contra a API da worktree (CRUD, reordenar, arquivar e desarquivar, excluir com cascata e outro aparelho recebendo; criar offline; dois aparelhos com X sob Y e Y sob X offline, o segundo recusado e avisado, ambos convergem). `pnpm check` verde.
- **2026-11-23** — Achados e decisões durante a execução: (1) a cor da categoria era sobrescrita pelo `background` do CSS Module (mesma especificidade, carregado depois); só a captura de tela mostrou, os testes não, e foi corrigido. (2) A CSP proíbe estilo inline: cor por atributo `data-category-color` com regras geradas no `global.css`. (3) As capturas foram feitas com Playwright no Chrome instalado (`colorScheme` claro e escuro), não com `chrome --headless --screenshot`: pelo CLI a página ficava em "Carregando categorias…" porque o banco OPFS não abria antes da captura. (4) No `pnpm check` em paralelo, testes de tela do web-app passaram dos tempos padrão (5 s por teste, 1 s no `findBy`); `testTimeout` igual ao da API e do db-schema (30 s) e `asyncUtilTimeout` de 10 s. (5) `pnpm dev:worktree api` reiniciava a API a cada arquivo gravado no repositório no Windows (TD-030); a API foi rodada sem watch para o E2E. (6) Uma falha intermitente no E2E da PoC 1 no Edge (TD-031). Dívidas novas: TD-024 a TD-032. Risco alto (domínio, sync-core, API): o merge exige revisão de duas pessoas.
