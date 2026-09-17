// Flat config. Substitui o antigo `.eslintrc.js`, que era so `extends: 'expo'`.
//
// O problema que isto resolve: com a configuracao minima, o `no-undef` acusava
// `jest`, `setTimeout`, `fetch` e companhia — globais que existem mesmo em
// tempo de execucao. Davam 4 erros e 961 avisos, e um sinal com esse ruido nao
// se le: ninguem distingue o que importa do que e ruido do ambiente.
//
// Portada da app do tecnico (app-vendor), que ja tinha isto resolvido, com os
// caminhos adaptados a esta app. As duas passam a ter a mesma rede.
//
// `eslint-config-expo@10` ainda e eslintrc-style, por isso e carregado atraves
// do FlatCompat.
//
// Filosofia: rede de seguranca, nao policia de estilo. Erros a serio ficam a
// `error`; o que for cosmetico fica a `warn`, para nao bloquear ninguem.

// Globais do runtime React Native (Hermes + polyfills do RN). Declarados a mao
// em vez do pacote `globals`: a versao hoisted no projecto e antiga (sem
// `es2021`) e tem chaves com espaco a direita, que o ESLint rejeita.
const RN_GLOBALS = {
  __DEV__: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  fetch: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  WebSocket: 'readonly',
  XMLHttpRequest: 'readonly',
  Event: 'readonly',
  EventTarget: 'readonly',
  performance: 'readonly',
  navigator: 'readonly',
  alert: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  structuredClone: 'readonly',
  queueMicrotask: 'readonly',
  // Presentes no alvo web (react-native-web / expo web).
  window: 'readonly',
  document: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  location: 'readonly',
  ErrorUtils: 'readonly',
  HermesInternal: 'readonly',
  JSX: 'readonly',
  process: 'readonly',
  require: 'readonly',
  module: 'writable',
  global: 'readonly',
};

const { FlatCompat } = require('@eslint/eslintrc');

// Em flat config, um objecto que usa `plugin/regra` tem de declarar o plugin
// nele proprio.
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

// Resolve os plugins a partir da RAIZ (nao do node_modules do
// eslint-config-expo): o `eslint-plugin-react-hooks@4` embutido usa APIs
// removidas nas versoes novas do ESLint e rebenta a meio do lint. A raiz tem a
// v5, compativel.
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'android/**',
      'ios/**',
      'patches/**',
      'coverage/**',
      'expo-env.d.ts',
      'nativewind-env.d.ts',
    ],
  },

  ...compat.extends('expo'),

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { '@typescript-eslint': tsPlugin, 'react-hooks': reactHooksPlugin },
    languageOptions: {
      // O runtime do React Native expoe os globais do browser (timers, console,
      // fetch, URL...). Sem isto o `no-undef` acusa `setTimeout` e afins, e o
      // sinal util desaparece no meio do ruido.
      globals: RN_GLOBALS,
    },
    rules: {
      // --- Bugs a serio ---
      'react-hooks/rules-of-hooks': 'error',
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-cond-assign': 'error',

      // --- Sinais uteis, mas que nao devem parar o trabalho ---
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'import/no-unresolved': 'off', // aliases `@/` sao resolvidos pelo babel/metro
    },
  },

  {
    // `no-undef` DESLIGADO em TypeScript, por recomendacao do proprio
    // typescript-eslint: o compilador ja apanha identificadores inexistentes, e
    // o ESLint nao ve tipos. Aqui acusava `React` em ficheiros que usam
    // `React.ReactNode` so como TIPO, sem importar o React — legitimo com
    // `jsx: react-jsx`, e algo que o `tsc` valida melhor do que qualquer regra
    // de lint.
    //
    // Fica ligado nos `.js`, onde continua a ser a unica rede.
    files: ['**/*.{ts,tsx}'],
    rules: { 'no-undef': 'off' },
  },

  {
    // Ficheiros de config e scripts correm em Node (CommonJS).
    files: ['*.config.js', '*.config.ts', 'scripts/**', 'plugins/**', 'modules/**/*.config.js', 'index.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', module: 'writable', require: 'readonly', process: 'readonly' },
    },
  },

  {
    files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
];
