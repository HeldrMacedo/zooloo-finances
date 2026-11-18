# 11 — Roadmap e MVP

Status: **plano de entrega** [I]. Define as fases do produto, o escopo do MVP e os critérios de aceite dos fluxos críticos. O modo de desenvolvimento (agentes, harness, gates) está no [doc 12](12-modo-de-desenvolvimento-harness-engineering.md).

## 1. Princípios do roadmap

1. **MVP = Web + PWA + backend.** Nenhum app nativo no MVP. A mesma API e o mesmo `@zooloo/sync-core` servirão o mobile na Fase 2, sem retrabalho.
2. **Fundação completa, funcionalidades enxutas.** Segurança (doc 10), sincronização offline, modelo de dados, núcleo de domínio e gates de qualidade (doc 04 §7A) entram inteiros desde o MVP. O que fica para depois são **funcionalidades**, nunca controles.
3. **Complexidade alta vai para fases seguintes**: Open Finance, IA, MCP, leitura de notificações/SMS, Zooloo Kids, importação com conciliação, relatórios avançados e cobrança nas lojas.
4. **Cada fase termina por critério de saída**, não por data. Datas são planejadas por fase com base na vazão medida da fase anterior.
5. **Feature flags** para tudo que muda regra de plano ou ativa integração externa, permitindo liberar por grupo (beta fechado, beta aberto, geral).

## 2. Visão geral das fases

| Fase | Nome | Plataformas | Objetivo | Público |
|---|---|---|---|---|
| 0 | Fundação e harness | — | Monorepo, harness de agentes, CI com gates, PoCs de risco do Web | Equipe |
| 1 | **MVP Web + PWA + backend** | Web, PWA (Windows/macOS) | Controle financeiro manual completo, offline e sincronizado | Beta fechado |
| 1.1 | Lançamento público Web | Web, PWA | Cobrança Web, teste de 15 dias, gating de plano, site e ajuda | Público |
| 2 | Mobile + recursos intermediários | + Android, iOS | Apps Expo e recursos de média complexidade | Público |
| 3 | Open Finance | Todas | Integração Pluggy (Conecta/Pro) | Público |
| 4 | IA e agentes | Todas | Zoe, Relatório Inteligente, servidor MCP + OAuth 2.1 | Público |
| 5 | Nativos avançados e Zooloo Kids | Mobile, Kids | Notificações/SMS, Atalhos/App Intents, widgets, Kids, PJ | Público |

## 3. Fase 0 — Fundação e harness

Objetivo: deixar o ambiente pronto para que agentes entreguem funcionalidades com segurança (doc 12).

**Entregas**

- Monorepo pnpm + Turborepo com `apps/api`, `apps/web-app`, `apps/site`, `apps/workers` e `packages/domain`, `sync-core`, `db-schema`, `api-client`, `validation`, `security`, `i18n`, `ui-tokens` (doc 09 §3). `apps/mobile`, `apps/kids` e `apps/mcp` ficam só reservados.
- Base de conhecimento do repositório no formato do doc 12 §3: `AGENTS.md`, `ARCHITECTURE.md`, `docs/` com estes documentos migrados para `docs/product-specs/`.
- Linters arquiteturais e de "gosto" (doc 12 §5), com mensagens de erro que dizem como corrigir.
- CI com os gates de qualidade (RNF-QA-01..09) e de segurança (SEC-DEV-02) ativos **desde o primeiro commit** de código.
- Ambiente por *git worktree*: API, PostgreSQL, Redis, web-app e pilha de observabilidade local sobem isolados por worktree (doc 12 §4).
- Pacote `@zooloo/ui-tokens` gerado a partir da identidade visual ([doc 13](13-identidade_visual.md) §6), com teste de contraste; componentes base do design system (botão, campo, card, topbar, menu lateral) no tema claro e escuro.
- Infraestrutura de homologação e produção como código; secret manager; KMS; backups com restauração testada.
- **PoCs obrigatórias do Web** (doc 09 §8):
  - PoC 1, PWA offline: Vite + sqlite-wasm `opfs-sahpool` + Drizzle + aba líder + instalação em Windows e macOS;
  - PoC 2, sync: `sync-core` no PWA contra a API, com conflito simultâneo e exclusão;
  - cifra local do PWA (SEC-CR-08), testando as duas estratégias e escolhendo uma por ADR.
- As PoCs de mobile (SQLCipher, código nativo) ficam para o início da Fase 2.

**Critérios de saída**

- [ ] Um agente consegue, a partir de uma tarefa escrita, implementar uma funcionalidade de exemplo (CRUD de categorias), abrir o PR e passar em todos os gates sem intervenção humana no código.
- [ ] PoCs aprovadas com ADR registrado em `docs/design-docs/`.
- [ ] Tipografia do [doc 13](13-identidade_visual.md) §3 empacotada no app e ativos provisórios de marca (doc 13 §7.1) no lugar. Os vetores definitivos não bloqueiam a Fase 0 nem o MVP; são obrigatórios antes do lançamento público (Fase 1.1).
- [ ] Pipeline de deploy para homologação automático; produção com aprovação humana.

## 4. Fase 1 — MVP Web + PWA + backend

### 4.1 Objetivo

Entregar o controle financeiro **manual** completo no navegador e no PWA instalado, funcionando offline e sincronizando entre abas, janelas e computadores, com a segurança do doc 10.

### 4.2 Decisões de plano no MVP

- **D-01 — Gating desligado no beta.** Hoje a regra RN-PLN-07 / RN-PWA-02 exige o Zooloo Plus para usar o Web. Sem app mobile no MVP, o usuário do Essencial ficaria sem cliente. No beta fechado, todos os usuários recebem o *entitlement* Plus por feature flag (`beta_plus_entitlement`), e o bloqueio RF-AUT-11 fica desligado. A regra volta a valer na Fase 1.1.
- **D-02 — Sem cobrança no MVP.** O modelo de *entitlements* (RF-PLN-04) é construído no backend desde o MVP, mas checkout, teste de 15 dias e gestão de assinatura entram na Fase 1.1.
- **D-03 — Um só idioma e uma só moeda padrão** (pt-BR, BRL), com a moeda por perfil já suportada no modelo.

> Decisões D-01, D-02 e D-03 **confirmadas pelo produto** em 18/11/2026.

### 4.3 Escopo do MVP

Legenda: **Sim** entra no MVP; **Parcial** entra a versão descrita; **Não** vai para a fase indicada.

**Autenticação, conta e dispositivos**

| Requisito | MVP | Observação |
|---|---|---|
| RF-AUT-01 cadastro, RF-AUT-02 login (só e-mail/senha), RF-AUT-03 esqueci a senha, RF-AUT-04 verificação de e-mail | Parcial | Login social Google/Apple na Fase 2 |
| 2FA TOTP + códigos de recuperação (RNF-SEG-05, SEC-ID) | Sim | Obrigatório pela linha de segurança |
| RF-AUT-06 excluir conta, RF-AUT-07 exportar meus dados | Sim | Direitos LGPD; exportação em JSON/CSV dentro de ZIP |
| RF-AUT-08 exclusão por inatividade | Sim | Job simples com avisos por e-mail |
| RF-AUT-10 dispositivos conectados | Sim | Lista sessões Web/PWA, desconexão remota e limpeza remota (remote wipe) |
| RF-AUT-05 teste de 15 dias, RF-AUT-11 bloqueio do Web no Essencial | Não | Fase 1.1 (D-01, D-02) |

**Onboarding, perfis e configurações**

| Requisito | MVP | Observação |
|---|---|---|
| RF-ONB-01..03 assistente inicial, categorias padrão, primeiros passos | Sim | |
| RF-PRF-01 perfis, RF-PRF-02 troca rápida | Sim | |
| RF-PRF-04 PIN de perfil, RF-PRF-05 transferência entre perfis | Não | Fase 2 |
| RF-CFG-01..03 tema, idioma/moeda, 1º dia do mês financeiro | Sim | |
| RF-CFG-05 suporte | Parcial | Formulário de contato; chatbot de ajuda na Fase 1.1 |

**Contas, categorias e lançamentos**

| Requisito | MVP | Observação |
|---|---|---|
| RF-CTA-01, 03..06 contas, investimento, saldos, reajuste, arquivar/excluir | Sim | |
| RF-CTA-02 agrupamento de contas | Não | Fase 2 |
| RF-CTA-07 biblioteca de imagens | Parcial | Conjunto fixo de ícones de bancos; personalização na Fase 2 |
| RF-CAT-01, 02, 05 categorias; RF-CAT-04 tags (sem gestão) | Sim | |
| RF-CAT-03 mover em massa, gestão de tags | Não | Fase 2 |
| RF-LAN-01..05 receita, despesa, despesa de cartão, transferência, situação, recorrência e parcelamento, edição de série | Sim | Núcleo do produto |
| RF-LAN-10, 11, 13, 15 lista mensal com filtros, busca, duplicar, atalho `N` | Sim | |
| RF-LAN-06 multicategorias, RF-LAN-07 valores negativos/reembolso, RF-LAN-08 transformar, RF-LAN-09 anexos, RF-LAN-12 lote | Não | Fase 2 |

**Cartões, extrato, orçamentos e objetivos**

| Requisito | MVP | Observação |
|---|---|---|
| RF-CRT-01..04, 06, 07 cartão, tela da fatura, cálculo por regra de fechamento, pagar, reabrir, detalhar em aberto | Sim | |
| RF-CRT-05 antecipação e crédito, RF-CRT-08 ignorar no limite | Não | Fase 2 |
| RF-EXT-01 extrato por conta e fatura | Sim | |
| RF-EXT-02 configurações do extrato | Parcial | Ordenação e totais diários |
| RF-ORC-01, 02 orçamentos | Parcial | Só mensal, meta fixa, por categorias |
| RF-ORC-03..09 meta por %, agrupado, personalizado, opções avançadas, alertas | Não | Fase 2 |
| RF-OBJ-01..03 objetivo por depósitos | Sim | |
| RF-OBJ-04..07 conta vinculada, simulador, automações | Não | Fase 2 |

**Resumo e relatórios**

| Requisito | MVP | Observação |
|---|---|---|
| RF-DSH-01 resumo | Parcial | Cards básicos fixos: saldo, pendências, cartões, orçamentos, objetivos, despesas por categoria |
| RF-DSH-02..04 configuração do saldo, modo privado, pendências | Sim | |
| RF-REL-05 gráficos | Parcial | Despesas por categoria e evolução mensal |
| RF-REL-08 calendário financeiro | Sim | Valor alto no desktop, baixa complexidade |
| RF-REL-01..04, 06, 07 relatórios avançados, saúde financeira, assistente | Não | Fases 2 e 4 |

**Sincronização e PWA**

| Requisito | MVP | Observação |
|---|---|---|
| RF-SYN-01, 02 banco local, fila de alterações, sync incremental, indicador | Sim | |
| RF-SYN-04 pontos de restauração | Não | Fase 2 |
| RF-PWA-01..09, 11 manifest, Service Worker, instalar, banco local, conectividade, funções offline, modo sessão, sessão offline, atualização de versão, cota de armazenamento | Sim | |
| RF-PWA-10 Web Push, badge, File Handling | Não | Fase 2 (File Handling depende da importação) |
| RF-PWA-12 Microsoft Store | Não | Fase 5 |

**Fora do MVP (em bloco)**: importação e exportação (IMP), empréstimos (EMP), Open Finance (OF), notificações/SMS (NTF), Zoe (ZOE), MCP, Zooloo Kids (KID), anúncios (RF-PLN-07) e pessoa jurídica.

**Site público (apps/site) no MVP**: landing simples, página do beta com lista de espera, termos de uso e política de privacidade (RF-SIT-01 parcial e RF-SIT-04).

### 4.4 Backend no MVP

- API REST `/api/v1` (doc 07 §3) dos módulos acima, com OpenAPI gerado e `api-client` tipado.
- Endpoints de sync: push de outbox, pull delta por `server_version`, notificação de mudanças por SSE/WebSocket (doc 07 §4).
- PostgreSQL com RLS em todas as tabelas de dados do usuário; envelope encryption com DEK por usuário e KMS (SEC-CR).
- Workers: recorrências, e-mails transacionais, exclusão por inatividade, exportação de dados e jobs LGPD.
- Auditoria e eventos de segurança (`audit_log`, `security_event`, `remote_wipe`, doc 05 §8A).
- Modelo de *entitlements* e feature flags.

### 4.5 Critérios de aceite dos fluxos críticos

Formato Dado/Quando/Então. Cada cenário vira um teste E2E (Playwright) ou de propriedade, conforme indicado. Os cenários completos de cada RF ficam em `docs/product-specs/` (doc 12 §3) e são escritos antes da implementação.

**F1 — Cadastro, verificação e 2FA**
- Dado um visitante, quando ele se cadastra com e-mail e senha válidos e aceita os termos, então a conta é criada, um e-mail de verificação é enviado e o banner "verifique seu e-mail" aparece até a verificação.
- Dado um usuário com 2FA ativo, quando ele erra o código TOTP 5 vezes, então o login é bloqueado temporariamente e um `security_event` é registrado.
- Dado um usuário, quando ele tenta usar uma senha presente na lista de senhas vazadas, então o cadastro é recusado com mensagem explicando o motivo.

**F2 — Lançamento simples, parcelado e recorrente**
- Dado um perfil com uma conta, quando o usuário cria uma despesa efetivada de R$ 100,00 hoje, então o saldo atual da conta diminui exatamente R$ 100,00 e o lançamento aparece na lista do mês.
- Dado uma compra de R$ 100,00 em 3 parcelas, então são geradas parcelas de R$ 33,34, R$ 33,33 e R$ 33,33 (resíduo na 1ª), e a soma é exatamente R$ 100,00 (teste de propriedade para qualquer valor e número de parcelas, RN-LAN-11).
- Dado uma série fixa mensal, quando o usuário edita "esta e as próximas" a partir da 4ª ocorrência, então as ocorrências 1 a 3 não mudam e as seguintes recebem a alteração.

**F3 — Cartão e fatura**
- Dado um cartão com vencimento no dia 10 e fechamento 7 dias antes, quando o usuário lança uma compra no dia 3 (dia do fechamento), então ela entra na fatura que vence no dia 10 do mesmo mês; no dia 4, entra na fatura do mês seguinte (teste de propriedade sobre a regra de fechamento).
- Dado uma fatura de R$ 500,00, quando o usuário paga R$ 300,00 de uma conta, então a fatura fica parcialmente paga com R$ 200,00 em aberto e o saldo da conta diminui R$ 300,00.
- Dado uma fatura paga, quando o usuário a reabre, então os pagamentos voltam a pendentes e os saldos são recalculados.

**F4 — Transferência**
- Dado duas contas do mesmo perfil, quando o usuário transfere R$ 250,00, então uma conta diminui e a outra aumenta R$ 250,00, e o patrimônio total não muda (teste de propriedade).

**F5 — Orçamento mensal**
- Dado um orçamento de R$ 800,00 para "Alimentação", quando há R$ 500,00 efetivados e R$ 100,00 pendentes na categoria no mês, então o card mostra efetivado R$ 500,00, pendente R$ 100,00, saldo R$ 200,00 e 75% de uso.

**F6 — Offline e sincronização**
- Dado o PWA instalado e sem rede, quando o usuário cria, edita e exclui lançamentos, então tudo funciona, e a topbar mostra "Offline · N alterações pendentes".
- Dado alterações pendentes, quando a rede volta, então a fila é enviada, o indicador passa a "Sincronizado" e outro computador logado recebe as mudanças em até 5 s.
- Dado o mesmo lançamento editado offline em dois computadores (valor em um, descrição no outro), quando ambos sincronizam, então o resultado tem o valor e a descrição alterados (merge por campo com HLC), sem duplicidade.
- Dado duas abas abertas, então só uma é líder do banco local; quando a líder é fechada, outra assume sem perda de alterações.

**F7 — Segurança da sessão e do dispositivo**
- Dado o login sem "Manter dados neste computador", quando o usuário sai, então o banco local e as chaves são apagados.
- Dado um computador perdido, quando o usuário desconecta o dispositivo pela tela Dispositivos, então a sessão é revogada e o banco local é apagado na próxima abertura (remote wipe).
- Dado o usuário A autenticado, quando ele chama a API com o ID de um recurso do usuário B, então recebe 404 e nada é retornado (teste de IDOR em todos os endpoints).

**F8 — Direitos do titular**
- Dado um usuário, quando ele solicita a exportação, então recebe um link expirável para um ZIP com todos os seus dados.
- Dado um usuário, quando ele confirma a exclusão com a senha e digitando "EXCLUIR", então a conta é desativada na hora, os dados ficam inacessíveis (crypto-shredding da DEK) e a exclusão física termina em até 30 dias.

### 4.6 Critérios de saída do MVP

- [ ] Todos os cenários F1–F8 automatizados e passando no CI.
- [ ] Metas de cobertura e mutação do doc 04 §7A atingidas.
- [ ] Gate de produção do doc 10 §18 completo, incluindo pentest externo sem achados críticos ou altos.
- [ ] RNF-DSP-02, RNF-DSP-04 e RNF-PWA-02/03 medidos em homologação.
- [ ] Beta fechado com pelo menos 50 usuários reais por 4 semanas, sem perda de dados nem divergência de saldo reportada.
- [ ] `docs/QUALITY_SCORE.md` sem domínio do MVP com nota abaixo de "B" (doc 12 §8).

## 5. Fase 1.1 — Lançamento público Web

- Checkout Web (cartão e Pix) via gateway, gestão da assinatura e reembolso em 7 dias (RF-PLN-01..03, 05, 06).
- Teste de 15 dias do Zooloo Plus (RF-AUT-05) e retorno do gating de plano (RF-AUT-11, D-01).
- Limites do Essencial aplicados (doc 08), regras de downgrade (RN-PLN-09).
- Site completo: páginas de recurso, planos, FAQ, Central de Ajuda (RF-SIT-01, 02); calculadoras (RF-SIT-03) se houver capacidade.
- Login social Google e Apple no Web.

**Saída**: cobrança conciliada com o gateway em homologação e produção; nenhum acesso a recurso pago sem *entitlement* (teste automatizado por recurso).

## 6. Fase 2 — Mobile e recursos intermediários

- **Apps Android e iOS** (Expo): PoCs de SQLCipher e de código nativo primeiro; depois a paridade com o MVP Web usando o mesmo `sync-core` e `domain`.
- Cobrança nas lojas (Google Play Billing, StoreKit 2) via RevenueCat, com entitlement unificado.
- Push mobile e Web Push (RF-PWA-10), lembretes de vencimento (RF-CRT-09), alertas de orçamento (RF-ORC-09).
- Lançamentos: multicategorias, valores negativos e reembolsos, transformar, anexos com cota, alterações em lote.
- Cartões: antecipação e crédito, ignorar no limite.
- Orçamentos completos (personalizado, agrupado, % da receita, opções, detalhes).
- Objetivos com conta vinculada, simulador e automações.
- Empréstimos (EMP).
- Importação CSV/XLSX/OFX com conciliação; exportação; File Handling no PWA.
- Relatórios avançados, filtros salvos, comparativo, saúde financeira.
- Perfis com PIN e transferência entre perfis; agrupamento de contas; gestão de tags; pontos de restauração.
- Anúncios discretos no Essencial (RF-PLN-07), se o produto confirmar.

## 7. Fase 3 — Open Finance

- Contrato e homologação com a Pluggy (iniciar a negociação na Fase 0, pois tem prazo longo).
- RF-OF-01..11: conexões, revisão inicial, sync até 4×/dia, parcelas futuras previstas, categorização automática, transferências, automações, bloqueio de edição, limite de instituições.
- Planos Zooloo Conecta e Zooloo Pro ativados.

## 8. Fase 4 — IA e agentes

- Zoe (RF-ZOE-01..05) com créditos de IA por plano e o assistente de relatórios (RF-REL-07).
- Servidor MCP + OAuth 2.1 (RF-MCP-01..07), tela de consentimento, confirmação pendente, desbloqueio por PIN, limites por plano.
- Revisão de segurança específica de IA e MCP (SEC-AI) e pentest focado em prompt injection e abuso de ferramentas.

## 9. Fase 5 — Nativos avançados, Zooloo Kids e PJ

- Leitura de notificações e SMS no Android (RF-NTF-01..05), com declaração na política do Google Play.
- iOS: Atalhos/App Intents, importação de notificações (iOS 27+), Apple Pay/Carteira.
- Widgets, cupom fiscal (RF-IMP-07), localização.
- App Zooloo Kids e integração no app adulto (RF-KID-01..04).
- Pessoa jurídica no Zooloo Pro; pacote Microsoft Store do PWA (RF-PWA-12).

## 10. Dependências externas por fase

| Dependência | Necessária na fase | Iniciar em |
|---|---|---|
| Domínio, e-mail transacional, contas de nuvem, KMS | 0 | Imediato |
| DPO, RIPD, política de privacidade e termos (marca Zooloo) | 1 | Fase 0 |
| Pentest externo | 1 | Contratar na Fase 0 |
| Registro da marca Zooloo (INPI) | 1.1 | Imediato |
| Gateway de pagamento Web (Stripe BR ou Pagar.me) | 1.1 | Fase 1 |
| Contas Apple Developer e Google Play; RevenueCat | 2 | Fase 1 |
| Contrato Pluggy | 3 | Fase 0 |
| Provedor de LLM com retenção zero | 4 | Fase 2 |
| Declaração de permissões SMS/notificações no Google Play; consentimento parental (Kids) | 5 | Fase 3 |

## 11. Riscos do roadmap

| Risco | Mitigação |
|---|---|
| Usuários do beta esperam app mobile | Comunicar o beta como "Web e Desktop"; PWA instalável; Fase 2 logo depois do lançamento |
| Gating desligado no beta gerar expectativa de gratuidade | Aviso explícito de beta gratuito por tempo limitado; e-mail 30 dias antes da cobrança |
| Safari/OPFS instável atrasar o PWA | PoC na Fase 0; fallback online com aviso (RN-PWA-05) |
| Vazão dos agentes gerar deriva arquitetural | Linters e testes estruturais desde a Fase 0; coleta de lixo recorrente (doc 12 §8) |
