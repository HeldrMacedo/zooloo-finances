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

- [ ] Regras da tabela acima em `@zooloo/domain`, com testes de exemplo e de propriedade (fast-check) para os invariantes (2 níveis, "Outros" protegida, unicidade de nome).
- [ ] `pnpm test:mutation` em `@zooloo/domain` com score ≥ 80%.
- [ ] Servidor aplica as regras no push; testes de integração contra PostgreSQL real cobrem cada regra, a cascata de exclusão e a criação das "Outros" com o perfil.
- [ ] IDOR (TD-008), com dois usuários: B não lê, não altera, não exclui categoria de A e não usa categoria de A como mãe.
- [ ] Tela `/categorias` conforme a seção acima, com testes de componente e axe sem violações.
- [ ] Playwright em Chrome e Edge (`pnpm --filter @zooloo/web-app test:e2e`): criar, editar, reordenar, arquivar, desarquivar e excluir; criar offline e sincronizar ao voltar; dois aparelhos com edições concorrentes que formariam 3 níveis terminam convergidos e válidos.
- [ ] Capturas da tela real e de `/app/design` (se houver componente novo) nos temas claro e escuro, anexadas ao PR.
- [ ] Se o esquema mudar: migrações geradas e versionadas. Se o contrato da API mudar: `apps/api/openapi.json` atualizado.
- [ ] Dívida nova no `tech-debt-tracker.md` para "mover transações para Outros ao excluir"; TD-008 atualizada (IDOR feito, login pendente).
- [ ] `pnpm check` verde.
- [ ] Log deste arquivo e do plano da Fase 0 (passo 17) atualizados.
- [ ] PR aberto contra `main` com descrição, evidências (saída dos gates, capturas) e lista de decisões tomadas durante a execução.

## Passos

Preenchidos por quem executa.

| # | Passo | Status |
|---|---|---|

## Log

- **2026-11-23** — Tarefa escrita e decisões tomadas com o dono do produto: offline-first pelo sync, regras no domínio aplicadas nos dois lados, login fora do escopo com IDOR pelo sync, exclusão lógica sem mover transações.
