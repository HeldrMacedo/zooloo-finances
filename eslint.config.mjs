// Linters de "gosto" (doc 12 §5.2). Cada mensagem diz como corrigir e aponta o doc de origem.
import js from '@eslint/js';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

const SPECS = 'docs/product-specs';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-e2e/**',
      '**/test-results/**',
      '**/coverage/**',
      '**/reports/**',
      '**/.stryker-tmp/**',
      'docs/**',
      'brand/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  // Lint de segurança (SEC-DEV-02).
  security.configs.recommended,
  {
    // Falso positivo em todo acesso por chave tipada; TS strict + noUncheckedIndexedAccess cobrem o risco.
    rules: { 'security/detect-object-injection': 'off' },
  },
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      // Módulos e controllers do NestJS são classes vazias com decorator.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='console']",
          message: `Não use console.*: logue pelo logger estruturado de @zooloo/security, que mascara valores, descrições e e-mails (RNF-OBS-01, ${SPECS}/04-requisitos-nao-funcionais.md §7).`,
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: `Não use new Date() para data de negócio: use LocalDate de @zooloo/domain (RNF-FIN-02). Timestamps UTC só nos adaptadores (${SPECS}/12-modo-de-desenvolvimento-harness-engineering.md §5.2).`,
        },
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message: `Não use toFixed() em valores: dinheiro é Money em centavos inteiros e o arredondamento fica em @zooloo/domain (RNF-FIN-01, RNF-FIN-04).`,
        },
        {
          selector:
            "CallExpression[callee.name='parseFloat'], CallExpression[callee.property.name='parseFloat']",
          message: `Não use parseFloat(): valores monetários entram como centavos inteiros via schema Zod e viram Money (RNF-FIN-01).`,
        },
      ],
    },
  },
  {
    // React no web-app: regras de hooks e acessibilidade (RNF-UX-01).
    files: ['apps/web-app/src/**/*.tsx'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['apps/web-app/src/**/*.tsx'],
    ...jsxA11y.flatConfigs.strict,
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['apps/web-app/src/**/*.{ts,tsx}', 'apps/web-app/public/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker, ...globals.serviceworker },
    },
  },
  {
    files: ['packages/domain/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'node:*',
                'fs',
                'path',
                'http',
                'https',
                'net',
                'crypto',
                'pg',
                'drizzle-orm*',
                'react*',
                '@zooloo/*',
              ],
              message: `@zooloo/domain é puro, sem I/O nem plataforma (doc 09 §3). Mova o acesso a dados para a camada Repo e passe os valores como parâmetro.`,
            },
          ],
        },
      ],
    },
  },
  {
    // Adaptador de calendário: único lugar do domínio onde Date entra, só como aritmética UTC.
    files: ['packages/domain/src/local-date.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Testes leem migrações e fixtures do próprio repositório, por caminhos montados em constantes.
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    // Scripts de geração gravam em pastas fixas do próprio repositório.
    files: [
      'apps/*/scripts/**/*.ts',
      'packages/*/scripts/**/*.ts',
      'packages/db-schema/src/sqlite/bundle-migrations.ts',
    ],
    rules: { 'security/detect-non-literal-fs-filename': 'off' },
  },
);
