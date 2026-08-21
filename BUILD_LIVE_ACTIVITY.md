# Live Activity do serviço em curso (iOS) — o que falta para ficar a funcionar

Mostra no ecrã bloqueado / Dynamic Island: **técnico**, **tipo de serviço** e
**quanto falta** (contagem decrescente), enquanto o serviço decorre no local.

## O que JÁ está feito e verificado (compila, testes passam)

- `utils/serviceCountdown.ts` — calcula o fim estimado (`arrived_at + duração`) e
  o "quanto falta". **É estimativa**, não promessa (o trabalho pode passar disso;
  conta para zero e fica lá). 15 testes em `utils/__tests__/serviceCountdown-test.ts`.
- `modules/live-activity/index.ts` — costura JS com **fallback seguro**: sem o
  módulo nativo (Android, Expo Go, build sem plugin) tudo são no-ops.
- `contexts/ServiceContext.tsx` — liga a atividade quando o técnico chega
  (`status = ARRIVED`) e termina-a quando o serviço acaba/cancela/desaparece.
- `plugins/withLiveActivity.js` (registado em `app.config.ts`) — mete
  `NSSupportsLiveActivities` no Info.plist no prebuild.
- Swift pronto: `modules/live-activity/ios/*.swift` (módulo + atributos) e
  `targets/PiquetServiceWidget/PiquetServiceLiveActivity.swift` (a UI).

## O que FALTA — e porque não o fiz aqui

A **Widget Extension** (o target de Xcode que desenha a atividade) tem de ser
criada. Gerar um target por manipulação do `.pbxproj` num config plugin é frágil
e **não o consigo verificar sem um Mac com Xcode** — preferi não entregar código
de build que não vi compilar. Passos, numa máquina com Xcode:

1. **Prebuild:** `npx expo prebuild -p ios` (gera `ios/`, aplica a flag do plist).
2. **Criar a extensão:** no Xcode, File ▸ New ▸ Target ▸ **Widget Extension**
   (nome `PiquetServiceWidget`, "Include Live Activity" ✓, embed na app Piquet).
   - Alternativa reproduzível: `npx create-target widget` (`@bacons/apple-targets`),
     que gera o target a partir de `targets/PiquetServiceWidget/`.
3. **Ficheiros no target certo:**
   - `PiquetServiceLiveActivity.swift` → só o target da extensão.
   - `PiquetServiceAttributes.swift` → **membro dos DOIS targets** (app + extensão):
     o módulo arranca a atividade, o widget desenha-a, ambos precisam do contrato.
4. **Build de dev num dispositivo/simulador iOS 16.2+** (Live Activities não
   funcionam em Expo Go): `npx expo run:ios`.

## Como testar (sem depender de um serviço real a decorrer)

O gatilho é `status = 'Arrived'` com `arrived_at` e `service_type.time` presentes.
Para forçar em desenvolvimento, semear um `openService` nesse estado (ou apontar
a um serviço de teste no backend com o técnico já "chegado"). Esperado:
- atividade aparece no ecrã bloqueado com o nome do técnico e o serviço;
- a contagem desce sozinha (o iOS tica `Text(style:.timer)`, sem pushes);
- ao concluir/cancelar o serviço, a atividade desaparece.

## Nota de honestidade

Toda a parte JS/Swift está escrita e a parte JS está testada, mas **a atividade
nunca foi vista a correr** — falta o target e um dispositivo. O Swift pode
precisar de pequenos acertos ao compilar pela primeira vez.

---

# Android — notificação persistente com cronómetro

O Android não tem Live Activity; o equivalente é uma **notificação ongoing** com
**cronómetro regressivo** no ecrã bloqueado. Já está escrito:

- `modules/live-activity/android/.../LiveActivityModule.kt` — mesma interface do
  iOS (start/update/end/isSupported). Usa `setUsesChronometer(true)` +
  `setChronometerCountDown(true)` + `setWhen(fim)`: o Android conta sozinho até
  ao instante de fim, sem a app acordar.
- `modules/live-activity/expo-module.config.json` — declara o módulo Android; a
  autolinking do Expo liga-o no prebuild (não precisa de config plugin).
- A costura JS (`modules/live-activity/index.ts`) já é multiplataforma.

## O que falta para o ver a correr

1. `npx expo prebuild -p android` + `npx expo run:android` (dev build; Expo Go
   não carrega módulos locais nativos).
2. **Permissão de notificações:** em Android 13+ o utilizador tem de conceder
   POST_NOTIFICATIONS (já pedida pelo fluxo do expo-notifications).

## Limitações honestas (Android)

- É uma notificação **ongoing**, não um *foreground service*. O sistema pode
  removê-la em pressão de memória extrema. Para um serviço que dura ~1–2h chega,
  mas se for preciso garantia total, promover a foreground service (mais
  permissões e um serviço nativo).
- O `setChronometerCountDown` conta até `setWhen`; passado esse instante mostra
  tempo negativo em algumas versões. Emitir um `update`/`end` ao chegar a zero
  evita-o — o efeito de ciclo de vida no ServiceContext termina a atividade
  quando o serviço fecha, mas se ficar em execução para lá da estimativa isto
  fica por afinar.

## Estado (Android)

Código escrito, **nunca compilado nem visto a correr** — falta o prebuild e um
dispositivo/emulador. O Kotlin pode precisar de pequenos acertos ao compilar.
