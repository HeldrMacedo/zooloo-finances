# 06 — Telas e navegação

Nomes de menus observados na referência [O]: Resumo, Transações, Contas, Cartões de crédito, Orçamentos, Objetivos, Relatórios, Gráficos, Extrato, Open Finance, Ferramentas (Importar OFX, Gerenciar Modelos CSV, Histórico de notificações), Mais › Empréstimos, Configurações (Pontos de restauração, Importação de notificações, Open Finance, Mais › Conexões MCP e Agentes de IA), Perfil do usuário › Gerenciar perfis, Dispositivos conectados, Kids, Mia. No Zooloo, "Kids" passa a ser **Zooloo Kids** e "Mia" passa a ser **Zoe**.

## 1. Mobile (Android / iOS)

### Navegação principal [I]
Barra inferior com 5 posições:

| Posição | Aba | Conteúdo |
|---|---|---|
| 1 | **Resumo** | Dashboard de cards |
| 2 | **Transações** | Lista mensal + busca + filtros |
| 3 | **(+)** | FAB central → Despesa, Receita, Transferência, Despesa cartão, Ler cupom (Android), Zoe |
| 4 | **Planejamento** | Abas Orçamentos e Objetivos |
| 5 | **Mais** | Contas, Cartões, Relatórios, Gráficos, Empréstimos, Open Finance, Ferramentas, Zooloo Kids, Configurações, Perfil |

O cabeçalho global tem seletor de perfil, seletor de mês (‹ Novembro 2026 ›), olho do modo privado, sincronização e Zoe.

### Inventário de telas

| Código | Tela | Elementos-chave |
|---|---|---|
| M-01 | Splash / Login / Cadastro / Esqueci a senha | Social login, aceite de termos |
| M-02 | Onboarding (5 passos) | Moeda, contas, categorias, cartões, receitas fixas |
| M-03 | PIN do perfil | Teclado de 4 dígitos, bloqueio |
| M-10 | Resumo | Cards configuráveis; cabeçalho de saldo (atual/previsto); Saúde Financeira |
| M-11 | Configurar Resumo | Lista arrastável de cards; Configurar saldo |
| M-12 | Detalhamento do saldo | Composição por conta, grupo e pendências |
| M-20 | Transações | Lista agrupada por dia com saldo diário; filtros rápidos; seleção múltipla com pressão longa |
| M-21 | Formulário de lançamento | Valor, tipo, descrição (autocomplete), situação, datas, conta/cartão (com fatura), categoria, multicategoria, recorrência, tags, observações, anexo, local, ignorar nos totais |
| M-22 | Detalhes do lançamento | Ações: efetivar, duplicar, transformar em…, reembolso, mesclar, excluir (com escopo) |
| M-23 | Ação em lote | Escolher a ação → resumo → confirmar |
| M-30 | Contas | Lista por categoria de contas, saldos, grupos expansíveis |
| M-31 | Conta (form/detalhe) | Menu: reajustar saldo, extrato, arquivar |
| M-32 | Extrato | Configurações (engrenagem), exportar |
| M-40 | Cartões | Seletor do mês de vencimento; card por cartão com total, pendente e limite |
| M-41 | Fatura | Lista por data de lançamento, valor em aberto, Pagar/Antecipar/Reabrir |
| M-42 | Pagar fatura | Conta, valor (sugestão = pendente), data; adicionar outra conta |
| M-50 | Orçamentos | Abas Despesas/Receitas; cards com barra |
| M-51 | Orçamento (form) | Filtros, período, meta, opções |
| M-52 | Orçamento (detalhe) | Transações, gráfico uso × meta, meta recomendada, alterar/transferir/copiar/arquivar |
| M-60 | Objetivos | Ativos / Realizados |
| M-61 | Objetivo (form/detalhe) | Card, simulador, gráfico de 6 meses, aba Depósitos |
| M-70 | Relatórios | Construtor de filtros, salvar, comparar, lista/gráfico/evolução, exportar, "Descrever com IA" |
| M-71 | Gráficos | Categorias, evolução, fluxo de caixa, patrimônio, Saúde Financeira |
| M-80 | Empréstimos | Lista ativos/arquivados, totais |
| M-81 | Empréstimo (form/detalhe) | Parcelas, registrar devolução, juros, abatimento, vincular, comparar |
| M-90 | Open Finance | Conexões, botão Nova conexão, bancos suportados |
| M-91 | Conexão (detalhe) | Status, última atualização, itens e vínculos, atualizar/reconectar/remover/reiniciar |
| M-92 | Sugestões de conciliação | Pares lado a lado, aceitar/rejeitar |
| M-A0 | Ferramentas | Importar OFX, Modelos CSV, Importar por modelo, Histórico de notificações, Ler cupom |
| M-A1 | Prévia de importação | Linhas, mapeamento de cadastros, conciliação, confirmar |
| M-B0 | Zoe | Chat, anexar imagem/PDF, voz, cartões de confirmação, saldo de créditos |
| M-C0 | Configurações | Aparência, notificações, importação de notificações, Open Finance, pontos de restauração, conexões MCP, dispositivos, assinatura, privacidade, ajuda, sobre |
| M-C1 | Perfil do usuário | Dados, senha, 2FA, gerenciar perfis, exportar dados, excluir conta |
| M-C2 | Planos / Paywall | Comparativo, anual/mensal, compra in-app, restaurar compras |
| M-D0 | Zooloo Kids (adulto) | Crianças vinculadas, saldo, movimentos, sonhos, Combinados |

### Widgets e integrações do SO [I]
- Android: widget de saldo + nova despesa; atalho dinâmico "Nova despesa"; Quick Settings tile.
- iOS: widget (WidgetKit); App Intents (Siri/Atalhos); Live Activity opcional para fatura vencendo.

## 2. Web e Desktop (PWA)

A mesma interface roda no navegador e como app instalado (janela própria, ícone "Zooloo" na área de trabalho, no menu Iniciar ou no Dock). No modo instalado, a barra do navegador some e a topbar do app ocupa o topo. [I]

### Layout [I]
- **Sidebar fixa** (recolhível): Resumo, Transações, Contas, Cartões, Orçamentos, Objetivos, Relatórios, Gráficos, Calendário, Empréstimos, Open Finance, Importar/Exportar, Zooloo Kids, Zoe.
- **Topbar**: seletor de perfil, seletor de período, busca global (`/`), modo privado, **indicador de conectividade e sync** (Online/Offline · pendências), notificações, menu do usuário (inclui **"Instalar aplicativo Zooloo"** quando disponível).
- **Painel lateral direito** (drawer) para formulários e detalhes, sem sair da lista.

### Telas e diferenças em relação ao mobile

| Código | Tela | Específico do Web |
|---|---|---|
| W-10 | Resumo | Grid de 1–3 colunas; cards redimensionáveis |
| W-20 | Transações | **Tabela** com colunas configuráveis, ordenação, edição inline (categoria, tags, situação), seleção com Shift/Ctrl, paginação virtual |
| W-21 | Lançamento | Drawer; atalhos N/R/T; Tab entre campos |
| W-32 | Extrato | Visão ampla com saldo por linha; imprimir/PDF |
| W-41 | Fatura | Tabela + conciliação com OFX de fatura lado a lado |
| W-52 | Orçamento | Tabela anual (meses × orçamentos) com meta/uso — visão "planilha" |
| W-70 | Relatórios | Construtor avançado, tabela dinâmica (categoria × mês), comparativo lado a lado |
| W-75 | Calendário | Mês com vencimentos, faturas e recebimentos por dia; arrastar para reagendar o vencimento |
| W-A1 | Importação | Upload por arrastar e soltar de vários arquivos; grade de prévia editável; conciliação em massa |
| W-B0 | Zoe | Painel lateral persistente |
| W-C3 | Consentimento OAuth/MCP | Página pública de autorização (`/oauth/authorize`): login, perfil(s), escopos, aviso "não verificada", toggles sem confirmação |
| W-C4 | Desbloqueio de PIN para o agente | Página curta com o PIN |
| W-C5 | Confirmar ação pendente | Link recebido do agente → revisar → confirmar |
| W-C6 | Instalar aplicativo Zooloo | Modal: benefícios (ícone na área de trabalho, offline, janela própria), botão Instalar (Chromium) ou passo a passo (Safari: Arquivo › Adicionar ao Dock) |
| W-C7 | Login no Web/PWA | Opção "Manter dados neste computador (uso pessoal)"; paywall se Essencial |
| W-C8 | Sincronização inicial | Progresso do download dos perfis; uso liberado com os 13 meses recentes |
| W-S* | Site público | Landing, recursos, planos, ajuda, calculadoras, termos, privacidade, checkout |

Funcionamento **offline** no Web/PWA: todas as telas de cadastro e consulta. Open Finance, Zoe, assinatura, MCP e pontos de restauração mostram "Disponível quando estiver online" (RN-PWA-07).

Recursos **ausentes** no Web/PWA (dependem do SO móvel): importação de notificações/SMS, Siri/Atalhos/Carteira, leitura de cupom por câmera (no Web, aceitar upload de foto do QR [I]), Google Agenda nativo (no Web, oferecer feed ICS [I]), widgets.

## 3. Fluxos críticos (resumo)

1. **Primeiro uso**: Cadastro → e-mail de verificação → Onboarding → Resumo com checklist.
2. **Lançar despesa de cartão**: (+) → Despesa cartão → valor → cartão (mostra "Fatura de dez/26") → categoria → salvar → fatura atualizada e limite disponível recalculado.
3. **Pagar fatura**: Cartões → mês → Pagar → conta + valor → confirmar → despesas efetivadas; extrato da conta mostra o pagamento.
4. **Conectar banco**: Open Finance → Nova conexão → paywall se não for Conecta → escolher categorização e vínculo → widget do agregador → revisar itens e fechamento → importação inicial → sugestões de conciliação.
5. **Agente externo**: o agente chama o MCP → 401 → descoberta OAuth → DCR → `/oauth/authorize` (login + consentimento) → token → ferramentas. Escrita sem permissão gera `pending_action` + link de confirmação.
6. **Downgrade**: expiração → job aplica RN-PLN-09 → push/e-mail explicando o que mudou.
