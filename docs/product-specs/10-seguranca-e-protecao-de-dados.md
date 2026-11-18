# 10 — Segurança e proteção de dados

O Zooloo guarda a vida financeira das pessoas. **Segurança e privacidade são requisitos de produto, não de infraestrutura.** Este documento é normativo: nenhuma funcionalidade entra em produção sem cumprir os controles aplicáveis. Os IDs `SEC-*` complementam os `RNF-SEG-*` e `RNF-LGPD-*` do doc 04. Em caso de conflito, vale o controle **mais restritivo**.

## 1. Princípios

1. **Privacidade por padrão (privacy by design/default)**: coletar o mínimo; recursos que compartilham dados (IA, MCP, Open Finance, marketing) são opt-in.
2. **Menor privilégio** para pessoas, serviços, tokens, agentes de IA e funcionários.
3. **Defesa em profundidade**: cada camada (cliente, API, banco, rede, operação) assume que a anterior pode falhar.
4. **Zero confiança no cliente**: o servidor revalida plano, permissões, limites e regras de negócio. Dados vindos do app, do PWA, do MCP ou da IA são entrada não confiável.
5. **Criptografia em todo lugar**: em trânsito, em repouso no servidor e em repouso nos dispositivos.
6. **Rastreabilidade**: toda ação sensível é auditável, sem que o log exponha dados financeiros.
7. **O Zooloo nunca movimenta dinheiro**: nenhuma integração tem permissão de pagamento ou transferência real.

## 2. Classificação de dados

| Classe | Exemplos | Regras |
|---|---|---|
| **C4 — Segredo** | Senhas (hash), chaves de criptografia, refresh tokens, tokens OAuth, `itemId` do agregador, chaves de API | Nunca em log nem em resposta de API; só em KMS/secret manager ou cifrados; rotação obrigatória |
| **C3 — Financeiro sensível** | Lançamentos, saldos, descrições, observações, anexos, contas, faturas, dados Open Finance, conversas com a Zoe | Criptografia em repouso + criptografia de campo para texto livre e anexos; acesso só pelo titular; mascarado em logs |
| **C3 — Dados de criança** | Perfis Zooloo Kids, ganhos e gastos, sonhos, combinados | Mínimo necessário; consentimento do responsável (LGPD art. 14); sem anúncios; sem uso em IA sem consentimento |
| **C2 — Pessoal** | Nome, e-mail, data de nascimento, IP, dispositivos | Acesso restrito; mascarar em logs (`h***@dominio.com`) |
| **C1 — Interno** | Métricas agregadas e anonimizadas | Sem identificação individual |
| **C0 — Público** | Site, ajuda, calculadoras | — |

## 3. Modelo de ameaças (resumo STRIDE)

| Ameaça | Exemplo | Controles principais |
|---|---|---|
| **Spoofing** | Credential stuffing, roubo de sessão, phishing de consentimento OAuth | Argon2id, checagem de senhas vazadas, 2FA, refresh rotativo com detecção de reuso, PKCE, validação estrita de `redirect_uri`, aviso "integração não verificada" |
| **Tampering** | Cliente alterado enviando sync malicioso, alteração do plano no cliente | Validação Zod no servidor, recálculo de derivados no servidor, entitlement só no servidor, assinatura dos webhooks |
| **Repudiation** | "Não fui eu que apaguei" | Trilha de auditoria imutável (SEC-LOG) com dispositivo, IP e `client_id` |
| **Information disclosure** | IDOR entre usuários, vazamento por logs, backup exposto, prompt injection exfiltrando dados | RLS no PostgreSQL, IDs UUID não sequenciais, mascaramento, criptografia de backups, isolamento de ferramentas de IA por usuário |
| **Denial of service** | Abuso de login, MCP, IA, importação gigante | Rate limiting, cotas, limites de tamanho de upload, filas com backpressure, WAF |
| **Elevation of privilege** | Agente MCP escrevendo sem permissão; funcionário acessando dados | Escopos `finances:read/write`, confirmação obrigatória, RBAC interno, acesso emergencial (break-glass) auditado |

Revisar o modelo de ameaças a cada nova integração ou funcionalidade que toque dados C3/C4.

## 4. Identidade e acesso do usuário

- **SEC-ID-01** Senhas com **Argon2id** (memória ≥ 64 MiB, t ≥ 3), mínimo de 8 caracteres, bloqueio de senhas vazadas (k-anonymity / HIBP) e sem regras de composição forçadas.
- **SEC-ID-02** **2FA** (TOTP) opcional, com códigos de recuperação. [I] Exigido para: exportar todos os dados, excluir a conta, conectar Open Finance e autorizar escrita via MCP, quando o 2FA estiver ativo. Passkeys (WebAuthn) como evolução.
- **SEC-ID-03** Sessões:
  - access token JWT curto (15 min, algoritmo assimétrico EdDSA/ES256, `aud` e `iss` validados);
  - refresh token **opaco e rotativo**, guardado como hash; reuso detectado revoga toda a família e notifica o usuário;
  - Web/PWA: refresh em cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`; access token só em memória;
  - mobile: tokens no **Keychain / Android Keystore** (expo-secure-store), nunca em AsyncStorage.
- **SEC-ID-04** Reautenticação (senha, biometria ou 2FA) para ações críticas: trocar e-mail ou senha, excluir conta ou perfil, restaurar ponto, desativar PIN, exportar dados, ver ou revogar conexões.
- **SEC-ID-05** Alertas por e-mail e push: novo dispositivo, troca de senha, 2FA desativado, nova conexão MCP/Open Finance, exportação de dados.
- **SEC-ID-06** Tela "Dispositivos conectados" com encerramento remoto de sessão. O encerramento revoga os tokens e, na próxima conexão do dispositivo, apaga os dados locais (sinal *remote wipe*).
- **SEC-ID-07** Mensagens de login e de recuperação de senha **não revelam** se o e-mail existe. Tokens de reset são de uso único, expiram em 1 h e são guardados como hash.
- **SEC-ID-08** PIN de perfil: hash Argon2id com sal; 5 tentativas e bloqueio progressivo (RN-PRF-07); validação offline contra o hash sincronizado. O PIN **não** substitui a autenticação da conta.

## 5. Autorização e isolamento entre usuários

- **SEC-AZ-01** **Row-Level Security** no PostgreSQL em todas as tabelas com `user_id`. A conexão da API define `SET app.user_id` por transação; o papel da aplicação **não** tem `BYPASSRLS`.
- **SEC-AZ-02** Autorização em duas camadas: guardas na API (dono do recurso, perfil, plano) **e** RLS. Teste automatizado de IDOR para cada endpoint (usuário A tentando acessar recurso de B).
- **SEC-AZ-03** IDs UUIDv7 gerados no cliente são validados como pertencentes ao usuário antes de qualquer upsert do sync. O servidor rejeita IDs já existentes de outro usuário.
- **SEC-AZ-04** Entitlements (plano) calculados **somente no servidor**. Recurso não liberado retorna `403 plan_required`.
- **SEC-AZ-05** Campos protegidos (`locked_fields`: valor, datas e conta de transações Open Finance e de empréstimos) são validados no servidor, e não só ocultados na UI.
- **SEC-AZ-06** Zooloo Kids: o dispositivo da criança recebe um token de escopo restrito ao `kid_profile_id`, sem acesso aos dados financeiros do responsável.

## 6. Criptografia

### 6.1 Servidor
- **SEC-CR-01** TLS 1.2+ (preferir 1.3), HSTS com preload, certificados gerenciados. Tráfego interno entre serviços também com TLS (mTLS na malha interna, quando aplicável).
- **SEC-CR-02** Disco do PostgreSQL, Redis (persistência), backups e object storage cifrados com **AES-256**, com chaves no **KMS** da nuvem.
- **SEC-CR-03** **Criptografia de campo** (envelope encryption, AES-256-GCM, DEK por usuário cifrada por KEK no KMS) para: observações, descrições de lançamentos, conteúdo da Zoe, anexos, tokens OAuth, `itemId` e payloads brutos do Open Finance.
  - [I] A busca textual no servidor usa um índice cego (blind index) HMAC de tokens normalizados ou ocorre só no cliente.
- **SEC-CR-04** Exclusão de conta = destruir a DEK do usuário (*crypto-shredding*). Os dados residuais em backups ficam ilegíveis até a expiração natural dos backups (RNF-LGPD-02).
- **SEC-CR-05** Rotação: KEK anual (automática no KMS), chaves de assinatura JWT a cada 90 dias com JWKS, segredos de webhook semestrais.
- **SEC-CR-06** Proibido criptografia caseira: usar libsodium, Web Crypto ou o `crypto` do Node com algoritmos padrão.

### 6.2 Dispositivos
- **SEC-CR-07** **Mobile**: banco local com **SQLCipher** (expo-sqlite `useSQLCipher`).
  - A chave é aleatória (256 bits), guardada no Keychain/Keystore e protegida por `WHEN_UNLOCKED_THIS_DEVICE_ONLY` / `setUserAuthenticationRequired` opcional.
  - O app **verifica `PRAGMA cipher_version`** antes de usar o banco e **aborta** se a cifra não estiver ativa (sem SQLCipher, o `PRAGMA key` não tem efeito e não gera erro).
  - Anexos em cache local cifrados com a mesma chave.
- **SEC-CR-08** **PWA**: estratégia a validar na PoC (doc 09 §8), em ordem de preferência:
  1. build WASM do SQLite com cifra (ex.: SQLite3 Multiple Ciphers) compatível com `opfs-sahpool`;
  2. se inviável, **criptografia por campo** (AES-GCM via Web Crypto) para colunas de texto livre (descrição, observações, local) e anexos.

  Em ambos os casos, a chave do banco é aleatória e fica cifrada (*wrapped*) por uma chave **não exportável** guardada no IndexedDB, e é descartada no logout. Limitação documentada: protege contra cópia de arquivos e acesso por outro usuário do SO, mas não contra malware na sessão do usuário. Por isso existem o modo sessão (RN-PWA-08) e o timeout.
- **SEC-CR-09** Bloqueio automático do app (mobile e PWA) após inatividade configurável (padrão 5 min em segundo plano), com biometria ou PIN do dispositivo (RF-AUT-09).

## 7. Segurança de API e aplicação

- **SEC-AP-01** Seguir **OWASP ASVS nível 2** (meta nível 3 para autenticação, sessão e criptografia) e o **OWASP API Security Top 10**.
- **SEC-AP-02** Validação de **toda** entrada com Zod (tipos, tamanhos, enums, intervalos de datas e valores). Rejeitar campos desconhecidos (*mass assignment*).
- **SEC-AP-03** Consultas só via ORM ou queries parametrizadas (Drizzle). Proibido concatenar SQL.
- **SEC-AP-04** Rate limiting (Redis) por IP, por usuário e por `client_id`:
  - login: 5/min por conta, 20/min por IP;
  - reset de senha: 3/h;
  - sync: 60/min;
  - IA e MCP conforme o doc 08.
- **SEC-AP-05** **Idempotency-Key** obrigatório em criações (protege contra duplicidade por reenvio de rede ou de agente).
- **SEC-AP-06** Limites de payload: JSON 1 MB; push de sync 1.000 mutações por lote; uploads conforme RN-LAN-30.
- **SEC-AP-07** **Uploads** (anexos, OFX, CSV, XLSX):
  - verificação de tipo real (magic bytes), não só da extensão;
  - limite de tamanho;
  - antivírus (ClamAV) assíncrono;
  - parsing em worker isolado com timeout;
  - proteção contra zip bomb (XLSX), XXE (OFX/XML) e CSV injection (prefixar `'` em células que começam com `= + - @` nas **exportações**);
  - anexos servidos por URL pré-assinada de curta duração (5 min), com `Content-Disposition: attachment`.
- **SEC-AP-08** Cabeçalhos HTTP:
  - CSP estrita com nonce, sem `unsafe-inline`/`unsafe-eval` (exceção documentada para `wasm-unsafe-eval` no PWA);
  - `frame-ancestors 'none'`, exceto rotas que precisem ser embutidas;
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima.
- **SEC-AP-09** CORS restrito aos domínios próprios. Proteção CSRF: SameSite=Strict + token CSRF no endpoint de refresh.
- **SEC-AP-10** Erros no formato RFC 9457, sem stack trace nem detalhes internos em produção.
- **SEC-AP-11** Sanitização de saída: textos do usuário são renderizados como texto, nunca como HTML. Markdown da Zoe passa por renderizador com whitelist.
- **SEC-AP-12** SSRF: o backend não busca URLs fornecidas pelo usuário. Callbacks OAuth e webhooks só para domínios validados (RN-MCP-03).

## 8. PWA e Service Worker

- **SEC-PW-01** O Service Worker **não** armazena respostas de `/api/*` no Cache Storage (RNF-PWA-04). Dados financeiros só no banco local cifrado.
- **SEC-PW-02** Escopo do SW restrito a `/app/`; assets versionados com hash; integridade verificada (SRI) para scripts de terceiros, que devem ser evitados no `/app`.
- **SEC-PW-03** Logout e encerramento remoto apagam: banco OPFS, IndexedDB, Cache Storage, chaves e fila de sync (`Clear-Site-Data: "cache", "storage"` na resposta de logout).
- **SEC-PW-04** Sem scripts de analytics ou marketing de terceiros no `/app`. Telemetria própria, mascarada.
- **SEC-PW-05** Sessão offline limitada a 30 dias (RN-PWA-09); o selo de sessão local é assinado pelo servidor e conferido no cliente.

## 9. Mobile

- **SEC-MB-01** Tokens e chaves no Keychain/Keystore. Nada sensível em AsyncStorage, logs ou `console`.
- **SEC-MB-02** Certificate pinning (chave pública) para a API, com 2 pins (atual e reserva) e mecanismo de atualização. Desligado em builds de desenvolvimento.
- **SEC-MB-03** Bloqueio de captura de tela e ocultação no app switcher (`expo-screen-capture`, `FLAG_SECURE`) nas telas com valores, quando o modo privado estiver ativo. [I] Opção do usuário para manter sempre ativo.
- **SEC-MB-04** Detecção de root/jailbreak e depurador: apenas **aviso** ao usuário e flag na telemetria; não bloquear.
- **SEC-MB-05** Ofuscação e minificação (Hermes bytecode, R8/ProGuard) e remoção de logs em produção. Nenhum segredo embutido no app: chaves de terceiros ficam só no backend.
- **SEC-MB-06** Deep links e App Links/Universal Links verificados. Parâmetros de deep link tratados como entrada não confiável.
- **SEC-MB-07** Leitura de notificações e SMS (Android):
  - processamento **100% local**;
  - o texto bruto não sai do aparelho (só o lançamento resultante sincroniza);
  - histórico local expira em 5–30 dias (RN-NTF-07);
  - permissão explicada em tela própria antes do pedido do sistema.
- **SEC-MB-08** Atualizações OTA (EAS Update) **assinadas** (code signing do expo-updates). Mudanças nativas só via loja.

## 10. Open Finance

- **SEC-OF-01** Somente leitura; o Zooloo nunca recebe credenciais bancárias (consentimento no ambiente da instituição/agregador).
- **SEC-OF-02** `itemId` e tokens do agregador cifrados (C4); chamadas ao agregador só a partir do backend; `client_secret` em secret manager.
- **SEC-OF-03** Webhooks validados por assinatura/segredo e por allowlist de IP quando disponível. Processamento idempotente.
- **SEC-OF-04** O payload bruto do agregador é guardado cifrado, com retenção de 90 dias (para "reiniciar dados"), e depois descartado.
- **SEC-OF-05** Revogação do consentimento pelo usuário apaga o item no agregador e mantém só os lançamentos já importados (RN-OF-14).

## 11. IA (Zoe) e agentes externos (MCP)

- **SEC-AI-01** Provedor de LLM com contrato de **retenção zero** e **sem uso para treino**. Dados enviados limitados ao necessário para a pergunta (minimização).
- **SEC-AI-02** **Prompt injection**: descrições de lançamentos, comprovantes, notificações e dados do Open Finance são **dados, nunca instruções**.
  - As ferramentas da Zoe executam com a identidade do usuário (RLS), sem acesso a dados de outros usuários nem a ferramentas administrativas.
  - Ações de escrita sempre passam por `pending_action` com confirmação (RN-ZOE-02).
- **SEC-AI-03** Saídas da IA não executam código nem abrem URLs automaticamente. Links gerados são exibidos como texto.
- **SEC-AI-04** MCP/OAuth:
  - OAuth 2.1 com PKCE S256 obrigatório; DCR com cliente público;
  - validação **exata** de `redirect_uri` (RN-MCP-03); `iss` na resposta de autorização;
  - tokens curtos (access 1 h, refresh 30 dias, rotativo);
  - escopos mínimos; escrita exige consentimento explícito e nova autorização;
  - tela de consentimento mostra cliente, domínio de retorno, escopos e o aviso "Integração não verificada".
- **SEC-AI-05** Limites e cotas por usuário (RN-MCP-08), com alerta de uso anômalo (pico de leituras, padrão de exfiltração) e bloqueio automático temporário.
- **SEC-AI-06** Toda chamada MCP é auditada (`client_id`, ferramenta, perfil, quantidade de registros retornados, sem o conteúdo).
- **SEC-AI-07** Perfis com PIN só ficam acessíveis ao agente após desbloqueio na página própria (RN-MCP-10), com validade limitada (ex.: 1 h).

## 12. Pagamentos

- **SEC-PG-01** O Zooloo **não armazena dados de cartão**: tokenização pelo gateway e pelas lojas (escopo PCI-DSS SAQ-A).
- **SEC-PG-02** Webhooks de gateway, Google RTDN e App Store Server Notifications com assinatura verificada. Estado da assinatura sempre confirmado na API do provedor.

## 13. Logs, auditoria e monitoramento

- **SEC-LOG-01** Logs estruturados com **mascaramento automático** (pacote `@zooloo/security`). Proibido logar:
  - valores, descrições e observações;
  - tokens, senhas e PIN;
  - conteúdo de anexos, da Zoe ou de notificações.

  E-mail e IP aparecem mascarados ou como hash.
- **SEC-LOG-02** **Trilha de auditoria** imutável (append-only, retenção de 5 anos [I]) para:
  - login e falhas de login, 2FA, senha, PIN;
  - dispositivos;
  - exportação e exclusão;
  - restauração;
  - conexões Open Finance e MCP;
  - escritas via MCP e Zoe;
  - mudanças de plano;
  - acesso de funcionários.
- **SEC-LOG-03** O usuário vê o próprio histórico de segurança (logins, dispositivos, conexões) no app.
- **SEC-LOG-04** Alertas (SIEM): pico de falhas de login, reuso de refresh token, acesso de funcionário a dados de cliente, volume anômalo de MCP, erros de assinatura de webhook.
- **SEC-LOG-05** Sentry e APM com *scrubbing* de PII ativo, sem session replay em telas com dados financeiros.

## 14. Infraestrutura e operação

- **SEC-INF-01** Nuvem com região no Brasil (RNF-LGPD-07); redes privadas; banco **sem IP público**; acesso administrativo só via bastion/SSO com MFA.
- **SEC-INF-02** Infraestrutura como código (Terraform) com revisão; contas separadas para dev, homologação e produção. **Dados de produção nunca em dev/homologação** (usar dados sintéticos).
- **SEC-INF-03** Segredos em **secret manager** (nunca no repositório, em `.env` versionado ou em imagem Docker). Varredura de segredos no CI (gitleaks) e no histórico.
- **SEC-INF-04** WAF + proteção DDoS na borda; TLS terminado na borda e re-cifrado para os serviços.
- **SEC-INF-05** Contêineres mínimos (distroless), sem root, sistema de arquivos somente leitura, imagens assinadas e escaneadas (Trivy).
- **SEC-INF-06** Acesso de funcionários a dados de clientes:
  - **proibido por padrão**;
  - suporte usa ferramentas que mostram metadados, não valores;
  - acesso excepcional (break-glass) exige ticket, consentimento do usuário quando aplicável, aprovação de 2 pessoas, prazo limitado e auditoria.
- **SEC-INF-07** Backups cifrados, imutáveis (object lock) e em conta separada. **Teste de restauração mensal**.

## 15. Ciclo de desenvolvimento seguro

- **SEC-DEV-01** Revisão de código obrigatória (2 aprovações em `packages/security`, auth, sync e pagamentos).
- **SEC-DEV-02** CI com:
  - lint de segurança (eslint-plugin-security);
  - SAST (Semgrep/CodeQL);
  - SCA de dependências (Dependabot/Renovate + `pnpm audit`), lockfile obrigatório;
  - varredura de segredos;
  - DAST (OWASP ZAP) em homologação;
  - **testes automatizados de IDOR/RLS**;
  - gate de cobertura de testes por camada e global ≥ 90% (RNF-QA-01..05).
- **SEC-DEV-03** Cadeia de suprimentos:
  - dependências fixadas;
  - bloqueio de scripts `postinstall` não aprovados;
  - revisão de novas dependências;
  - SBOM gerado por release.
- **SEC-DEV-04** Threat modeling e checklist de segurança no *definition of done* de funcionalidades que tocam C3/C4.
- **SEC-DEV-05** **Pentest** externo antes do lançamento e anualmente; bug bounty / política de divulgação responsável (`/.well-known/security.txt`).
- **SEC-DEV-06** Treinamento anual em desenvolvimento seguro e LGPD para a equipe.
- **SEC-DEV-07** Desenvolvimento por agentes conforme o doc 12 §9: agentes só com dados sintéticos, sem acesso a produção nem a segredos de produção, em sandbox com rede restrita; CI, gates e regras de segurança só mudam com revisão humana (CODEOWNERS); merge de código de risco alto exige 2 pessoas (doc 12 §6.2).

## 16. Privacidade e LGPD (operacional)

- **SEC-PRV-01** **Encarregado (DPO)** nomeado e publicado na política de privacidade.
- **SEC-PRV-02** **RIPD/DPIA** (Relatório de Impacto) antes do lançamento e a cada mudança relevante, em especial para Open Finance, IA, leitura de notificações e Zooloo Kids.
- **SEC-PRV-03** Registro das operações de tratamento (ROPA) com base legal por finalidade:
  - execução de contrato: funcionalidades principais;
  - consentimento: marketing, IA, MCP, Open Finance, notificações;
  - legítimo interesse documentado: segurança e prevenção a fraude.
- **SEC-PRV-04** Lista pública de **suboperadores** (nuvem, agregador, provedor de LLM, e-mail, pagamentos, crash reporting) com contratos (DPA) e cláusulas de transferência internacional quando houver.
- **SEC-PRV-05** Direitos do titular **self-service**: exportação completa (JSON/CSV + anexos), correção, exclusão da conta e de perfis, revogação de cada consentimento (doc 04 RNF-LGPD-01).
- **SEC-PRV-06** Retenção:

  | Dado | Prazo |
  |---|---|
  | Dados financeiros | Enquanto a conta existir |
  | Conta inativa | 6 meses (RN-USR-06) |
  | Payload bruto Open Finance | 90 dias |
  | Histórico local de notificações | 5–30 dias |
  | Conversas da Zoe | 12 meses [I], ou até o usuário apagar |
  | Logs técnicos | 30 dias |
  | Auditoria | 5 anos |
  | Backups | 30 dias |
- **SEC-PRV-07** Analytics de produto com dados **pseudonimizados**, sem valores financeiros nem texto livre. Opt-out disponível.
- **SEC-PRV-08** Zooloo Kids:
  - consentimento verificável do responsável;
  - sem e-mail ou dados identificáveis da criança;
  - sem anúncios, sem rastreamento e sem IA;
  - conteúdo educativo revisado.

## 17. Resposta a incidentes e continuidade

- **SEC-IR-01** Plano de resposta a incidentes documentado: papéis, contatos, classificação de severidade, *runbooks* (vazamento de credencial, comprometimento de token, vazamento de dados, indisponibilidade do agregador).
- **SEC-IR-02** Comunicação à **ANPD** e aos titulares em incidentes com risco ou dano relevante, no prazo regulamentar (Resolução CD/ANPD nº 15/2024: 3 dias úteis).
- **SEC-IR-03** Capacidade de revogar em massa: todas as sessões, todos os tokens MCP, todas as chaves de um tipo (rotação de emergência).
- **SEC-IR-04** Simulação (*tabletop*) semestral e post-mortem sem culpados após cada incidente.
- **SEC-IR-05** Continuidade: RPO 5 min / RTO 1 h (RNF-DSP-07), backup em região secundária, mobile e PWA seguem funcionando offline durante incidentes do backend.

## 18. Checklist de liberação (gate de produção)

- [ ] RLS ativo e testes de IDOR passando em todos os endpoints.
- [ ] Cobertura global ≥ 90% e metas por camada atingidas (núcleo financeiro ≥ 95% com *mutation score* ≥ 80%); E2E dos fluxos críticos, inclusive offline, passando (doc 04 §7A).
- [ ] Nenhum segredo no repositório (gitleaks limpo) e todos os segredos no secret manager.
- [ ] SQLCipher verificado em build de produção (Android e iOS); estratégia de cifra do PWA validada.
- [ ] CSP, HSTS e cabeçalhos de segurança aprovados (securityheaders A+).
- [ ] Mascaramento de logs validado (teste automatizado procurando valores e e-mails nos logs).
- [ ] Pentest externo sem achados críticos ou altos abertos.
- [ ] RIPD aprovado pelo DPO; política de privacidade e termos atualizados (marca Zooloo).
- [ ] Backups restaurados com sucesso no último mês.
- [ ] Plano de resposta a incidentes publicado e plantão definido.
