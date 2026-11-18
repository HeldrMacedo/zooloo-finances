# 03 — Requisitos funcionais

Formato: `RF-<MÓD>-<nº>` | descrição | plataformas | plano mínimo | regras relacionadas.

Plataformas: **W** = Web/PWA (navegador ou app instalado no desktop Windows/macOS), **A** = Android, **I** = iOS, **K** = app Zooloo Kids.
Plano mínimo: **Essencial** = Zooloo Essencial (grátis), **Plus** = Zooloo Plus (ou teste), **Conecta** = Zooloo Conecta, **Pro** = Zooloo Pro. "Plus+" = Plus, Conecta ou Pro.

Prioridade (MoSCoW) ao final de cada módulo: **M** Must, **S** Should, **C** Could.

---

## 1. Autenticação e conta (AUT)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-AUT-01 | Cadastro com nome, e-mail, senha e aceite dos termos e da política; envio de verificação de e-mail | W A I | Essencial | RN-USR-03 |
| RF-AUT-02 | Login por e-mail/senha; login social Google (A/W) e Apple (I/W) [I] | W A I | Essencial | — |
| RF-AUT-03 | Esqueci minha senha (link por e-mail com expiração de 1 h) | W A I | Essencial | RN-USR-07 |
| RF-AUT-04 | Reenvio da verificação de e-mail; banner enquanto não verificado | W A I | Essencial | RN-USR-04 |
| RF-AUT-05 | Iniciar o teste do Zooloo Plus de 15 dias automaticamente no 1º cadastro | W A I | Essencial | RN-PLN-02 |
| RF-AUT-06 | Excluir conta e todos os dados (confirmação com senha + digitar "EXCLUIR") | W A I | Essencial | RN-USR-05 |
| RF-AUT-07 | Exportar todos os meus dados (ZIP) | W A I | Essencial | RN-USR-09 |
| RF-AUT-08 | Job de exclusão por inatividade de 6 meses com avisos prévios | backend | — | RN-USR-06 |
| RF-AUT-09 | Bloqueio do app por biometria/PIN do dispositivo (opcional) [I] | A I | Essencial | — |
| RF-AUT-10 | Tela "Dispositivos conectados": listar e desconectar; contador de desconexões do mês no plano Zooloo Essencial | W A I | Essencial | RN-DEV-* |
| RF-AUT-11 | Bloquear login Web para plano Zooloo Essencial, com tela de upgrade | W | Plus | RN-PLN-07 |

Prioridade: 01–06, 10, 11 **M**; 07, 08 **S**; 02 (social), 09 **C**.

## 2. Onboarding (ONB)

| ID | Requisito | Plat. | Plano |
|---|---|---|---|
| RF-ONB-01 | Assistente inicial: moeda do perfil, contas com saldo inicial, revisão das categorias padrão, cartões (vencimento + regra de fechamento + parcelas em curso), receitas recorrentes | W A I | Essencial |
| RF-ONB-02 | Carregar o conjunto de categorias padrão (receita/despesa com subcategorias) | W A I | Essencial |
| RF-ONB-03 | Checklist "primeiros passos" no Resumo até concluir | W A I | Essencial |

Prioridade: **M**.

## 3. Perfis (PRF)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-PRF-01 | Criar, editar, arquivar, desarquivar e excluir perfil (nome, moeda, cor/ícone) | W A I | Essencial (1) / Plus (ilimitados) | RN-PRF-01..05 |
| RF-PRF-02 | Troca rápida de perfil no cabeçalho/menu | W A I | Essencial | — |
| RF-PRF-03 | Compra avulsa de perfil adicional no Essencial (in-app, pagamento único) | A I | Essencial | RN-PRF-05 |
| RF-PRF-04 | Definir e remover PIN de 4 dígitos (máx. 2 perfis), com bloqueio por tentativas | W A I | Plus | RN-PRF-07 |
| RF-PRF-05 | Transferência entre perfis | W A I | Plus | RN-PRF-08 |
| RF-PRF-06 | Arquivamento automático de perfis excedentes no downgrade | backend | — | RN-PRF-06 |

Prioridade: 01, 02, 04 **M**; 05, 06 **S**; 03 **C**.

## 4. Contas (CTA)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-CTA-01 | CRUD de conta: descrição, tipo, saldo inicial, cheque especial, imagem/ícone (banco), padrão, ignorar nos totais, número da conta, identificação do banco, últimos 4 dígitos | W A I | Essencial | RN-CTA-01, 08, 09 |
| RF-CTA-02 | Conta de agrupamento e "Agrupar em" | W A I | Essencial | RN-CTA-05 |
| RF-CTA-03 | Marcar conta como investimento | W A I | Essencial | RN-CTA-06 |
| RF-CTA-04 | Listagem com saldo atual e previsto por conta e total | W A I | Essencial | RN-CTA-03 |
| RF-CTA-05 | Reajustar saldo (3 modos) | W A I | Essencial | RN-CTA-04 |
| RF-CTA-06 | Arquivar e excluir conta com escolha do destino dos lançamentos | W A I | Essencial | RN-CTA-10 |
| RF-CTA-07 | Personalizar imagem de contas e cartões (biblioteca de logos de bancos) | W A I | Essencial | — |

Prioridade: **M** (07 **S**).

## 5. Categorias e tags (CAT)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-CAT-01 | CRUD de categorias e subcategorias por tipo, com ícone e cor | W A I | Essencial | RN-CAT-01 |
| RF-CAT-02 | Arquivar categoria; excluir movendo os lançamentos para "Outros" | W A I | Essencial | RN-CAT-02, 03 |
| RF-CAT-03 | Mover transações entre categorias (em massa) | W A I | Plus | RN-CAT-05 |
| RF-CAT-04 | CRUD de tags; gestão de tags (renomear/mesclar) | W A I | Essencial / Plus (gestão) | RN-CAT-06 |
| RF-CAT-05 | Reordenar categorias (arrastar) | W A I | Essencial | — |

Prioridade: **M**.

## 6. Lançamentos (LAN)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-LAN-01 | Criar receita, despesa (conta) e despesa de cartão, com todos os campos | W A I | Essencial | RN-LAN-01..03 |
| RF-LAN-02 | Criar transferência entre contas | W A I | Essencial | RN-TRF-* |
| RF-LAN-03 | Situação efetivado/pendente com as 3 datas; atalho "Efetivar" na lista | W A I | Essencial | RN-LAN-04..07 |
| RF-LAN-04 | Recorrência: única, fixa, parcelada/repetida (total ou valor da parcela; parcela inicial; periodicidade) | W A I | Essencial | RN-LAN-08..15 |
| RF-LAN-05 | Editar ou excluir ocorrência de série com escopo (esta / próximas / todas) | W A I | Essencial | RN-LAN-12 |
| RF-LAN-06 | Multicategorias em despesas | W A I | Essencial | RN-LAN-16, 17 |
| RF-LAN-07 | Valores negativos (reembolso/estorno/compensação) + ação "Transformar em reembolso/compensação" | W A I | Essencial | RN-LAN-18..22 |
| RF-LAN-08 | Transformar em despesa de cartão / em débito / em transferência | W A I | Essencial | RN-LAN-23..25 |
| RF-LAN-09 | Anexos (câmera, galeria, arquivo) com controle de cota | W A I | Essencial (1 MB/mês) / Plus | RN-LAN-29, 30 |
| RF-LAN-10 | Lista de Transações por mês com navegação de período e filtros rápidos (tipo, situação, conta, categoria) | W A I | Essencial | — |
| RF-LAN-11 | Busca textual com curinga `*` | W A I | Essencial | RN-LAN-26 |
| RF-LAN-12 | Seleção múltipla e alterações em lote com resumo antes de confirmar | W A I | Plus | RN-LAN-27, 28 |
| RF-LAN-13 | Duplicar lançamento | W A I | Essencial | — |
| RF-LAN-14 | Localização (estabelecimento + coordenadas opcionais) | A I | Essencial | — |
| RF-LAN-15 | Atalho de lançamento rápido: FAB no mobile; tecla `N` no Web [I] | W A I | Essencial | — |
| RF-LAN-16 | Widget de tela inicial com saldo e botão de nova despesa [I] | A I | Essencial | — |

Prioridade: 01–11 **M**; 12, 13 **S**; 14–16 **C**.

## 7. Cartões e faturas (CRT)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-CRT-01 | CRUD de cartão (nome, imagem, finais, vencimento, regra de fechamento, limite, conta padrão, nome na carteira) | W A I | Essencial | RN-CRT-01, 02 |
| RF-CRT-02 | Tela do cartão por mês de vencimento: total, pendente, pago, limite usado e disponível, situação | W A I | Essencial | RN-CRT-04, 13 |
| RF-CRT-03 | Cálculo automático da fatura de cada compra pela regra de fechamento | backend/local | Essencial | RN-CRT-03 |
| RF-CRT-04 | Pagar fatura (total ou parcial, uma ou mais contas) | W A I | Essencial | RN-CRT-07, 08 |
| RF-CRT-05 | Antecipar pagamento; crédito para o ciclo seguinte quando paga a mais | W A I | Essencial | RN-CRT-09, 10 |
| RF-CRT-06 | Reabrir fatura | W A I | Essencial | RN-CRT-11 |
| RF-CRT-07 | Detalhar "valor em aberto": quais despesas compõem o total | W A I | Essencial | — |
| RF-CRT-08 | Marcar compra como "ignorada no limite" | W A I | Essencial | RN-CRT-04 |
| RF-CRT-09 | Lembrete de vencimento de fatura (push N dias antes) [I] | A I | Essencial | — |

Prioridade: **M** (09 **S**).

## 8. Extrato (EXT)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-EXT-01 | Extrato por conta e por cartão (fatura), com saldo ao fim de cada dia | W A I | Essencial | RN-EXT-01..03 |
| RF-EXT-02 | Configurações do extrato (agrupar por fatura, ordenação, totais diários, mostrar/ocultar, saldo inicial) | W A I | Essencial | RN-EXT-04 |
| RF-EXT-03 | Exportar extrato (XLSX/CSV/PDF) | W A I | Plus | RN-IMP-09, 10 |

Prioridade: **M**.

## 9. Orçamentos (ORC)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-ORC-01 | Abas Despesas e Receitas; lista com meta, efetivado, pendente, saldo, % e barra | W A I | Plus | RN-ORC-01, 06 |
| RF-ORC-02 | Criar/editar orçamento mensal ou personalizado com filtros (categorias, tags com modo, cartões) | W A I | Plus | RN-ORC-02, 03 |
| RF-ORC-03 | Meta fixa ou % das receitas (total ou de um orçamento de receita) | W A I | Plus | RN-ORC-04 |
| RF-ORC-04 | Orçamento agrupado | W A I | Plus | RN-ORC-05 |
| RF-ORC-05 | Opções: previsto, data de referência, considerar não somadas, alerta %, exibir no Resumo, considerar no saldo previsto | W A I | Plus | RN-ORC-07..10, 13, 14 |
| RF-ORC-06 | Alterar meta (só este mês / daqui em diante) | W A I | Plus | RN-ORC-11 |
| RF-ORC-07 | Transferir saldo, copiar, arquivar a partir de, excluir | W A I | Plus | RN-ORC-12 |
| RF-ORC-08 | Detalhes: transações consideradas + gráfico uso × meta (últimos meses) + meta recomendada | W A I | Plus | RN-ORC-15, 17 |
| RF-ORC-09 | Push de alerta ao atingir o % configurado | A I (+ e-mail W) | Plus | RN-ORC-13 |

Prioridade: 01–05 **M**; 06–09 **S**.

> Nota: a referência indica "Gestão de Orçamentos" na tabela comparativa sem marcar claramente o plano; adotamos Plus+ [I]. Caso se queira ampliar a conversão, liberar 1 orçamento no plano Zooloo Essencial.

## 10. Objetivos (OBJ)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-OBJ-01 | CRUD de objetivo (meta, data, motivação, cor, ícone, modo) | W A I | Essencial | RN-OBJ-01..03 |
| RF-OBJ-02 | Card com alcançado, falta, %, ideal por mês, expectativa | W A I | Essencial | RN-OBJ-04 |
| RF-OBJ-03 | Depositar/retirar (valor ±, data, observação, mensal); aba Depósitos com edição e exclusão | W A I | Essencial | RN-OBJ-07..09 |
| RF-OBJ-04 | Vincular conta ou grupo | W A I | Essencial | RN-OBJ-02, 11 |
| RF-OBJ-05 | Simulador de aporte mensal e data provável; gráfico de 6 meses com "considerar mês atual" | W A I | Essencial | RN-OBJ-05, 06 |
| RF-OBJ-06 | Conclusão automática/manual; seção Realizados; comparação com o prazo | W A I | Essencial | RN-OBJ-10 |
| RF-OBJ-07 | Sugerir depósito ao salvar receita/transferência | A (I/W [I]) | Essencial | RN-OBJ-12 |

Prioridade: **M** (05, 07 **S**).

## 11. Empréstimos (EMP)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-EMP-01 | Cadastrar empréstimo (emprestei/peguei; já em andamento) | W A I | Plus | RN-EMP-02..05 |
| RF-EMP-02 | Plano de devolução; reprogramar | W A I | Plus | RN-EMP-07, 09 |
| RF-EMP-03 | Registrar recebimento/pagamento (principal + juros separados) | W A I | Plus | RN-EMP-08, 12 |
| RF-EMP-04 | Definir juros; comparar amortização × investimento | W A I | Plus | RN-EMP-13, 14 |
| RF-EMP-05 | Abatimento e desfazer abatimento | W A I | Plus | RN-EMP-15 |
| RF-EMP-06 | Vincular/desvincular lançamento existente | W A I | Plus | RN-EMP-16, 17 |
| RF-EMP-07 | Arquivar, reativar, excluir (3 opções) | W A I | Plus | RN-EMP-19 |
| RF-EMP-08 | Card Empréstimos no Resumo; progresso e previsão de quitação | W A I | Plus | RN-EMP-10, 11, 20 |

Prioridade: **S**.

## 12. Resumo, relatórios e gráficos (DSH/REL)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-DSH-01 | Resumo com cards configuráveis (adicionar, remover, ordenar; colunas no Web) | W A I | Essencial (básicos) / Plus (extras) | RN-DSH-01, 02 |
| RF-DSH-02 | Configurar saldo (inicial/atual/previsto, acumulação futura, orçamentos no previsto) e Detalhamento do saldo | W A I | Essencial | RN-DSH-03, 04 |
| RF-DSH-03 | Modo privado (ocultar valores) | W A I | Essencial | RN-DSH-05 |
| RF-DSH-04 | Card Pendências (vencidos + a vencer em 7 dias) com ação Efetivar | W A I | Essencial | — |
| RF-REL-01 | Menu Relatórios: filtros avançados, visualização lista/gráfico/evolução | W A I | Plus | RN-REL-01, 04 |
| RF-REL-02 | Salvar, nomear e reutilizar filtros | W A I | Plus | RN-REL-02 |
| RF-REL-03 | Modo comparativo entre dois períodos | W A I | Plus | RN-REL-03 |
| RF-REL-04 | Exportar relatório (XLSX/CSV/PDF) | W A I | Plus | RN-IMP-10 |
| RF-REL-05 | Gráficos: categorias (básico F; subcategorias/avançado S), evolução diária/mensal, fluxo de caixa, patrimônio | W A I | Essencial / Plus | RN-REL-05 |
| RF-REL-06 | Saúde Financeira (nota + radar); card no Resumo | W A I | Essencial | RN-REL-06 |
| RF-REL-07 | Assistente de relatórios por linguagem natural | W A I | Plus | RN-REL-07 |
| RF-REL-08 | Calendário financeiro (vencimentos por dia) [O: "uso confortável do calendário" no desktop] | W A I | Essencial | — |

Prioridade: DSH-01..04, REL-01, 05 **M**; REL-02..04, 06, 08 **S**; REL-07 **C**.

## 13. Importação, exportação e conciliação (IMP)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-IMP-01 | Gerenciar modelos CSV/XLSX (campos, cabeçalho, separador, formato de data, regra de negativos, conta/cartão padrão) | W A I | Plus | RN-IMP-01, 02 |
| RF-IMP-02 | Importar CSV/XLSX por modelo com prévia, mapeamento de cadastros e conciliação | W A I (W foco) | Plus | RN-IMP-03..06 |
| RF-IMP-03 | Importar OFX (conta/cartão) com conciliação e idempotência por FITID | W A I | Plus | RN-IMP-07, 08 |
| RF-IMP-04 | Exportar dados (XLSX/CSV/PDF) | W A I | Plus | RN-IMP-09, 10 |
| RF-IMP-05 | Mesclar 1 manual + 1 importado | W A I | Essencial | RN-IMP-13 |
| RF-IMP-06 | Fila "Sugestões de conciliação" com aceitar/rejeitar | W A I | Essencial | RN-IMP-11..15 |
| RF-IMP-07 | Leitura de cupom fiscal (QR NFC-e) | A | Essencial | RN-NTF-12 |

Prioridade: 01–06 **M**; 07 **S**.

> A tabela da referência marca "Importação de OFX e CSV" e "Exportação" sem plano explícito; assumimos Plus+ por estarem associados ao desktop [I].

## 14. Notificações, SMS e automações do SO (NTF)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-NTF-01 | Serviço de leitura de notificações (NotificationListenerService) + SMS; parser por banco | A | Plus [I] | RN-NTF-01, 02 |
| RF-NTF-02 | Configurações: ativar, escolher como importar, janela antiduplicação, importação genérica | A I | Plus | RN-NTF-03, 04, 06 |
| RF-NTF-03 | Conciliação na importação (Efetivar / Importar assim mesmo / Detalhes) | A I | Plus | RN-NTF-05 |
| RF-NTF-04 | Histórico de notificações local (validade 5/10/20/30 dias) | A I | Plus | RN-NTF-07 |
| RF-NTF-05 | Permitir importação em contas Open Finance (padrão desligado) | A I | Conecta | RN-NTF-08 |
| RF-NTF-06 | App Intents/Atalhos iOS: Importar da Carteira, Importar SMS, Importar notificação, Nova despesa/receita/transferência (Siri) | I | Plus | RN-NTF-10, 11 |
| RF-NTF-07 | Atalho pronto instalável ("Adicionar atalho pronto") | I | Plus | RN-NTF-10 |
| RF-NTF-08 | Integração Google Agenda (vencimentos como eventos) | A | Plus | RN-NTF-13 |
| RF-NTF-09 | Push: lembretes de vencimento, alertas de orçamento, conclusão de objetivo, Open Finance desatualizado, relatório mensal pronto [I] | A I (W: web push) | Essencial/Plus | — |

Prioridade: 01–04, 06 **S**; 05, 07–09 **C**.

## 15. Open Finance (OF)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-OF-01 | Lista de instituições suportadas (visível a todos) | W A I | Essencial | RN-OF-03 |
| RF-OF-02 | Nova conexão via widget do agregador; escolha de categorização; vínculo a um controle manual | W A I | Conecta | RN-OF-01, 07, 09 |
| RF-OF-03 | Revisar contas/cartões recebidos e regra de fechamento antes da importação inicial | W A I | Conecta | RN-OF-06 |
| RF-OF-04 | Tela da conexão: situação, última atualização, itens, atualizar, reconectar, remover vínculo, remover conexão, reiniciar dados | W A I | Conecta | RN-OF-14..17 |
| RF-OF-05 | Sincronização agendada (até 4×/dia) via webhooks do agregador | backend | Conecta | RN-OF-05 |
| RF-OF-06 | Criar parcelas futuras previstas e reconciliar com as reais | backend | Conecta | RN-OF-08 |
| RF-OF-07 | Categorização automática (IA + histórico) | backend | Conecta | RN-OF-09 |
| RF-OF-08 | Reconhecimento de transferências | backend | Conecta | RN-OF-12 |
| RF-OF-09 | Automações: efetivação parcial, valor variável, sugestão de conciliação | backend + W A I | Conecta | RN-OF-11, 13 |
| RF-OF-10 | Bloquear edição de valor/datas/conta em lançamentos OF | W A I | Conecta | RN-OF-10 |
| RF-OF-11 | Controle do limite de instituições por plano | backend | Conecta/Pro | RN-OF-02 |

Prioridade: **M** para o lançamento do plano Conecta.

## 16. Sincronização e restauração (SYN)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-SYN-01 | Banco local (offline-first) com fila de alterações e sincronização incremental | W A I (mobile: expo-sqlite + SQLCipher; W: SQLite WASM/OPFS) | Essencial (backup) / Plus (multi) | RN-SYN-01..03 |
| RF-SYN-02 | Botão Sincronizar + indicador de estado (sincronizado, pendente, erro) | W A I | Essencial | RN-SYN-02 |
| RF-SYN-03 | Backup automático em nuvem no plano Zooloo Essencial (dispositivo único) | A I | Essencial | RN-SYN-01 |
| RF-SYN-04 | Pontos de restauração: criar, listar, restaurar, excluir (máx. 15) | W A I | Plus | RN-SYN-04, 05 |

Prioridade: **M**.

## 16A. Web e Desktop — PWA (PWA)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-PWA-01 | Web App Manifest (nome "Zooloo Finanças", short_name "Zooloo", ícones 192/512/maskable, `display: standalone`, `start_url=/app`, `scope=/app/`, cores da marca, `shortcuts`) | W | Plus | RN-PWA-01, 04, 12 |
| RF-PWA-02 | Service Worker (precache do app shell e assets versionados; navegação offline) | W | Plus | RN-PWA-01, 05 |
| RF-PWA-03 | Botão e banner "Instalar aplicativo Zooloo" com detecção de suporte, prompt nativo (Chromium) e instruções (Safari) | W | Plus | RN-PWA-03 |
| RF-PWA-04 | Banco local offline (SQLite WASM, VFS `opfs-sahpool`, em Web Worker com aba líder via Web Locks) com o mesmo motor de sync do mobile | W | Plus | RN-PWA-05, 06 |
| RF-PWA-05 | Indicador de conectividade e sync na topbar (Online · Sincronizado / Offline · N alterações pendentes / Erro) | W | Plus | RN-PWA-06 |
| RF-PWA-06 | Desabilitar funções que exigem rede quando offline, com aviso | W | Plus | RN-PWA-07 |
| RF-PWA-07 | Opção "Manter dados neste computador" no login; modo sessão; limpeza no logout | W | Plus | RN-PWA-08 |
| RF-PWA-08 | Sessão offline de até 30 dias; entitlement em cache com tolerância | W | Plus | RN-PWA-09, 10 |
| RF-PWA-09 | Fluxo de atualização de versão ("Nova versão disponível") e migrações locais | W | Plus | RN-PWA-11 |
| RF-PWA-10 | Web Push, badge de pendências, File Handling (.ofx/.csv/.xlsx) | W | Plus | RN-PWA-12 |
| RF-PWA-11 | Persistência de armazenamento e alerta de cota | W | Plus | RN-PWA-14 |
| RF-PWA-12 | (Opcional) Pacote Microsoft Store do mesmo PWA | W | Plus | RN-PWA-15 |

Prioridade: 01–08 **M**; 09–11 **S**; 12 **C**.

## 17. IA (ZOE) e MCP

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-ZOE-01 | Chat da Zoe (texto, voz, imagem/PDF) com histórico | W A I | Plus | RN-ZOE-01 |
| RF-ZOE-02 | Ferramentas internas da Zoe (consultas, criar lançamentos, efetivar, orçamentos, objetivos, lotes) com cartão de confirmação | W A I | Plus | RN-ZOE-02 |
| RF-ZOE-03 | Saldo de créditos de IA visível; bloqueio ao esgotar | W A I | Plus | RN-ZOE-03, 06 |
| RF-ZOE-04 | Relatório Inteligente mensal (gerado no dia 1, push/e-mail) | W A I | Plus | RN-ZOE-04 |
| RF-ZOE-05 | Leitura de comprovante → despesa | W A I | Plus | RN-ZOE-01 |
| RF-MCP-01 | Servidor MCP (Streamable HTTP) com ferramentas de leitura e escrita | backend | Plus | RN-MCP-* |
| RF-MCP-02 | Servidor OAuth 2.1 (DCR, PKCE, revogação, metadados RFC 8414/9728) | backend | Plus | RN-MCP-02, 03 |
| RF-MCP-03 | Tela de consentimento (escopos, "não verificada", opções sem confirmação, perfil) | W | Plus | RN-MCP-04..07 |
| RF-MCP-04 | Fluxo de confirmação pendente: o agente cria um rascunho; o usuário confirma no app ou em um link | W A I | Plus | RN-MCP-06 |
| RF-MCP-05 | Página de desbloqueio por PIN para o agente | W | Plus | RN-MCP-10 |
| RF-MCP-06 | Gerenciar conexões (listar, ver escopos, último uso, desconectar) | W A I | Plus | RN-MCP-11 |
| RF-MCP-07 | Rate limiting por usuário (dia/mês, leitura/escrita), com fuso America/Sao_Paulo | backend | Plus | RN-MCP-08 |

Prioridade: ZOE-01..03, MCP-01..03, 06, 07 **S**; demais **C**.

## 18. Assinatura (PLN)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-PLN-01 | Página de planos (anual/mensal), comparativo, quiz "encontre seu plano" | W A I | — | RN-PLN-01 |
| RF-PLN-02 | Checkout Web (cartão/Pix) via gateway; in-app Google Play Billing / StoreKit 2 | W A I | — | RN-PLN-06 |
| RF-PLN-03 | Gestão da assinatura: plano atual, renovação, cancelar, histórico de cobranças, solicitar reembolso em 7 dias | W A I | — | RN-PLN-04, 05 |
| RF-PLN-04 | Entitlements unificados (Web + lojas) via webhooks/RTDN/App Store Server Notifications | backend | — | RN-PLN-03 |
| RF-PLN-05 | Upgrade/downgrade com aplicação das regras de transição | backend | — | RN-PLN-09 |
| RF-PLN-06 | Paywalls contextuais ao tocar em recurso bloqueado | W A I | — | — |
| RF-PLN-07 | Anúncios discretos no Essencial (banner em listas; nunca em formulários) | A I | Essencial | RN-PLN-10 |

Prioridade: 01–06 **M**; 07 **C**.

## 19. Zooloo Kids (KID)

| ID | Requisito | Plat. | Plano | Regras |
|---|---|---|---|---|
| RF-KID-01 | App Zooloo Kids: Ganhei/Gastei, saldo, Meu mês, Meus sonhos, dicas/historinhas | K | grátis | RN-KID-01 |
| RF-KID-02 | Área do responsável (login adulto, criar/selecionar perfil da criança, pareamento) | K | grátis | RN-KID-02, 07 |
| RF-KID-03 | No app adulto: menu Zooloo Kids com saldo, movimentos e sonhos dos perfis vinculados | W A I | Plus | RN-KID-03 |
| RF-KID-04 | Combinados: CRUD no adulto; visualização e "feito" no Zooloo Kids; confirmação pelo responsável | W A I K | Plus | RN-KID-04, 06 |

Prioridade: **C** (fase posterior).

## 20. Site público e calculadoras (SIT)

| ID | Requisito | Plat. | Plano |
|---|---|---|---|
| RF-SIT-01 | Landing, páginas de recurso (Open Finance, IA, Web, Zooloo Kids), planos, FAQ | W | — |
| RF-SIT-02 | Central de Ajuda com categorias, artigos, busca, vídeos | W | — |
| RF-SIT-03 | Calculadoras: juros compostos, renda passiva, CDI, reserva de emergência | W | — |
| RF-SIT-04 | Termos de uso, política de privacidade, páginas de suporte | W | — |

Prioridade: 01, 04 **M**; 02, 03 **S**.

## 21. Configurações gerais (CFG)

| ID | Requisito | Plat. |
|---|---|---|
| RF-CFG-01 | Tema claro/escuro/sistema | W A I |
| RF-CFG-02 | Idioma (pt-BR inicial), formato de moeda por perfil | W A I |
| RF-CFG-03 | Primeiro dia do mês financeiro [I] (ex.: dia 5 para quem recebe no dia 5) | W A I |
| RF-CFG-04 | Preferências de notificação | W A I |
| RF-CFG-05 | Canal de suporte (formulário + chatbot de ajuda separado da Zoe) | W A I |
