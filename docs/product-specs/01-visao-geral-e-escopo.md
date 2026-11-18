# 01 — Visão geral e escopo

## 0. Marca

| Elemento | Nome |
|---|---|
| Marca principal | **Zooloo Finanças** |
| Nome sob o ícone do app (celular) | **Zooloo** |
| Módulo/app infantil | **Zooloo Kids** |
| Assistente de IA | **Zoe** |
| Planos | **Zooloo Essencial** (grátis) · **Zooloo Plus** · **Zooloo Conecta** · **Zooloo Pro** |

Equivalência com o produto de referência (Minhas Finanças):

| Referência | Zooloo |
|---|---|
| Minhas Finanças | Zooloo Finanças |
| Minhas Finanças Kids | Zooloo Kids |
| Mia | Zoe |
| Gratuito | Zooloo Essencial |
| Sync | Zooloo Plus |
| Sync Bank | Zooloo Conecta |
| Sync Bank Pro | Zooloo Pro |

Nos documentos, "Plus+" significa Zooloo Plus, Conecta ou Pro.

## 1. Objetivo do produto

Aplicativo de controle financeiro **pessoal** (pessoa física) que permite registrar e planejar receitas, despesas, transferências, cartões de crédito, orçamentos, objetivos e empréstimos, com sincronização entre dispositivos, importação automática (Open Finance, OFX/CSV/XLSX, notificações/SMS), relatórios e assistente de IA.

Proposta de valor: manual quando o usuário quiser, automático quando conectado ao banco, com profundidade no Web. [I] O slogan da referência ("Controle financeiro que realmente funciona") não deve ser reutilizado; definir um slogan próprio do Zooloo.

## 2. Escopo

### Dentro do escopo
1. Cadastro de usuário, autenticação, perfis financeiros e PIN por perfil.
2. Contas (banco, carteira, investimento, grupos), categorias/subcategorias, tags.
3. Lançamentos: receita, despesa, transferência; fixos, parcelados, multicategorias; reembolso/estorno/compensação.
4. Cartões de crédito e faturas (fechamento, pagamento total/parcial, antecipação, reabertura).
5. Orçamentos (mensal, personalizado, agrupado, percentual de receita).
6. Objetivos (por depósitos ou por conta/grupo vinculado).
7. Controle de empréstimos (emprestei/peguei emprestado).
8. Resumo (dashboard configurável), Extrato, Relatórios, Gráficos, Saúde Financeira.
9. Importação/exportação (OFX, CSV/XLSX com modelos, PDF), conciliação.
10. Open Finance (agregador tipo Pluggy).
11. Importação de notificações bancárias/SMS (Android) e Atalhos/Siri/Carteira (iOS).
12. Assistente de IA interno ("Zoe") com créditos mensais e Relatório Inteligente mensal.
13. Servidor MCP + OAuth 2.1 para agentes de IA externos.
14. Sincronização multi-dispositivo e pontos de restauração.
15. Planos/assinaturas, teste grátis, limites por plano.
16. Módulo Zooloo Kids (app infantil + integração com responsável, "Combinados").
17. Calculadoras financeiras públicas.

### Fora do escopo
- Movimentar dinheiro (pagamentos, Pix reais) — o sistema **nunca** executa transações bancárias [O].
- Investimentos via Open Finance (ainda não suportado na referência) [O].
- Uso empresarial/contábil formal (termos restringem a pessoa física) [O].

## 3. Plataformas

| Plataforma | Referência | Este projeto |
|---|---|---|
| Android | Existe; recursos exclusivos (notificações/SMS, cupom fiscal, Google Agenda) [O] | App móvel (Android) |
| iOS | Existe; Atalhos, Siri, Carteira/Apple Pay [O] | App móvel (iOS) |
| Windows/macOS | Desktop nativo no plano Plus+ [O] | **PWA** do Web app, instalável pelo botão "Instalar aplicativo Zooloo", com ícone na área de trabalho, offline e sincronizado [I] |
| Web | "No planejamento" [O] | **Web app completo**, a mesma base de código do PWA [I] |
| Zooloo Kids | App separado, gratuito [O] | App móvel separado ou modo do app [I] |

Decisão [I]: a versão Web é construída como **PWA (Progressive Web App)**. Uma única base de código atende o uso no navegador e o **app de desktop instalado** no Windows/macOS (janela própria e ícone na área de trabalho, no menu Iniciar ou no Dock). O PWA funciona **offline** e **sincroniza** com os demais dispositivos. Ele cumpre o papel do desktop nativo da referência (telas amplas, relatórios, importação em massa, conciliação). **Web + Desktop (PWA)** são vendidos juntos a partir do **Zooloo Plus**, o segundo degrau de assinatura (RN-PLN-07, RN-PWA-*). Recursos que dependem do SO (notificações, SMS, Siri, Carteira, câmera de cupom) ficam **somente no mobile**.

## 4. Personas

- **Iniciante**: quer registrar gastos sem planilha; usa plano Zooloo Essencial em 1 dispositivo.
- **Organizado**: usa orçamentos, objetivos, relatórios; celular + computador (Zooloo Plus).
- **Automatizado**: conecta bancos via Open Finance, quer categorização e conciliação automáticas (Zooloo Conecta/Pro).
- **Casal/família**: perfis individuais + perfil conjunto, transferências entre perfis, PIN.
- **Responsável + criança (8–12 anos)**: app Zooloo Kids com Combinados.
- **Usuário de IA**: conversa com Zoe ou conecta ChatGPT/Claude via MCP.

## 5. Glossário

| Termo | Definição |
|---|---|
| Usuário | Titular do login (e-mail). Uma assinatura pertence ao usuário [O]. |
| Perfil | Controle financeiro independente dentro do mesmo usuário (pessoal, família, negócio, outra moeda) [O]. |
| Conta | "Recipiente de dinheiro": banco, carteira, caixinha, corretora [O]. |
| Conta de agrupamento (grupo) | Conta que consolida saldos/movimentos de contas filhas [O]. |
| Lançamento / Transação | Receita, despesa ou transferência. |
| Data de lançamento | Quando o fato econômico ocorreu (competência) [O]. |
| Data de vencimento | Quando se planeja pagar/receber um pendente [O]. |
| Data de efetivação | Quando de fato pagou/recebeu [O]. |
| Efetivado / Pendente | Situação do lançamento (pago/recebido vs. previsto). |
| Fatura | Agrupamento das despesas de um cartão por ciclo, identificada pelo mês de vencimento [O]. |
| Reembolso | Despesa negativa sem cartão (entrada) [O]. |
| Estorno | Despesa negativa em cartão (reduz fatura) [O]. |
| Compensação | Receita negativa (saída) [O]. |
| Ignorado nos totais | Conta/lançamento que não participa dos saldos/gráficos gerais [O]. |
| Orçamento | Meta de gasto/receita para um período, com filtros [O]. |
| Objetivo | Valor a acumular até uma data [O]. |
| Ponto de restauração | Snapshot nomeado do estado do perfil para restaurar [O]. |
| Conciliação | Confirmar que dois registros representam a mesma movimentação [O]. |
| Zoe | Assistente de IA interno [O]. |
| MCP | Model Context Protocol — conexão autorizada com agentes externos [O]. |
| Créditos de IA | Cota mensal para recursos de IA internos, não acumulável [O]. |
| Combinado | Tarefa criada pelo responsável para a criança, com prazo e recompensa opcional [O]. |
