# Setup local — app-costumer (iOS, simulador)

Ver primeiro o `SETUP.md` da `app-vendor` — os problemas de Xcode 16.3+ (`fmt`/consteval) e a lógica de `.env.local`/`APP_ENV` são exatamente os mesmos aqui. Este documento cobre só o que é diferente nesta app.

## ⚠️ Este projeto usa `yarn`, não `npm`

Há um `yarn.lock` versionado no repositório — é a fonte de verdade. Se instalares com `npm install`, o `npm` resolve dependências de forma diferente e podes acabar com pacotes em falta (já aconteceu: `expo-asset` ficou de fora e o Metro rebentava com "The required package `expo-asset` cannot be found").

```bash
npm install -g yarn   # se ainda não tiveres
yarn install
npx expo run:ios
```

Se em algum momento misturares `npm` e `yarn` sem querer (fica um `package-lock.json` a mais), apaga o `package-lock.json` — não deve ir para o repositório, só o `yarn.lock`.

## Se trocares de gestor de pacotes a meio (reinstalar node_modules)

Se apagares `node_modules` e reinstalares depois de já teres corrido `pod install` uma vez, o codegen do React Native (ficheiros gerados automaticamente dentro de `node_modules/react-native/...` durante o `pod install`) fica desatualizado e o build falha com algo como:
```
Build input file cannot be found: '.../RCTThirdPartyFabricComponentsProvider.mm'
```
Corrige só com `pod install` outra vez (não precisas de `expo prebuild --clean`, que apagaria a correção do `fmt` no `Podfile`):
```bash
cd ios && pod install && cd ..
npx expo run:ios
```

## `fmt`/consteval (Xcode 16.3+)

Mesma correção da `app-vendor` — ver o `SETUP.md` de lá para o snippet exato a adicionar ao `post_install` do `Podfile` (gerado, não é permanente).

## `expo-localization` — já corrigido

Igual à `app-vendor`, já versionado via `patch-package` (`patches/expo-localization+16.0.1.patch`), corre automático no `yarn install`.

## `.env.local`

Por defeito vem configurado a apontar para produção (`app.piquetapp.com`). Se quiseres testar contra o backend local, muda para o mesmo formato da `app-vendor`:
```
EXPO_PUBLIC_DEV_API_DOMAIN=127.0.0.1:8000
EXPO_PUBLIC_DEV_API_PROTOCOL=http://
APP_ENV=development
```
(a chave exata pode ter nome diferente nesta app — confirma em `app.config.ts` qual variável de ambiente ele lê antes de assumir que é igual à app-vendor.)

## Sentry (telemetria de erros) — desligado por defeito

O código está ligado mas **só arranca quando o DSN estiver em env**, e nunca em `__DEV__`. Sem DSN é um no-op — não envia nada. Isto é de propósito: o DSN que estava no repo aponta para um org `testiong` que precisa de ser confirmado como sendo da Piquet antes de se enviar erros de produção para lá.

Para ativar (depois de confirmar o projeto no Sentry.io):
```
EXPO_PUBLIC_SENTRY_DSN=<dsn do projeto Piquet>   # runtime: liga o reporte de erros
SENTRY_ORG=<org slug>                            # só p/ upload de source maps no build EAS
SENTRY_PROJECT=<project slug>                     # idem
SENTRY_AUTH_TOKEN=<token>                         # idem (já existe nos .env)
```
Config atual: **só erros** — `sendDefaultPii: false` e **sem Session Replay** (decisão de RGPD). Para capturar PII ou gravação de ecrãs é preciso base legal/consentimento; mexe-se em `app/_layout.tsx` (bloco `Sentry.init`).
