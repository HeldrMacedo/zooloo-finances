// Regras arquiteturais do monorepo (doc 09 §3 e doc 12 §5.1). Mensagens dizem como corrigir.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-sem-io',
      comment:
        '@zooloo/domain é puro: não importa rede, banco, plataforma nem outros pacotes. Mova o I/O para a camada Repo do app e passe os dados como parâmetro (doc 09 §3).',
      severity: 'error',
      from: { path: '^packages/domain/src', pathNot: '\\.test\\.ts$' },
      to: {
        pathNot: '^packages/domain/src',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'app-nao-importa-app',
      comment:
        'Apps só se comunicam por pacotes e pela API; nunca importam código de outro app. Extraia o código compartilhado para um pacote em packages/ (doc 09 §3).',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/([^/]+)/', pathNot: '^apps/$1/' },
    },
    {
      name: 'pacote-nao-importa-app',
      comment:
        'Pacotes não dependem de apps. Inverta a dependência: o app importa o pacote (doc 09 §3).',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'sem-ciclos',
      comment: 'Dependência circular. Extraia o trecho comum para um módulo de nível mais baixo.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'producao-nao-importa-teste',
      comment: 'Código de produção não importa arquivos de teste.',
      severity: 'error',
      from: { pathNot: '\\.test\\.ts$' },
      to: { path: '\\.test\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage|reports|\\.stryker-tmp)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
};
