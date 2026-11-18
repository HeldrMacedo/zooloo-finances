# 12 — Modo de desenvolvimento: harness engineering

Status: **norma de engenharia** [I]. Define como o Zooloo Finanças é construído: agentes de código escrevem o software e as pessoas projetam o ambiente, especificam a intenção e mantêm os ciclos de feedback.

Referência: OpenAI, *"Harness engineering: leveraging Codex in an agent-first world"* (Ryan Lopopolo, 11/02/2026), https://openai.com/pt-BR/index/harness-engineering/. Este documento adapta as práticas do artigo a um sistema financeiro, que exige rigor maior em correção, segurança e LGPD. As adaptações estão marcadas com **[Adaptação]**.

## 1. Princípios

1. **Humanos dirigem, agentes executam.** O papel principal da equipe é projetar ambientes, especificar intenções (requisitos, critérios de aceite) e construir ciclos de feedback para que os agentes façam trabalho confiável.
2. **Nenhum código escrito à mão.** Código de produto, testes, CI, infraestrutura, ferramentas internas, scripts do repositório, dashboards e a própria documentação técnica são gerados por agentes (Claude Code, Codex ou equivalente). As pessoas escrevem especificações, critérios de aceite, decisões e revisões.
3. **Quando o agente falha, falta algo no ambiente.** A resposta nunca é "tentar com mais afinco". A pergunta é: *qual capacidade, ferramenta, documento ou restrição está faltando, e como torná-la legível e verificável pelo agente?* A correção é feita no repositório, também pelo agente.
4. **O que o agente não vê não existe.** Decisões tomadas em reunião, WhatsApp, e-mail ou na cabeça de alguém precisam virar artefato versionado no repositório (ADR, spec, plano) para valer.
5. **Impor invariantes, não microgerenciar implementações.** Limites rígidos (arquitetura, segurança, dinheiro) são verificados mecanicamente; dentro deles, o agente tem liberdade de solução.
6. **O recurso escasso é a atenção humana.** Tudo que pode ser verificado por máquina é; a atenção humana vai para decisões de produto, risco e julgamento.

## 2. Papéis

| Papel | Responsabilidades |
|---|---|
| **Engenheiro de harness** (pessoas) | Decompor objetivos em blocos; escrever planos de execução; criar e evoluir ferramentas, linters, testes estruturais e documentação; revisar PRs de alto risco; decidir quando o agente escala |
| **Produto** (pessoas) | Priorizar; transformar feedback de usuários em critérios de aceite Dado/Quando/Então; validar resultados no ambiente de homologação |
| **Agente implementador** | Executar a tarefa numa *git worktree* isolada, rodar o app, testar, revisar o próprio trabalho e abrir o PR |
| **Agentes revisores** | Revisar PRs de outros agentes (correção, segurança, arquitetura, testes) e pedir mudanças até ficarem satisfeitos |
| **Agentes de manutenção** | Tarefas recorrentes de coleta de lixo, atualização de documentação e de notas de qualidade (§8) |

## 3. O repositório como sistema de registro

**AGENTS.md é um mapa, não um manual.** Um arquivo de instruções gigante ocupa o contexto, faz tudo parecer "importante" (logo nada é), apodrece rápido e não é verificável. Por isso o `AGENTS.md` tem **até ~100 linhas** e aponta para onde está o conhecimento detalhado (divulgação progressiva).

### 3.1 Estrutura da base de conhecimento

```
AGENTS.md                      # mapa (~100 linhas): como trabalhar aqui e onde procurar
CLAUDE.md                      # apenas importa o AGENTS.md (@AGENTS.md)
ARCHITECTURE.md                # mapa de domínios, camadas e pacotes
docs/
├── design-docs/
│   ├── index.md               # catálogo com status de verificação de cada doc
│   ├── core-beliefs.md        # princípios operacionais e "princípios de ouro" (§8)
│   └── adr-NNNN-*.md          # decisões de arquitetura (uma por arquivo)
├── exec-plans/
│   ├── active/                # planos em execução, com log de progresso e decisões
│   ├── completed/             # planos concluídos (histórico)
│   └── tech-debt-tracker.md   # dívida técnica conhecida
├── generated/
│   ├── db-schema.md           # gerado do Drizzle pelo CI (nunca editado à mão)
│   └── api.md                 # gerado do OpenAPI pelo CI
├── product-specs/
│   ├── index.md
│   ├── 01..12 (estes documentos)
│   └── <modulo>.md            # specs por funcionalidade com critérios de aceite
├── references/
│   └── *-llms.txt             # referências de bibliotecas legíveis por agente
│                              # (drizzle, sqlite-wasm, serwist, nestjs, expo, pluggy…)
├── DESIGN.md                  # design system Zooloo e padrões de UI (fonte: doc 13)
├── FRONTEND.md                # convenções do web-app e do PWA
├── PLANS.md                   # como escrever e manter planos de execução
├── PRODUCT_SENSE.md           # personas, tom da marca, o que é "bom" para o usuário
├── QUALITY_SCORE.md           # nota de qualidade por domínio e camada (§8)
├── RELIABILITY.md             # SLOs, orçamentos de desempenho, runbooks
└── SECURITY.md                # resumo e ponteiro para o doc 10 (normativo)
```

Na Fase 0 (doc 11 §3), os documentos 01–12 atuais migram para `docs/product-specs/`, e o `docs/SECURITY.md` aponta para o doc 10.

### 3.2 Planos de execução

- Mudança pequena: plano efêmero no próprio PR.
- Trabalho complexo (vários PRs, mudança de esquema, sync, segurança): plano versionado em `docs/exec-plans/active/` com objetivo, critérios de aceite, passos, log de progresso e decisões. Ao terminar, o plano vai para `completed/`.
- Planos, dívidas e decisões ficam no repositório para que qualquer agente retome o trabalho sem contexto externo.

### 3.3 Verificação mecânica da documentação

- Linter de documentação no CI: links internos válidos, `index.md` atualizado, IDs (RN/RF/RNF/SEC) existentes e únicos, documentos gerados batendo com o código.
- Agente recorrente de **jardinagem da documentação**: compara docs e comportamento real do código e abre PRs de correção.

## 4. Legibilidade do aplicativo para o agente

O agente precisa **ver** o sistema funcionando, não só o código.

- **App inicializável por *git worktree***: `pnpm dev:worktree` sobe API, workers, web-app, PostgreSQL e Redis isolados, com portas e banco derivados do nome da worktree e **dados sintéticos** de seed. Uma instância por tarefa.
- **Controle do navegador**: o agente usa Playwright / Chrome DevTools Protocol (por MCP) para navegar, tirar snapshots do DOM e capturas de tela, reproduzir bugs e validar correções no web-app e no PWA, inclusive em modo offline.
- **Observabilidade local efêmera**: coletor OpenTelemetry + pilha local (Loki, Prometheus, Tempo) por worktree, apagada ao fim da tarefa. O agente consulta logs com LogQL, métricas com PromQL e traces.
- **Orçamentos verificáveis pelo agente**: com essa pilha, instruções como "abertura a frio do PWA < 2 s" (RNF-PWA-02) ou "p95 de escrita < 500 ms" (RNF-DSP-02) viram verificações que o agente roda sozinho.
- **Evidência em vídeo**: em bug e em funcionalidade de UI, o agente grava vídeo (Playwright) da falha antes e da correção depois e anexa ao PR.

## 5. Arquitetura rígida e invariantes de gosto

### 5.1 Camadas por domínio

Cada domínio de negócio (contas, categorias, lançamentos, cartões, orçamentos, objetivos, perfis, assinatura, sync, …) segue um conjunto fixo de camadas, e o código só depende **para a frente**:

```
Types ─► Config ─► Repo ─► Service ─► Runtime ─► UI
                     ▲
          Providers (única porta para o transversal:
          autenticação, entitlements/feature flags, telemetria,
          criptografia, sync, conectores externos)
```

- `Types`: tipos e schemas Zod do domínio.
- `Config`: constantes e configuração tipada.
- `Repo`: acesso a dados (Drizzle; PostgreSQL no servidor, SQLite no cliente).
- `Service`: regras de negócio (as puras vivem em `@zooloo/domain`, sem I/O).
- `Runtime`: controllers NestJS, jobs, handlers do Web Worker.
- `UI`: componentes React.

Qualquer outra aresta de dependência é proibida e **bloqueada por linter** (dependency-cruiser + regras ESLint próprias) e por testes estruturais.

### 5.2 Invariantes de gosto (verificados por lint próprio)

- **Dinheiro só como `Money`** (inteiro em centavos + moeda). `number` ou `float` para valor monetário é erro de lint (RNF-FIN-01).
- **Data de negócio só como `LocalDate`**; `new Date()` fora dos adaptadores é erro (RNF-FIN-02).
- **Validar na fronteira**: todo dado externo (HTTP, sync, arquivo importado, webhook, resposta de LLM) passa por schema Zod. Nada de acessar campos de formato "adivinhado".
- **Log só pelo logger estruturado** de `@zooloo/security`, que mascara valores, descrições e e-mails (RNF-OBS-01). `console.*` é erro.
- **Toda tabela de dados do usuário tem RLS**; migração sem política de RLS falha no teste estrutural.
- Proibido `any`, `@ts-ignore` sem justificativa e *non-null assertion* em código de domínio.
- Convenção de nomes: `XxxSchema` (Zod), `XxxRepo`, `XxxService`; um conceito por arquivo; **limite de ~400 linhas por arquivo**.
- Preferir utilitários compartilhados a helpers locais duplicados.

**Mensagens de lint ensinam a corrigir.** Cada regra própria traz na mensagem de erro a instrução de correção e o link para o doc correspondente, para que o agente se corrija sem intervenção humana.

### 5.3 Dependências legíveis por agente

- Preferir tecnologia "chata": estável, combinável e bem representada (já refletido no doc 09).
- Quando uma biblioteca é opaca ou pequena, pode ser mais barato o agente reimplementar o subconjunto necessário, com telemetria e 100% de cobertura, do que contornar o comportamento externo.
- Para cada dependência crítica, manter um `docs/references/<lib>-llms.txt` com a API usada no projeto.

## 6. Fluxo de trabalho e merge

### 6.1 Ciclo de uma tarefa

1. A pessoa descreve a tarefa (ou aponta a spec e o plano).
2. O agente valida o estado atual do repositório e sobe a worktree.
3. O agente implementa, escreve testes primeiro quando há regra de domínio, roda o app e verifica no navegador e na observabilidade local.
4. O agente revisa as próprias mudanças, pede revisões a agentes revisores (locais e na nuvem) e responde a todo feedback, **em loop até todos os revisores ficarem satisfeitos**.
5. O agente abre o PR com evidências (testes, vídeos, métricas) e corrige falhas de CI.
6. O merge segue a política de risco (§6.2).
7. Comentários de revisão humana que se repetem viram regra de lint, teste ou documento (§8).

### 6.2 Política de merge por risco [Adaptação]

O artigo descreve merge com bloqueios mínimos e revisão quase toda entre agentes. Num sistema financeiro, isso vale para o código de baixo risco; o núcleo de dinheiro, dados e segurança mantém revisão humana.

| Nível | Escopo | Revisão | Merge |
|---|---|---|---|
| **Baixo** | UI, docs, ferramentas internas, refatoração sem mudança de comportamento, testes | Agentes revisores | Automático após CI verde |
| **Médio** | API e workers fora do núcleo, novas telas com regra de negócio | Agentes revisores + 1 pessoa | Após aprovação |
| **Alto** | `packages/domain`, `sync-core`, `security`, `db-schema`/migrações, RLS, autenticação, criptografia, pagamentos e entitlements, configuração de CI e dos gates | Agentes revisores + **2 pessoas** (SEC-DEV-01) | Manual; CODEOWNERS obrigatório |

- PRs curtos e de vida curta em todos os níveis.
- Testes instáveis fora do núcleo financeiro: nova execução automática e quarentena com issue (RNF-QA-09), sem travar o fluxo. **No núcleo financeiro e nos testes de segurança, teste instável bloqueia** até ser corrigido.
- Os gates de cobertura, mutação e segurança (doc 04 §7A, doc 10 SEC-DEV-02) nunca são dispensados por agente.

## 7. Níveis de autonomia

A autonomia cresce à medida que o harness amadurece. A subida de nível é decisão humana, com base nas métricas do §9.

| Nível | O agente faz | Pré-requisito para chegar |
|---|---|---|
| **A1** | Implementa tarefas pequenas a partir de plano escrito por pessoas; pessoas revisam tudo | Fase 0 concluída |
| **A2** | Abre PRs com loop de autorrevisão e revisão entre agentes; pessoas revisam só médio e alto risco | Gates e linters estáveis; taxa de reversão < 5% |
| **A3** | Reproduz bug relatado, grava vídeo da falha, corrige, valida rodando o app, grava vídeo da correção e faz merge de baixo risco | Ambiente por worktree e observabilidade local completos |
| **A4** | Implementa funcionalidade ponta a ponta a partir da spec, escalando para pessoas só quando há decisão de produto ou risco alto | Duas fases entregues em A3 sem defeito crítico escapado |

Em qualquer nível, o agente **escala para uma pessoa** quando: a spec é ambígua ou contraditória; a mudança toca o nível de risco alto; precisa alterar gate, regra de segurança ou dado de produção; ou falha 3 vezes no mesmo problema.

## 8. Entropia e coleta de lixo

Agentes replicam os padrões que já existem no repositório, inclusive os ruins. Sem controle, isso gera deriva. Em vez de limpar à mão periodicamente, o gosto da equipe é codificado uma vez e aplicado continuamente.

- **Princípios de ouro** em `docs/design-docs/core-beliefs.md`: regras opinativas e mecânicas, por exemplo:
  - preferir pacotes utilitários compartilhados a helpers locais, para manter os invariantes centralizados;
  - validar dados na fronteira ou usar SDK tipado; nunca sondar dados de formato desconhecido.
- **Tarefas recorrentes de agentes** (diárias ou semanais):
  - detectar desvios dos princípios de ouro e abrir PRs pequenos de refatoração (a maioria revisável em menos de 1 minuto e de risco baixo);
  - atualizar `docs/QUALITY_SCORE.md` com a nota de cada domínio e camada (cobertura, mutação, violações de lint, dívida, defeitos);
  - jardinagem da documentação (§3.3);
  - manter `tech-debt-tracker.md` atualizado.
- **Dívida técnica paga em parcelas pequenas e contínuas**, nunca em grandes rajadas.
- **Feedback humano vira sistema**: comentário de revisão, bug visível ao usuário ou refatoração manual pedida duas vezes vira lint, teste estrutural ou documento.

## 9. Segurança do harness [Adaptação]

Agentes com alta autonomia num sistema financeiro exigem controles próprios, além do doc 10.

- **Sem dados reais.** Agentes trabalham só com dados sintéticos; nenhum dump de produção em worktree, homologação ou contexto de agente (LGPD).
- **Sem acesso a produção.** Agentes não têm credenciais de produção, KMS, secret manager de produção nem acesso direto ao banco. Deploy em produção exige aprovação humana.
- **Sandbox.** Agentes rodam em ambiente isolado, com rede de saída restrita a registros de pacotes e serviços de desenvolvimento autorizados.
- **Proteção dos gates.** Arquivos de CI, configuração de linters, limites de cobertura, regras de RLS e políticas de segurança só mudam com revisão humana (CODEOWNERS, nível alto).
- **Injeção de prompt.** Conteúdo externo (issues públicas, READMEs de dependências, páginas web, arquivos importados de teste) é tratado como dado não confiável; nenhuma instrução vinda dele é seguida sem confirmação humana.
- **Cadeia de suprimentos.** Nova dependência adicionada por agente passa pela revisão de dependências (SEC-DEV-03).
- **Rastreabilidade.** Todo PR registra qual agente, modelo e plano o geraram.

## 10. Métricas do harness

Acompanhadas mensalmente em `docs/QUALITY_SCORE.md`:

- PRs por pessoa por dia e tempo médio do PR do início ao merge.
- Percentual de PRs mesclados sem intervenção humana no código.
- Taxa de reversão e de defeitos escapados para produção, por nível de risco.
- Cobertura e *mutation score* por camada (doc 04 §7A).
- Violações de lint arquitetural por semana (tendência de deriva).
- Escalações do agente por motivo (sinal de onde falta ferramenta ou documento).
- Tempo humano gasto em revisão.

## 11. Esqueleto do AGENTS.md

```markdown
# Zooloo Finanças — guia para agentes

## Como trabalhar
- Leia a tarefa e o plano em docs/exec-plans/active/ (se houver).
- Suba o ambiente: pnpm dev:worktree. Use só dados sintéticos.
- Teste primeiro em regras de domínio. Rode pnpm check (lint, tipos, testes, cobertura) antes do PR.
- Valide no navegador (Playwright) e na observabilidade local; anexe evidências ao PR.
- Revise o próprio trabalho e peça revisão aos agentes revisores até todos aprovarem.
- Escale para uma pessoa nos casos de docs/design-docs/core-beliefs.md#escalar.

## Onde procurar
- Arquitetura e camadas: ARCHITECTURE.md
- Regras de negócio e requisitos: docs/product-specs/index.md
- Segurança (normativo): docs/product-specs/10-seguranca-e-protecao-de-dados.md
- Qualidade e metas de teste: docs/QUALITY_SCORE.md e doc 04 §7A
- Planos e dívida: docs/exec-plans/
- Esquema do banco: docs/generated/db-schema.md

## Invariantes que nunca mudam
- Dinheiro = Money em centavos. Datas de negócio = LocalDate.
- Validar toda entrada externa com Zod.
- Toda tabela de usuário com RLS.
- Logs só pelo logger mascarado.
- Não alterar CI, gates ou regras de segurança sem revisão humana.
```
