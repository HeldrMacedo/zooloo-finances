# 13 — Identidade visual

![Identidade visual Zooloo Finanças](imagem/identidade_visual.jpg)

> A imagem acima é a **prancha conceitual** da marca. Os textos dentro das telas de exemplo (cards, gráficos, mensagens da Zoe, nomes de menu) são ilustrativos e contêm erros de digitação; não devem ser usados como texto do produto. Textos oficiais ficam em `@zooloo/i18n`, e regras de plano no [doc 08](08-planos-e-limites.md).

## Conceito da marca
### A direção escolhida é uma marca que combina:
- Confiança: importante para um aplicativo financeiro.
- Modernidade: aparência de fintech profissional.
- Proximidade: comunicação simples e amigável.
- Família: possibilidade de expansão para o Zooloo Kids.
- Marca: Zooloo Finanças
- Símbolo: Coruja estilizada com Z
- Estilo: Minimalista, moderno e amigável

## 1. Logotipo e símbolo

- **Símbolo**: coruja estilizada em círculo, com o corpo formando um **Z** (Midnight sobre Teal, com o detalhe inferior em Sun) e bico em laranja/Sun.
- **Logotipo horizontal**: símbolo + palavra **"zooloo"** em minúsculas, Midnight, sem serifa geométrica e pesada; abaixo, **"FINANÇAS"** em maiúsculas, espaçada, alinhada à largura da palavra.
- **Só o símbolo** é usado em: ícone do app (nome "Zooloo"), ícone do PWA, favicon, avatar da Zoe e espaços pequenos.
- Versões necessárias [I]: colorida em fundo claro, negativa (fundo Midnight), monocromática Midnight e monocromática branca.
- Área de proteção [I]: margem mínima em volta do logotipo igual à altura do "o" de "zooloo". Tamanho mínimo: símbolo com 24 px no digital; logotipo horizontal com 120 px de largura.
- Não fazer: distorcer, rotacionar, trocar as cores, aplicar sombra ou contorno, ou colocar o logotipo colorido sobre fundo Teal ou Sun sem a versão negativa ou monocromática.

## 2. Paleta

### 2.1 Cores da marca

**Decisão** (19/11/2026): a paleta segue o painel de referência `docs/references/zooloo_finan_as_web_desktop_dashboard.html` (azul-marinho, teal acinzentado, âmbar e fundos areia), no lugar da paleta Mint/Teal da prancha.

| Token | Nome | Hex | Papel |
|---|---|---|---|
| `color.midnight` | Midnight | `#16324A` | Texto principal, item ativo do menu, botão primário, plano Pro |
| `color.teal` | Zooloo Teal | `#2D6E85` | Cor principal da marca: símbolo, destaques, gráficos, anéis de progresso, links |
| `color.teal-300` | Soft Teal | `#78A5B0` | Detalhes do símbolo, gráficos, links no tema escuro |
| `color.sun` | Sun (âmbar) | `#E59934` | Destaque e calor: avisos, faturas, botão "Pagar", selos, Zooloo Kids |
| `color.terracotta` | Terracota | `#BC4E26` | Gráficos e alertas; base da cor de despesa |
| `color.sand` | Sand | `#F5F1EB` | Fundo da aplicação no tema claro |

### 2.2 Cores derivadas [I]

Necessárias para superfícies e para cumprir contraste (RNF-UX-01, WCAG 2.1 AA):

| Token | Hex | Uso |
|---|---|---|
| `color.sand-50` | `#FAF7F2` | Cards no tema claro |
| `color.sand-100` | `#F1ECE3` | Subcards, cabeçalho de tabela, campos |
| `color.sand-200` | `#EFEAE1` | Menu lateral no tema claro |
| `color.sand-300` / `sand-400` | `#E6DFD3` / `#D6CCBC` | Bordas sutil e forte no tema claro |
| `color.text-muted` | `#5A6874` | Texto secundário no tema claro (a referência usa `#637381`, que fica abaixo de 4,5:1 sobre Sand) |
| `color.midnight-950` | `#0B1D2C` | Fundo de página no tema escuro |
| `color.midnight-900` | `#0E2231` | Menu lateral no tema escuro; texto sobre Sun e Ice |
| `color.midnight-800` / `700` | `#132B3E` / `#18344B` | Cards e subcards no tema escuro |
| `color.midnight-600` / `500` | `#1E3D56` / `#2A506F` | Bordas sutil e forte no tema escuro |
| `color.ice` | `#C7D8E2` | Item ativo do menu e botão primário no tema escuro |
| `color.cloud` | `#F1F5F9` | Texto principal no tema escuro |
| `color.text-muted-dark` | `#94A3B8` | Texto secundário no tema escuro |
| `color.teal-400` | `#3C849C` | Anéis e barras no tema escuro (só gráfico) |
| `color.terracotta-400` | `#D9653B` | Gráficos no tema escuro |

### 2.3 Regras de contraste

Razões de contraste calculadas (WCAG):

| Combinação | Contraste | Uso permitido |
|---|---|---|
| Midnight sobre Sand / Sand-50 / Sand-100 | 11,7 / 12,4 / 11,2 | Qualquer texto |
| Branco sobre Midnight | 13,2 | Qualquer texto (item ativo, botão primário) |
| Branco sobre Teal | 5,7 | Qualquer texto (avatar da Zoe, selos) |
| Midnight-900 sobre Sun | 6,9 | Qualquer texto (botões e selos em Sun) |
| Midnight-900 sobre Ice | 11,1 | Qualquer texto (tema escuro) |
| Teal sobre Sand-50 / Sand-100 | 5,3 / 4,9 | Links e texto em Teal no tema claro |
| Midnight sobre **Teal** | **2,3** | Só elementos gráficos, **nunca** texto |
| Sun sobre Sand-50 | **2,2** | Só elementos gráficos (barras, pontos, ícones) |
| Teal-400 sobre Midnight-800 | **3,5** | Só elementos gráficos no tema escuro; texto usa Soft Teal (5,4) |

### 2.4 Cores semânticas financeiras [I]

A cor da marca **não** representa entrada de dinheiro. Receita e despesa têm cores próprias e sempre vêm com sinal e ícone (RNF-UX-02).

| Token | Tema claro | Tema escuro | Uso |
|---|---|---|---|
| `color.income` | `#18744C` (≥ 4,8 sobre as superfícies claras) | `#80ED99` (≥ 8,8 sobre as escuras) | Receitas, valores positivos |
| `color.expense` | `#AD4621` (≥ 4,7 sobre as superfícies claras) | `#EA8461` (≥ 4,8 sobre as escuras) | Despesas, valores negativos, saldo negativo |
| `color.warning` | fundo Sun + texto Midnight-900 | fundo Sun + texto Midnight-900 | Vencimentos próximos, orçamento perto do limite |
| `color.info` | Teal | Soft Teal | Pendências, sincronização |

Gráficos usam a sequência: Midnight, Teal, Soft Teal, Sun, Terracota, `#D6CCBC` no tema claro; Soft Teal, Teal-400, Ice, Sun, `#D9653B`, `#94A3B8` no escuro. Sempre com legenda textual.

## 3. Tipografia

**Decisão** (18/11/2026): a prancha usa sans-serif geométrica, de formas abertas e peso forte nos títulos. As fontes escolhidas combinam esse tom amigável com a legibilidade de dados de uma fintech:

| Uso | Fonte | Pesos | Motivo |
|---|---|---|---|
| Títulos, marca, números em destaque (saldo, valor do formulário) | **Plus Jakarta Sans** | 600, 700, 800 | Geométrica, moderna e amigável, próxima do logotipo "zooloo"; tem algarismos tabulares |
| Interface, tabelas, extrato, formulários | **Inter** | 400, 500, 600 | Feita para telas, ótima em tamanhos pequenos e em tabelas densas; algarismos tabulares e suporte completo a pt-BR |
| Zooloo Kids (títulos) | **Nunito** | 700, 800 | Arredondada e lúdica, combina com a coruja ilustrada; corpo de texto do Kids segue em Inter |

Regras:

- Todo valor monetário usa `font-variant-numeric: tabular-nums` (Inter e Plus Jakarta Sans têm), para alinhar colunas de extrato, faturas e relatórios.
- Escala: 12 / 14 / 16 (corpo) / 20 / 24 / 32 / 40 px. Valor em destaque no formulário de lançamento e saldo no Resumo: 32–40 px em Plus Jakarta Sans 700.
- Altura de linha: 1,5 no corpo; 1,2 em títulos.
- As três fontes têm licença **SIL OFL** e são servidas pelo próprio app em WOFF2 com *subset* latino (sem CDN de terceiros, por privacidade e CSP). Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- No mobile (Fase 2), as mesmas fontes via `expo-font`.

## 4. Iconografia e ilustração

- **Ícones de interface**: linha, traço de 2 px, cantos arredondados, em Midnight (ativo em branco sobre Midnight). Proposta [I]: Lucide, por ser de linha e ter licença aberta.
- **Ícones de plano** (prancha): Essencial = celular e tablet; Plus = setas de sincronização; Conecta = hexágono com cifrão entre setas; Pro = laurel com "IA".
- **Mascote**: a coruja é o personagem da marca. Na Zoe, aparece como avatar; no Zooloo Kids, em versão ilustrada e expressiva.
- Cantos arredondados (raio 12–16 px em cards, 8–10 px em botões e campos), sombras leves e muito espaço em branco.

## 5. Aplicação por produto

### 5.1 Web App e PWA

Seguindo o painel de referência (`docs/references/zooloo_finan_as_web_desktop_dashboard.html`) e o doc 06:

- **Menu lateral** em altura total, fundo Sand-200, com símbolo + "Zooloo Finanças" no topo, item ativo em Midnight com texto branco e indicador de sincronização no rodapé. No desktop recolhe para trilho de ícones (botão de menu, lembrado no dispositivo); abaixo de 1024 px vira gaveta sobre o conteúdo.
- **Cabeçalho do conteúdo** (sem barra escura): botão de menu, saudação e, à direita, seletor de mês, busca, privacidade, tema e botão primário "Nova despesa" (tecla `N`).
- **Conteúdo** em Sand com cards Sand-50, raio 18 px, borda sutil e sombra leve.
- Botão **"Instalar aplicativo Zooloo"** (RF-PWA-03) no cabeçalho da área de conteúdo, em Midnight com texto branco.
- **Manifest do PWA**: `theme_color` `#16324A` e `background_color` `#F5F1EB`; ícones do símbolo em 192, 512 e *maskable* com área de segurança de 80%.

### 5.2 Planos

| Plano | Fundo do card | Texto | Ícone |
|---|---|---|---|
| Zooloo Essencial | Sand-100 | Midnight | Dispositivos |
| Zooloo Plus | Teal | Branco | Sincronização |
| Zooloo Conecta | Teal (topo) para Sun (base) | Midnight | Hexágono com cifrão |
| Zooloo Pro | Midnight | Título em Sun, texto branco | Laurel "IA" |

> A frase do card Pro na prancha ("IA/MCP e visual premium") não segue o doc 08: IA e MCP já existem a partir do Plus, com limites por plano. O texto do card deve vir da matriz do doc 08.

### 5.3 Zoe

- Avatar: símbolo da coruja.
- Balão do usuário em Midnight com texto branco; balão da Zoe em Sand-100 com texto Midnight.
- Saldo de créditos de IA em selo Sun com texto Midnight-900.

### 5.4 Zooloo Kids

- Coruja ilustrada com óculos em Sun, asas abertas e expressão alegre.
- Logotipo "Zooloo" em Midnight + "Kids" em degradê laranja/Sun com detalhe em Teal.
- Cabeçalhos em Teal, cards de recompensa em Sun, tipografia mais arredondada e tamanhos maiores.
- As mesmas regras de contraste valem; nenhum texto em branco sobre Teal ou Sun.

## 6. Tokens de design

Os valores deste documento são a fonte do pacote `@zooloo/ui-tokens` (doc 09 §3), consumido pelo web-app, pelo site e pelos apps mobile:

```json
{
  "color": {
    "midnight": "#16324A",
    "midnight-950": "#0B1D2C",
    "midnight-900": "#0E2231",
    "midnight-800": "#132B3E",
    "midnight-700": "#18344B",
    "midnight-600": "#1E3D56",
    "midnight-500": "#2A506F",
    "teal": "#2D6E85",
    "teal-400": "#3C849C",
    "teal-300": "#78A5B0",
    "ice": "#C7D8E2",
    "sun": "#E59934",
    "terracotta": "#BC4E26",
    "terracotta-400": "#D9653B",
    "sand": "#F5F1EB",
    "sand-50": "#FAF7F2",
    "sand-100": "#F1ECE3",
    "sand-200": "#EFEAE1",
    "sand-300": "#E6DFD3",
    "sand-400": "#D6CCBC",
    "white": "#FFFFFF",
    "cloud": "#F1F5F9",
    "text-muted": "#5A6874",
    "text-muted-dark": "#94A3B8",
    "income": { "light": "#18744C", "dark": "#80ED99" },
    "expense": { "light": "#AD4621", "dark": "#EA8461" }
  },
  "radius": { "sm": 8, "md": 12, "lg": 16, "xl": 18 },
  "font": {
    "display": "Plus Jakarta Sans",
    "ui": "Inter",
    "kids": "Nunito"
  }
}
```

Um teste automatizado verifica o contraste de todos os pares texto/fundo declarados nos tokens (≥ 4,5:1 para texto normal), conforme RNF-QA-05.

## 7. Ativos pendentes

- [ ] Arquivos vetoriais (SVG) do símbolo e do logotipo nas 4 versões (§1), com grade de construção. **Adiado** (18/11/2026): até a entrega, o desenvolvimento usa ativos provisórios (§7.1).
- [ ] Ícones de app: Android adaptativo, iOS, PWA (192, 512, *maskable*), favicon e `apple-touch-icon`.
- [x] Definição e licença da tipografia (§3).
- [ ] Biblioteca no Figma com componentes e telas do MVP (doc 11).
- [ ] Ilustrações da coruja (Zoe e Zooloo Kids) em vetor.
- [ ] Registro da marca e do símbolo no INPI.

### 7.1 Ativos provisórios (até a entrega dos vetores)

- **Logotipo no menu e no site**: componente `<ZoolooLogo>` que, provisoriamente, renderiza a coruja geométrica do painel de referência (corpo Teal, contorno Soft Teal, bico Sun) num quadrado Midnight, ao lado de "Zooloo Finanças".
- **Ícones do PWA e favicon**: círculo Teal com "Z" branco, gerados por script a partir dos tokens (192, 512, *maskable* e favicon).
- **Avatar da Zoe**: o mesmo círculo provisório.
- Todos os usos passam por esse componente e por um único diretório de ícones (`apps/web-app/public/icons/`). Assim, quando os SVGs chegarem, a troca é feita em um só lugar, sem mudar telas.
- Ativos provisórios não vão para o lançamento público (Fase 1.1).
