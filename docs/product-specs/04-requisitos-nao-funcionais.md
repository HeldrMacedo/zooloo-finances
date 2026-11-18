# 04 — Requisitos não funcionais

## 1. Segurança

> Os controles detalhados e normativos estão no [doc 10 — Segurança e proteção de dados](10-seguranca-e-protecao-de-dados.md). Os itens abaixo são o resumo; em caso de conflito, vale o mais restritivo.

- **RNF-SEG-01** [O] Todo tráfego usa TLS 1.2+ (a referência declara "todos os dados criptografados no tráfego"). [I] HSTS no Web.
- **RNF-SEG-02** [I] Criptografia em repouso: disco do banco (AES-256) + criptografia de campo para observações, anexos e tokens do agregador/OAuth.
- **RNF-SEG-03** [I] Senhas com Argon2id. Política mínima: 8 caracteres e verificação contra lista de senhas vazadas.
- **RNF-SEG-04** [I] Autenticação de sessão: access token JWT de 15 min + refresh token rotativo (detecção de reuso revoga a família). No Web, cookie `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth` (SEC-ID-03).
- **RNF-SEG-05** [I] 2FA opcional (TOTP) para a conta.
- **RNF-SEG-06** [O] PIN de perfil nunca é digitado em terceiros (agentes). [I] O PIN é armazenado como hash com sal (Argon2id), e a validação é feita no servidor quando o desbloqueio é remoto.
- **RNF-SEG-07** [O] Open Finance é somente leitura e o app nunca vê a senha bancária. [I] O `itemId` do agregador fica criptografado e os webhooks são validados por assinatura.
- **RNF-SEG-08** [I] Isolamento multi-tenant: toda consulta é filtrada por `user_id` + `profile_id` (Row-Level Security no PostgreSQL).
- **RNF-SEG-09** [I] Rate limiting por IP e por usuário em login, reset de senha, OAuth e MCP. Bloqueio progressivo.
- **RNF-SEG-10** [I] Trilha de auditoria imutável para ações sensíveis: login, troca de senha, PIN, exclusão de perfil/conta, restauração, conexões OF/MCP, escritas via MCP (com client_id).
- **RNF-SEG-11** [I] OWASP ASVS nível 2; CSP restritiva no Web; pentest anual.
- **RNF-SEG-12** [I] Mobile: tokens no Keystore/Keychain; bloquear captura de tela no modo privado (Android `FLAG_SECURE` opcional); detectar root/jailbreak apenas para avisar.
- **RNF-SEG-13** [I] Bancos locais sempre cifrados: SQLCipher no mobile, com verificação de `PRAGMA cipher_version` (SEC-CR-07), e estratégia de cifra do PWA (SEC-CR-08).
- **RNF-SEG-14** [I] Nenhum dado de cartão de pagamento armazenado (PCI SAQ-A); nenhuma integração com permissão de movimentar dinheiro.
- **RNF-SEG-15** [I] Gate de produção do doc 10 §18 obrigatório a cada release maior.

## 2. Privacidade e LGPD

- **RNF-LGPD-01** [O] Atender aos direitos do titular: confirmação, acesso, correção, exclusão (self-service), portabilidade, revogação do consentimento, revisão de decisão automatizada.
- **RNF-LGPD-02** [O] Excluir a conta remove todos os dados. [I] Exclusão física em até 30 dias (inclusive dos backups rotativos), com e-mail de confirmação.
- **RNF-LGPD-03** [O] Exclusão automática por 6 meses de inatividade.
- **RNF-LGPD-04** [O] Não compartilhar dados com terceiros, salvo autoridades. [I] Operadores (agregador, provedor de LLM, nuvem) listados na política. Usar provedores de IA com retenção zero e sem treino.
- **RNF-LGPD-05** [I] Consentimento separado para marketing (opt-in) e para IA (aceite ao ativar a Zoe).
- **RNF-LGPD-06** [I] Zooloo Kids: dados mínimos da criança, consentimento do responsável e sem anúncios no app Zooloo Kids.
- **RNF-LGPD-07** [I] Dados processados no Brasil (região `southamerica-east1` ou equivalente) quando possível.

## 3. Disponibilidade, desempenho e escala

- **RNF-DSP-01** [I] SLO de API de 99,9% mensal; sincronização tolerante a falha (o app continua offline).
- **RNF-DSP-02** [I] Latência p95: leitura < 300 ms, escrita < 500 ms, sync delta < 1 s para até 500 mudanças.
- **RNF-DSP-03** [I] Mobile: abertura a frio < 2 s em aparelho intermediário; abrir o formulário de lançamento < 300 ms.
- **RNF-DSP-04** [I] Web: LCP < 2,5 s, INP < 200 ms (Core Web Vitals).
- **RNF-DSP-05** [I] Suportar 1 M de usuários e 10 M de lançamentos/mês. Particionar `transaction` por `user_id` (hash).
- **RNF-DSP-06** [I] Relatórios de até 5 anos de histórico em < 3 s (pré-agregação mensal por categoria/conta).
- **RNF-DSP-07** [I] Backups: PITR com 7 dias de retenção + snapshot diário com 30 dias. RPO 5 min, RTO 1 h.

## 4. Sincronização / offline

- **RNF-SYN-01** [O] O app mobile funciona 100% offline para CRUD. [I] O **PWA** (Web/Desktop) também funciona 100% offline para CRUD (RN-PWA-05), com as exceções de RN-PWA-07.
- **RNF-SYN-02** [I] IDs gerados no cliente (UUIDv7) para evitar colisão e permitir criar offline.
- **RNF-SYN-03** [I] Protocolo de delta por `server_version` monotônico por usuário. Conflitos resolvidos por campo com HLC. Exclusão é *tombstone*, retido por 90 dias.
- **RNF-SYN-04** [I] Atualização em tempo real entre dispositivos (WebSocket/SSE notifica "há mudanças"; o cliente puxa o delta).
- **RNF-SYN-05** [O] Evitar duplicatas após reinstalação [problema relatado na referência]. [I] Ao reinstalar, fazer o pull completo antes de permitir escrita, e o ID de dispositivo fica persistido no Keychain (iOS) ou no Block Store (Android).

## 4A. PWA (Web/Desktop)

- **RNF-PWA-01** [I] Atender aos critérios de instalabilidade (manifest válido, Service Worker com handler `fetch`, HTTPS) e passar na auditoria de PWA do Lighthouse/PWABuilder.
- **RNF-PWA-02** [I] Abertura a frio do app instalado em < 2 s offline (app shell em precache) e < 3 s online em máquina intermediária.
- **RNF-PWA-03** [I] Sync inicial de um perfil com 5 anos de dados (~20 mil lançamentos) em < 20 s em 20 Mbps, com progresso visível. O uso parcial começa com os últimos 13 meses e o histórico completa em segundo plano.
- **RNF-PWA-04** [I] Respostas autenticadas da API **não** ficam no Cache Storage do Service Worker; dados financeiros ficam apenas no banco local controlado pelo app. O escopo do Service Worker é restrito a `/app/`.
- **RNF-PWA-05** [I] Criptografia local conforme SEC-CR-08: build SQLite WASM com cifra ou criptografia por campo, com a chave do banco cifrada (*wrapped*) por chave Web Crypto não exportável e descartada no logout. Limitação documentada: protege contra cópia de arquivos, mas não contra malware na sessão do usuário. Por isso existe o modo sessão (RN-PWA-08).
- **RNF-PWA-06** [I] Uma só aba ou janela é **líder** e mantém o banco aberto (o VFS `opfs-sahpool` não permite acesso simultâneo). A eleição usa a Web Locks API, e as demais abas enviam consultas e mutações à líder via BroadcastChannel. Se a líder fechar, outra assume.
- **RNF-PWA-07** [I] Compatibilidade de instalação:
  - Chrome e Edge (2 últimas versões) em Windows 10+ e macOS 12+;
  - Safari 17+ no macOS 14+ ("Adicionar ao Dock").

  Uso no navegador (sem instalar) em Chrome, Edge, Firefox e Safari, 2 últimas versões.

## 5. Precisão financeira

- **RNF-FIN-01** [I] Valores monetários armazenados como inteiro em centavos (`bigint`) + código ISO 4217 da moeda do perfil. Nunca usar float.
- **RNF-FIN-02** [I] Datas de negócio armazenadas como `date` (sem fuso). Timestamps em UTC. Fuso do usuário para "hoje" (padrão America/Sao_Paulo).
- **RNF-FIN-03** [I] Todos os cálculos de saldo, fatura e orçamento implementados em um **núcleo de domínio compartilhado** em TypeScript (`@zooloo/domain`, doc 09), usado no backend, no mobile e no Web, com bateria de testes de propriedade.
- **RNF-FIN-04** [I] Arredondamento *half-even* em divisões (parcelas, percentuais) e resíduo explícito (RN-LAN-11).

## 6. Usabilidade e acessibilidade

- **RNF-UX-01** [I] WCAG 2.1 AA no Web; suporte a TalkBack/VoiceOver, Dynamic Type e contraste no mobile.
- **RNF-UX-02** [I] Valores sempre com sinal e cor (verde = entrada, vermelho = saída, tokens `color.income` e `color.expense` do [doc 13](13-identidade_visual.md) §2.4), além de ícone ou texto (não depender só da cor). O Teal da marca não é usado para indicar receita.
- **RNF-UX-03** [O] Modo privado oculta valores em todas as telas e widgets.
- **RNF-UX-04** [I] Formulário de lançamento com teclado numérico, valor em destaque e sugestões de categoria pelo histórico da descrição.
- **RNF-UX-05** [I] Web responsivo (≥ 360 px), mas otimizado para ≥ 1280 px. Atalhos de teclado (N nova despesa, R nova receita, T transferência, `/` busca).
- **RNF-UX-06** [I] Localização pt-BR primeiro; textos externalizados (i18n) para futuras línguas.

## 7. Observabilidade

- **RNF-OBS-01** [I] Logs estruturados sem dados financeiros nem PII (mascarar valores, descrições e e-mails).
- **RNF-OBS-02** [I] Tracing distribuído (OpenTelemetry). Crash reporting no mobile (Crashlytics/Sentry).
- **RNF-OBS-03** [I] Métricas de produto: ativação (1º lançamento), retenção D7/D30, conversão do teste, uso de cada recurso, falhas de conexão OF por instituição.

## 7A. Qualidade e testes automatizados

Por se tratar de um sistema financeiro, a cobertura de testes é requisito de liberação, não meta aspiracional. As metas são por camada: o rigor é maior onde está o cálculo de dinheiro e a sincronização, e a cobertura global de 90% é o piso do repositório.

- **RNF-QA-01** [I] **Cobertura global ≥ 90%** de linhas no monorepo (soma de `packages/` e `apps/`). O CI **bloqueia o merge** de PR que reduza a cobertura global ou a de qualquer pacote abaixo da meta da sua camada.
- **RNF-QA-02** [I] **Núcleo financeiro** (`@zooloo/domain` e `@zooloo/sync-core`):
  - cobertura ≥ 95% de linhas e ≥ 90% de branches;
  - **testes de mutação** (Stryker) com *mutation score* ≥ 80%;
  - **testes de propriedade** (fast-check) para invariantes: soma de parcelas = total, resíduo de arredondamento explícito (RN-LAN-11), saldo previsto = saldo atual + pendentes, fatura fecha na data correta da regra de fechamento, transferência não altera o patrimônio, merge de sync convergente e idempotente (mesma ordem final em qualquer ordem de entrega).
- **RNF-QA-03** [I] **API e workers** (`apps/api`, `apps/mcp`, `apps/workers`):
  - cobertura ≥ 90% de linhas;
  - testes de integração contra **PostgreSQL real** (Testcontainers), com RLS ativo;
  - teste de **IDOR** para todos os endpoints e ferramentas MCP (SEC-AZ-02);
  - testes de contrato da API (OpenAPI/Zod) entre `api` e `api-client`.
- **RNF-QA-04** [I] **Integrações e parsers** (OFX, CSV, XLSX, webhooks e conectores Pluggy):
  - cobertura ≥ 90%;
  - corpus de arquivos reais **anonimizados** por banco/instituição, com teste de regressão a cada novo formato encontrado;
  - *fuzzing* dos parsers com entradas malformadas.
- **RNF-QA-05** [I] **UI Web/PWA e mobile** (`apps/web-app`, `apps/mobile`, `apps/kids`):
  - cobertura ≥ 70% de linhas (componentes e hooks; telas puramente visuais ficam fora da meta);
  - **E2E** obrigatórios dos fluxos críticos: cadastro/login com 2FA, lançar (simples, parcelado, recorrente), transferência, pagar fatura, orçamento, objetivo, conciliação, sincronizar entre 2 dispositivos, uso **offline** com reconexão, assinar/trocar de plano, exclusão de conta;
  - ferramentas: Playwright (Web/PWA em Chrome, Edge e Safari/WebKit) e Maestro ou Detox (Android e iOS);
  - testes de acessibilidade automatizados (axe) nas telas principais (RNF-UX-01).
- **RNF-QA-06** [I] **Segurança automatizada** no pipeline: SAST, SCA, varredura de segredos, DAST em homologação e teste de mascaramento de logs (SEC-DEV-02). Falha em qualquer um bloqueia a release.
- **RNF-QA-07** [I] **Testes de migração**: toda migração de esquema (PostgreSQL e SQLite local) é testada subindo de cada uma das 3 últimas versões publicadas, com dados de exemplo, sem perda nem duplicidade.
- **RNF-QA-08** [I] **Desempenho**: testes de carga (k6) da API e do sync antes de cada release maior, validando RNF-DSP-02 e RNF-PWA-03.
- **RNF-QA-09** [I] **Política**: todo bug corrigido ganha um teste de regressão; nenhum teste é desabilitado sem issue aberta e prazo; testes instáveis (*flaky*) entram em quarentena e são corrigidos em até 1 sprint, exceto no núcleo financeiro e nos testes de segurança, onde teste instável bloqueia o merge (doc 12 §6.2). Arquivos excluídos da cobertura (código gerado, configuração) ficam listados explicitamente na configuração do CI.

## 8. Compatibilidade

- **RNF-CMP-01** [I] Android 8.0+ (API 26). Recursos de notificação seguem as restrições do Android 15+ (alertas sensíveis ocultos — RN-NTF).
- **RNF-CMP-02** [I] iOS 16+. Recursos condicionados: Apple Pay/Carteira em iOS 17+; "Importar notificação" em iOS 27+ [O].
- **RNF-CMP-03** [I] Web: últimas 2 versões de Chrome, Edge, Firefox e Safari. PWA instalável conforme RNF-PWA-07.
- **RNF-CMP-04** [I] Mobile em tablet com layout de 2 painéis.
