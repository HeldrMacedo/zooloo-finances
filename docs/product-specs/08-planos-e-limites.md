# 08 — Planos e limites

## 1. Preços de referência [O] (17/11/2026)

Os valores abaixo são os do produto de referência e servem de base para a precificação do Zooloo.

| Plano Zooloo | Plano na referência | Anual | "De" (12× mensal) | Desconto | Equivalente/mês |
|---|---|---|---|---|---|
| Zooloo Essencial (grátis) | Gratuito | R$ 0 | — | — | — |
| Zooloo Plus | Sync | R$ 99,90 | R$ 166,80 (≈ R$ 13,90/mês) | 40% | R$ 8,33 |
| Zooloo Conecta (mais popular) | Sync Bank | R$ 199,90 | R$ 358,80 (≈ R$ 29,90/mês) | 44% | R$ 16,66 |
| Zooloo Pro | Sync Bank Pro | R$ 399,90 | R$ 718,80 (≈ R$ 59,90/mês) | 44% | R$ 33,33 |

A página tem um seletor Anual/Mensal; o preço mensal foi deduzido do valor "De" [I].

## 2. Matriz de recursos e limites

Legenda: ✔ incluído · — não incluído · valores = limite.

| Recurso | Zooloo Essencial | Zooloo Plus | Zooloo Conecta | Zooloo Pro | Fonte |
|---|---|---|---|---|---|
| Dispositivos | 1 (5 desconexões/mês) | Ilimitados | Ilimitados | Ilimitados | O |
| **Web + Desktop (PWA)** — navegador ou "Instalar aplicativo Zooloo" no Windows/macOS, offline e sincronizado | — | ✔ | ✔ | ✔ | O/I |
| Lançamentos, contas, cartões | Ilimitados | Ilimitados | Ilimitados | Ilimitados | O |
| Categorias/subcategorias, multicategorias, tags | ✔ | ✔ | ✔ | ✔ | O |
| Objetivos | ✔ | ✔ | ✔ | ✔ | O |
| Personalizar imagem de contas/cartões | ✔ | ✔ | ✔ | ✔ | O |
| Extrato detalhado | ✔ | ✔ | ✔ | ✔ | O |
| Gráficos básicos | ✔ | ✔ | ✔ | ✔ | O |
| Gráficos avançados (subcategorias) | — | ✔ | ✔ | ✔ | O* |
| Backup em nuvem | ✔ | ✔ | ✔ | ✔ | O |
| Cupom fiscal (Android) | ✔ | ✔ | ✔ | ✔ | O |
| Anexos | 1 MB/mês | Ilimitado | Ilimitado | Ilimitado | O |
| Propagandas | Poucas | — | — | — | O |
| Perfis adicionais | Compra avulsa | Ilimitados | Ilimitados | Ilimitados | O |
| PIN por perfil | — | Até 2 | Até 2 | Até 2 | O |
| Pontos de restauração | — | 15 | 15 | 15 | O |
| Mover transações entre categorias | — | ✔ | ✔ | ✔ | O* |
| Alterações em lote | — | ✔ | ✔ | ✔ | O* |
| Filtros avançados em Relatórios | — | ✔ | ✔ | ✔ | O* |
| Orçamentos | — | ✔ | ✔ | ✔ | O*/I |
| Empréstimos | — | ✔ | ✔ | ✔ | O |
| Gestão de tags | — | ✔ | ✔ | ✔ | O* |
| Importação de notificações/SMS | — | ✔ | ✔ | ✔ | O*/I |
| Siri (iOS) | — | ✔ | ✔ | ✔ | O* |
| Importação OFX/CSV | — | ✔ | ✔ | ✔ | O*/I |
| Exportação XLS/CSV/PDF | — | ✔ | ✔ | ✔ | O* |
| Modelos CSV personalizados | — | ✔ | ✔ | ✔ | O* |
| Cards extras no Resumo | — | ✔ | ✔ | ✔ | O* |
| Google Agenda (Android) | — | ✔ | ✔ | ✔ | O* |
| Zoe — créditos de IA/mês | 0 | 500 | 1.000 | 1.500 | O |
| Agentes MCP — consultas/dia | — | 500 | 1.000 | 2.000 | O |
| Agentes MCP — consultas/mês | — | 3.000 | 6.000 | 10.000 | O |
| Agentes MCP — escritas/dia | — | 50 | 150 | 300 | O |
| Integração Zooloo Kids + Combinados | — | ✔ | ✔ | ✔ | O |
| Open Finance — instituições | — | — | 3 | 10 | O |
| Atualizações OF | — | — | Até 4×/dia | Até 4×/dia | O |
| Tipos de instituição | — | — | PF e PJ (tabela) | PF e PJ | O** |
| Categorização inteligente / transferências automáticas | — | — | ✔ | ✔ | O |

\* A tabela comparativa da referência lista o recurso, mas a marcação por plano não pôde ser lida no HTML (ícones). A atribuição a Plus+ segue o texto "recursos avançados" do plano Zooloo Plus [I]. Validar com o produto antes de implementar.
\** A tabela marca PF e PJ nos dois planos Conecta; o card de planos destaca PJ só no Pro. Adotar: **PJ somente no Pro** [I].

## 3. Teste grátis [O]

- 15 dias do **Zooloo Plus**, a partir do cadastro, sem cartão.
- Open Finance não incluído.
- Ao fim do teste sem compra, o usuário passa ao Essencial com as regras de downgrade (RN-PLN-09).

## 4. Regras de *feature gating* [I]

1. O entitlement é calculado no servidor e enviado ao cliente no login e em cada sync (`GET /me` → `entitlement`).
2. O cliente oculta ou bloqueia a UI e o servidor **também** valida todo endpoint protegido (`403 plan_required` com `required_plan`).
3. Dados criados em plano superior **nunca** são apagados no downgrade; ficam somente leitura ou arquivados.
4. Cotas temporais usam o fuso America/Sao_Paulo; o dia vira à 00:00 e o mês no dia 1 (RN-MCP-08, RN-PLN-08).
5. Paywall mostra o plano **mínimo** que libera o recurso, com CTA de teste se ele ainda não tiver sido usado.

## 5. Web + Desktop no Zooloo Plus [I]

- O Web app é um **PWA**. Com uma única base de código, o Zooloo Plus vende **dois acessos**:
  - **Web**: uso no navegador, em qualquer computador;
  - **Desktop**: "Instalar aplicativo Zooloo" no Windows/macOS, com ícone na área de trabalho, janela própria, **offline** e **sincronização** com celular e tablet.
- Argumento de venda na página de planos: "Celular, computador e navegador — tudo sincronizado, até sem internet", a partir de R$ 8,33/mês no anual (preço de referência).
- Não há custo de manter apps nativos separados para Windows/macOS. Publicar o mesmo PWA na Microsoft Store é opcional (RN-PWA-15).
- Regras: RN-PLN-07, RN-PWA-01..15, RF-PWA-01..12.
