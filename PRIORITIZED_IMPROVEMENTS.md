# Plano de melhoria priorizado — App Cliente Piquet

> ## ✅ ESTADO: a maioria destas ações JÁ FOI EXECUTADA (2026-08-03)
>
> Depois desta auditoria foram aplicadas 6 vagas de correções, todas com
> `tsc` a 0 erros, `jest` verde e verificação no simulador. Ver commits
> `cf5c619` → `ece1146` na branch `feat/build-15-features`.
>
> | Vaga | Âmbito | Estado |
> |---|---|---|
> | A | SEC-01 (fuga de tickets) e SEC-02 (TLS do websocket) | ✅ SEC-01 **fechado e verificado em produção**; SEC-02 configurável (espera servidor) |
> | B | Contraste (138 usos) e texto aumentado | ✅ feito e verificado no simulador |
> | C | 404, deep link inválido, offline, erro≠vazio | ✅ feito e verificado no simulador |
> | D | Sessão/refresh, login silencioso, eliminar conta OTP, push, 115 chaves de copy | ✅ feito |
> | E | 18 achados de pagamentos (verificados um a um antes de corrigir) | ✅ 14 confirmados + 4 parciais corrigidos |
>
> **Continua por fazer** (precisa de decisão ou de backend):
> - Ativar o TLS do websocket — exige que o servidor Reverb sirva `wss` (mudança coordenada).
> - Endpoint de remoção de dispositivo no logout — pendência #10 em `BACKEND_PENDENCIAS.md`.
> - Chave de idempotência no abrir-serviço (PAY-03) — exige alteração no Laravel.
> - Reativar o Sentry (hoje não há captura de erros em produção).
> - Suite de testes automatizados — ver `AUTOMATED_TEST_PLAN.md`.
> - Dados fabricados (4.8, "Poupa 25%", "Recomendado") — mantidos por decisão de produto.

Derivado da auditoria de 2026-08-03 (169 achados). A ordem reflete **impacto real
no cliente e no negócio**, não a gravidade nominal.

> **Nota de calibração:** dos achados graves submetidos a verificação adversarial,
> **13 em 13 foram despromovidos** (nenhum se confirmou na severidade proposta). Os
> achados marcados ⚠️ **não foram verificados** e podem estar igualmente inflacionados —
> confirmar antes de agir. Os marcados ✅ foram verificados por mim, com execução real.

---

## 1. Correções críticas (fazer já)

Estas envolvem **dinheiro, dados pessoais ou exclusão de utilizadores**.

| # | Ação | Achado | Verificado | Esforço |
|---|---|---|---|---|
| 1 | **Fechar a leitura pública de tickets de suporte** — exigir autenticação e deixar de aceitar IDs arbitrários no `?ids=` | SEC-01 | ✅ **confirmado ao vivo** (li um ticket da internet sem credenciais) | pequeno |
| 2 | **Ativar TLS no websocket** (`forceTLS: false`, porta 8080) — chat e GPS viajam em claro | SEC-02 | ✅ confirmado no código | pequeno |
| 3 | **Corrigir o layout com texto aumentado** — hoje a Home fica inutilizável (grelha sai do ecrã) | A11Y/E-06 | ✅ **confirmado ao vivo** | médio |
| 4 | **Escurecer `gray_medium`** (falha AA em 138 usos) e tirar branco sobre âmbar (1,70:1) | A11Y-01/02 | ✅ contraste calculado | pequeno |
| 5 | **Permitir eliminar conta a quem entrou por OTP** (hoje exige palavra-passe que nunca definiu) | AUTH-07 | ✅ verificado (severidade mantida) | médio |
| 6 | Rever polling/duplo-pagamento MB Way na 2.ª reserva da sessão | PAY-01/02/03 | ⚠️ **não verificado** | médio |
| 7 | Desassociar o token de push no logout (notificações da conta anterior) | NOTIF-01 | ⚠️ não verificado | pequeno |
| 8 | Corrigir leave+rejoin do canal em tempo real a cada ping de GPS | RT-01 | ⚠️ não verificado | médio |

---

## 2. Quick wins (esforço pequeno, ganho imediato)

92 achados de esforço pequeno com severidade média ou superior. Os 15 de maior retorno:

| # | Ação | Achado | Ficheiro |
|---|---|---|---|
| 1 | gray_medium #858585 — cor de todo o texto secundário da app — falha WCAG AA (3,69:1 sobre branc | A11Y-01 | `constants/Colors.ts:13 (definição); 193 ocorrências em ` |
| 2 | Preço e etiqueta de poupança em âmbar sobre fundo claro: 1,70:1 e 1,53:1 — informação comercial | A11Y-02 | `app/(app)/(tabs)/list/index.tsx:434-438; components/app` |
| 3 | Segunda reserva MB Way da sessão nunca confirma: o ecrã de espera não faz polling se já existir | PAY-01 | `app/(app)/(modals)/(services)/(request)/checkout/mb-way` |
| 4 | Janela real de duplo pagamento MB Way: overlay fechado e lock libertado 1 segundo antes de nave | PAY-02 | `app/(app)/(modals)/(services)/(request)/checkout/[servi` |
| 5 | Canal de tempo real faz leave+rejoin a cada atualização de localização — eventos perdidos | RT-01 | `contexts/ServiceContext.tsx:176-190 (efeito) + :449-451` |
| 6 | Websocket de tempo real configurado sem TLS (ws:// na porta 8080) — chat e dados de serviço em  | SEC-02 | `hooks/echo.ts:24-28` |
| 7 | Contagem decrescente do pedido imediato é de 60 segundos e, ao chegar a 0, o cliente fica preso | WAIT-01 | `components/Timer.tsx:17 e app/(app)/(modals)/(services)` |
| 8 | Dados de faturação exigem um nome com exatamente duas palavras — bloqueia a maioria dos nomes p | FAT-01 | `app/(app)/(modals)/(payments)/invoice-data/index.tsx:21` |
| 9 | É possível confirmar o pagamento sem que o preço alguma vez tenha sido mostrado | PAY-04 | `app/(app)/(modals)/(services)/(request)/checkout/[servi` |
| 10 | MB WAY: o polling do estado do pagamento pode nunca arrancar e o cliente fica preso no ecrã de  | PERF-02 | `contexts/ServiceContext.tsx:532-563` |
| 11 | Guardar Perfil salta a validação do formulário e falha em silêncio; o catch pode rebentar em er | PROF-01 | `app/(app)/(modals)/(profile)/edit-profile/index.tsx:131` |
| 12 | Dados pessoais completos (email, telefone e morada de cliente e técnico) escritos em console.lo | SEC-03 | `contexts/ServiceContext.tsx:246` |
| 13 | Analytics silenciosamente desligada: EXPO_PUBLIC_MIXPANEL_TOKEN não está definido em nenhum fic | ANL-01 | `services/MixpanelService.ts:2,8-10` |
| 14 | Convidado com cesto que passa pela morada perde o cesto inteiro: sai para um único serviço e o  | CART-01 | `app/(app)/(modals)/(services)/(request)/address/guest/i` |
| 15 | Chat ignora o parâmetro de rota [serviceId] e nunca se recompõe se openService chegar depois | CHAT-01 | `app/(app)/(pages)/(services)/(open)/(chat)/service/[ser` |

Além destes, três correções que observei ao vivo e são triviais:

| # | Ação | Porquê |
|---|---|---|
| A | **Criar `app/+not-found.tsx`** | Hoje um link inválido mostra o ecrã cru do Expo Router, em inglês, com "Sitemap" |
| B | **Tratar o deep link para serviço inválido** | Hoje fica em "A carregar…" para sempre |
| C | **Usar `insets` na `TabBar`** (já é obtido e ignorado) + rótulos em todos os separadores | Rótulos cortados; 4 dos 5 separadores anónimos para leitores de ecrã |

---

## 3. Antes do próximo lançamento

| Tema | Ação | Achados |
|---|---|---|
| **Linguagem de erro** | Criar um padrão único: estado de erro distinto do vazio + "Tentar novamente" em todas as listas. Nunca dizer "não há serviços na tua zona" quando falhou a rede | E-05, D2-01, D2-02, D2-05 |
| **Offline** | Elevar o `NetInfo` (já é dependência) a provider global + faixa de aviso | E-04 |
| **Sessão** | Fazer o `SessionContext` usar o cliente `api` com refresh, em vez de `axios` cru | AUTH-01 |
| **Login** | Mostrar erro quando a password está errada ou não há rede (hoje falha em silêncio) | AUTH-03 |
| **Confiança** | Dizer o que acontece ao dinheiro quando o técnico recusa/não responde | WAIT-02 |
| **Coerência** | Alinhar o tempo de espera real (60 s) com as copies ("20 minutos") | WAIT-01 |
| **Crash reporting** | Reativar o Sentry (está totalmente comentado — hoje não há visibilidade nenhuma de erros em produção) | OBS-* |

---

## 4. Médio prazo

- Consolidar o design system (tokens, um só padrão de cartão/botão/input).
- Adicionar `RefreshControl` a todas as listas.
- Plano de eventos de analytics coerente (nomes duplicados entre contextos diferentes).
- Guard de autenticação explícito + componente `GuestGate` reutilizável.
- Suite de testes automatizados (ver `AUTOMATED_TEST_PLAN.md`) — começar pelo dinheiro.

## 5. Refatorações estruturais

- `useEcho` como singleton (hoje abre uma ligação por componente; 6 chamadas).
- Partir o `ServiceContext` (679 linhas) — hoje qualquer ping de GPS re-renderiza todos os consumidores.
- Partir o `checkout/[serviceId].tsx` (1879 linhas) em componentes testáveis.
- Centralizar a extração de mensagens de erro do axios (hoje reimplementada em cada ecrã).

---

## Matriz impacto × esforço

```
            ESFORÇO PEQUENO         ESFORÇO MÉDIO           ESFORÇO GRANDE
          ┌───────────────────────┬───────────────────────┬──────────────────────┐
IMPACTO   │ ✦ TLS no websocket    │ ✦ Texto aumentado     │ ✦ Suite de testes    │
ALTO      │ ✦ Fechar tickets      │ ✦ Eliminar conta OTP  │ ✦ Refatorar checkout │
          │ ✦ Contraste de cor    │ ✦ Sessão/refresh      │ ✦ useEcho singleton  │
          │ ✦ Ecrã 404            │ ✦ Linguagem de erro   │                      │
          │ ✦ Push no logout      │ ✦ Aviso de offline    │                      │
          ├───────────────────────┼───────────────────────┼──────────────────────┤
IMPACTO   │ ✦ TabBar (insets)     │ ✦ RefreshControl      │ ✦ Design system      │
MÉDIO     │ ✦ Copy do timeout     │ ✦ Guard de auth       │ ✦ Partir ServiceCtx  │
          │ ✦ console.log         │ ✦ Analytics           │                      │
          └───────────────────────┴───────────────────────┴──────────────────────┘
```

---

## Top 20 ações prioritárias

| # | Ação | Porquê agora | Achado |
|---|---|---|---|
| 1 | Fechar leitura pública de tickets de suporte | Fuga de dados pessoais explorável **hoje**, sem credenciais | SEC-01 ✅ |
| 2 | Ativar TLS no websocket | Chat e localização em claro | SEC-02 ✅ |
| 3 | Corrigir layout com texto aumentado | Exclui utilizadores com baixa visão; risco de conformidade | E-06 ✅ |
| 4 | Escurecer `gray_medium` / tirar branco sobre âmbar | 138 usos abaixo do mínimo legal de contraste | A11Y-01 ✅ |
| 5 | Eliminar conta sem palavra-passe (OTP) | Bloqueia direito RGPD + risco na App Store | AUTH-07 ✅ |
| 6 | Verificar e corrigir duplo pagamento MB Way | Dinheiro do cliente | PAY-02 ⚠️ |
| 7 | Ecrã 404 próprio | Link inválido mostra ecrã de developer em inglês | E-02 ✅ |
| 8 | Deep link de serviço inválido sem saída | Beco sem saída permanente | E-03 ✅ |
| 9 | Erro ≠ vazio nas listas + "Tentar novamente" | Hoje mente ao cliente sobre a cobertura da zona | E-05 ✅ |
| 10 | Aviso de falta de ligação | App finge normalidade total sem rede | E-04 ✅ |
| 11 | Sessão: usar `api` com refresh | Logins perdidos sem motivo | AUTH-01 ✅ |
| 12 | Login: mostrar erro de password/rede | Hoje o botão não faz nada | AUTH-03 ✅ |
| 13 | Reativar o Sentry | Zero visibilidade de erros em produção | OBS ⚠️ |
| 14 | Push token no logout | Notificações da conta anterior | NOTIF-01 ⚠️ |
| 15 | Canal de tempo real (leave/rejoin) | Eventos perdidos durante o serviço | RT-01 ⚠️ |
| 16 | Copy: dinheiro no timeout/recusa | Momento de maior ansiedade do funil | WAIT-02 ✅ |
| 17 | Alinhar 60 s vs "20 minutos" | Expectativa traída | WAIT-01 ⚠️ |
| 18 | `TabBar`: insets + rótulos + a11y | Rótulos cortados, separadores anónimos | E-09 ✅ |
| 19 | Testes automatizados do dinheiro | Zero testes numa app que cobra | — |
| 20 | `RefreshControl` nas listas | Única saída hoje é matar a app | D2-01 ⚠️ |
