# Especificação — Zooloo Finanças (Web + Desktop PWA + Mobile)

Especificação de produto do **Zooloo Finanças** (ícone no celular: **Zooloo**), com versão **Web** instalável no desktop como **PWA** (Windows/macOS, com funcionamento offline e sincronização), **Aplicativo Móvel** (Android/iOS), módulo infantil **Zooloo Kids** e assistente de IA **Zoe**.

Planos: **Zooloo Essencial** (grátis) · **Zooloo Plus** · **Zooloo Conecta** · **Zooloo Pro**.

A especificação foi derivada da análise do **Minhas Finanças** (Nimtech TI, `cicero.minhasfinancas`), usado como referência funcional. A tabela de equivalência de nomes está em [01 §0](01-visao-geral-e-escopo.md#0-marca).

## Documentos

| # | Documento | Conteúdo |
|---|-----------|----------|
| 01 | [Visão geral e escopo](01-visao-geral-e-escopo.md) | Contexto, fontes, personas, plataformas, glossário |
| 02 | [Regras de negócio](02-regras-de-negocio.md) | Todas as regras (RN-xxx) por módulo |
| 03 | [Requisitos funcionais](03-requisitos-funcionais.md) | Requisitos (RF-xxx) por módulo, com matriz Web/PWA × Mobile |
| 04 | [Requisitos não funcionais](04-requisitos-nao-funcionais.md) | Segurança, LGPD, sincronização offline, desempenho, acessibilidade |
| 05 | [Modelo de dados](05-modelo-de-dados.md) | Entidades, atributos, relacionamentos e enums |
| 06 | [Telas e navegação](06-telas-e-navegacao.md) | Mapa de telas Web/PWA e Mobile |
| 07 | [Integrações e API](07-integracoes-e-api.md) | Sincronização, Open Finance, MCP/OAuth, IA, pagamentos, notificações |
| 08 | [Planos e limites](08-planos-e-limites.md) | Planos, preços de referência, cotas e regras de *feature gating* |
| 09 | [Arquitetura e stack](09-arquitetura-e-stack.md) | Stack definida (TypeScript, Node.js, PostgreSQL, Expo, React/Vite PWA, Next.js), monorepo, banco local, código nativo, riscos e PoCs |
| 10 | [Segurança e proteção de dados](10-seguranca-e-protecao-de-dados.md) | Classificação de dados, ameaças, identidade, isolamento, criptografia (servidor e dispositivos), API, PWA, mobile, IA/MCP, LGPD, incidentes, gate de produção |
| 11 | [Roadmap e MVP](11-roadmap-e-mvp.md) | Fases 0–5, escopo do MVP (Web + PWA + backend), decisões de plano no beta, critérios de aceite dos fluxos críticos, dependências externas |
| 12 | [Modo de desenvolvimento: harness engineering](12-modo-de-desenvolvimento-harness-engineering.md) | Desenvolvimento por agentes: repositório como sistema de registro, AGENTS.md, legibilidade do app, arquitetura em camadas, política de merge por risco, níveis de autonomia, coleta de lixo, segurança do harness |
| 13 | [Identidade visual](13-identidade_visual.md) | Conceito da marca, logotipo e símbolo (coruja com Z), paleta com regras de contraste, cores financeiras, tipografia, aplicação no Web/PWA, planos, Zoe e Zooloo Kids, tokens de design |

## Convenção de rastreabilidade

Cada regra/requisito traz uma marca de origem:

- **[O]** Observado — consta em fonte pública do produto de referência (site, Central de Ajuda, termos, política, metadados OAuth/MCP).
- **[I]** Inferido/Proposto — decisão de projeto deste documento, para preencher lacunas ou adaptar à versão Web (que não existe no produto de referência).

## Fontes analisadas (17/11/2026)

- `https://minhasfinancas.app.br/` — home, `/planos-precos`, `/open-finance`, `/ia`, `/desktop`, `/kids`, `/calculadoras/*`, `/termos-uso`, `/politicas-privacidade`.
- Central de Ajuda — 46 artigos em `/ajuda/*` (12 categorias).
- Metadados públicos do servidor MCP: `https://mcp.minhasfinancas.app.br/.well-known/oauth-protected-resource` e `https://minhasfinancas.app.br/.well-known/oauth-authorization-server/oauth`.
- REA (`analyze_web_bundle`) sobre o site: Next.js de marketing, sem endpoints de API de dados no bundle (evidência `ev_ff7337b7…`). Confirma que **não há app Web de produto** — "versão web… no planejamento".
- APK Android **não analisado**: não havia arquivo APK local; a Play Store não fornece download direto.
