# Auditoria completa — App Cliente Piquet

**Data:** 3 de agosto de 2026 · **Âmbito:** app cliente (`app-costumer`), branch `feat/build-15-features`
**Método:** análise estática exaustiva (9 auditores especializados) + verificação adversarial + execução real em simulador

---

# A. Resumo executivo

## Estado geral

A app está **funcionalmente completa e visualmente bem resolvida no caminho feliz**. Os
ecrãs redesenhados recentemente — checkout, cesto, avaliação, histórico, perfil — têm
qualidade real, e o núcleo de pagamento mostra sinais claros de já ter sido endurecido
contra incidentes concretos (lock anti-duplo-submit, watchdog, reconciliação 3DS, rascunho
reidratável).

O problema está **fora do caminho feliz**: no que acontece quando a rede falha, quando o
utilizador não é o caso ideal, e na **acessibilidade**, que não foi considerada.

## Pontos positivos (a preservar)

- **Pagamentos**: a aritmética de dinheiro está correta em todo o lado (a armadilha
  histórica `starts_from` euros vs cêntimos está resolvida nos 5 sítios onde aparece).
- **Token de sessão em SecureStore** (keychain), não em armazenamento simples.
- **Cifragem**: cartão cifrado com RSA antes de sair do dispositivo; mensagens de chat
  cifradas com a chave pública do serviço.
- **Consentimento RGPD** implementado ao nível do serviço, não só da UI.
- **Estados vazios da pesquisa** e **ecrã de espera MB Way**: acima da média do mercado.
- **`schedule-service.tsx`** é um ecrã exemplar de acessibilidade — prova que a equipa
  sabe fazê-lo; falta replicar.

## Principais riscos

1. **Fuga de dados pessoais explorável hoje** — os tickets de suporte são legíveis da
   internet pública, sem credenciais, por enumeração de IDs sequenciais. **Confirmado por
   mim, com um pedido real.**
2. **Chat e localização GPS sem TLS** (`forceTLS: false`, porta 8080).
3. **A app é inutilizável com o texto do sistema aumentado** — a grelha de categorias sai
   do ecrã. Exclui utilizadores com baixa visão, que são parte relevante do público de um
   serviço ao domicílio.
4. **Não há linguagem de erro**: sem rede, a app finge normalidade e, quando falha, chega
   a dizer ao cliente que **a zona dele não é servida** — o que é falso e gera desinstalações.
5. **Zero testes automatizados** numa app que cobra dinheiro real.
6. **Zero visibilidade de erros em produção** — o Sentry está integralmente comentado.

## Oportunidades de maior impacto

| Oportunidade | Porquê |
|---|---|
| Linguagem de erro consistente (erro ≠ vazio + "Tentar novamente") | Converte abandonos silenciosos em recuperações |
| Fechar o ciclo de confiança à volta do dinheiro | O cliente paga antes de ter técnico; a app cala-se se ninguém aceitar |
| Acessibilidade (contraste + texto aumentado) | Desbloqueia um segmento inteiro de clientes |
| Testes do fluxo de dinheiro | Rede de segurança para poder mexer no checkout sem medo |

## Avaliação global

**6,5 / 10**

Uma app com boa base de produto e identidade visual sólida, penalizada por três lacunas
transversais: resiliência a falhas, acessibilidade e ausência de rede de segurança
(testes + observabilidade). Nenhuma delas exige reescrever nada — são correções
localizadas e, na maioria, de esforço pequeno.

---

# B. Cobertura da auditoria

## O que foi analisado

- **57 ecrãs** (85 ficheiros `.tsx` em `app/`, dos quais 28 são layouts), **62 componentes**,
  **12 contexts**, **10 hooks**, **75 rotas de API**, **~973 chaves de tradução**.
- Arquitetura, navegação, gestão de estado, autenticação, push, deep links, analytics,
  tratamento de erros, variáveis de ambiente, permissões, código morto.

## O que foi efetivamente executado (simulador)

12 cenários corridos ao vivo, com evidência em imagem — ver `QA_TEST_MATRIX.md` secção A.
Os achados assinalados ✅ nesta auditoria foram **observados**, não inferidos.

## O que NÃO foi possível testar (limitações honestas)

| Não testado | Motivo |
|---|---|
| Pagamento real (cartão / MB Way) ponta a ponta | Exige cartão real e conta autenticada; **não executo pagamentos** |
| Fluxo completo com sessão autenticada | Não tenho credenciais de teste |
| Serviço em curso, chat, mapa, avaliação | Exigem um serviço real com técnico atribuído |
| Notificações push | Exigem dispositivo físico (simulador não recebe push) |
| Ecrãs pequenos (iPhone SE) e Android | Só estava disponível iPhone 17 Pro Max |
| Comportamento sob rede lenta (não ausente) | Testei ausência total, não degradação |

## ⚠️ Limitação metodológica importante

A auditoria produziu **169 achados**, dos quais 140 marcados como "confirmados" pelos
auditores. Submeti os mais graves a **verificação adversarial** (um segundo agente a tentar
refutá-los lendo o código).

**Resultado: 13 em 13 verificados foram despromovidos.** Nenhum sobreviveu na severidade
proposta. Os auditores descreveram mecanismos corretos mas **inflacionaram sistematicamente
a gravidade e as consequências**.

**Consequência prática:** os achados desta auditoria **não verificados** (incluindo 8 dos
10 marcados como "críticos") devem ser tratados como **hipóteses a confirmar**, não como
factos. Os que verifiquei pessoalmente estão marcados ✅ e esses, sim, são factos.

A verificação dos achados de **pagamentos** (PAY-01 a PAY-05, CHECKOUT-01, CART-01) **não
chegou a correr** por limite de sessão — precisamente o domínio mais crítico. Recomendo
verificá-los antes de agir.

## Ambiente

iPhone 17 Pro Max · iOS 26.4 (simulador) · build de desenvolvimento · Metro :8082 ·
backend de **produção** (`app.piquetapp.com`) · sessão de **convidado** ·
repositório limpo (auditoria não alterou código).

---

# C. Inventário da aplicação

| Categoria | Qtd. | Notas |
|---|---:|---|
| Ecrãs (rotas) | 57 | + 28 ficheiros de layout |
| — Autenticação / entrada | 8 | splash, onboarding, login, registo, recuperar, reset, OTP, completar perfil |
| — Tabs | 7 | Home, Serviços, Cesto, Histórico, Conta (+ sub-rotas de Home) |
| — Modais | 22 | checkout, seleção de serviço/técnico, morada, agendamento, notificações, suporte, zona bloqueada… |
| — Bottom sheets | 5 | avaliação, detalhes, método de pagamento, falha, pedido de extra |
| — Páginas | 15 | serviço em curso (overview/progress/status/chegou/cancelar/fechar/chat), histórico, pagamentos, definições |
| Componentes | 62 | `Custom*` (design system), cartões de serviço, TabBar, avisos |
| Contexts | 12 | Api, Session, GuestSession, Service, Cart, Wallet, Schedule, Dialog, Notifications, Mixpanel, Campaign, AppState |
| Hooks | 10 | echo (websocket), useStorageState, useLocationFill, geolocalização… |
| Rotas de API | 75 | auth (13), guest (13), common (8), serviços (22), pagamentos (5), chat (3), outros |
| Chaves i18n | ~973 | pt_PT + en_US |
| **Testes automatizados** | **0** | nenhum ficheiro `.test.*` / `.spec.*` |

### Fluxos identificados

1. Onboarding → registo/login (email ou OTP) · 2. Navegação como convidado ·
3. Descoberta (categorias / pesquisa) · 4. Pedido imediato · 5. Agendamento ·
6. Cesto multi-serviço · 7. Checkout (cartão / MB Way / voucher / NIF) ·
8. Espera de aceitação · 9. Serviço em curso (mapa, chat, extras) · 10. Conclusão e avaliação ·
11. Histórico e faturas · 12. Perfil, moradas, pagamentos, faturação · 13. Suporte ·
14. Notificações e deep links · 15. Eliminação de conta

---

# D. Resultados dos testes

Ver **`QA_TEST_MATRIX.md`** para a matriz completa (execução ao vivo, cenários por tipo
de utilizador, cobertura por fluxo).

**Resumo:** 12 cenários executados ao vivo — **11 falharam**, 1 não aplicável.

---

# E. Problemas encontrados

**169 achados**: 10 críticos · 44 altos · 88 médios · 27 baixos.

> Ler com a limitação metodológica da secção B em mente: ✅ = verificado por mim;
> os restantes são hipóteses dos auditores, possivelmente inflacionadas.

## E.1 · Achados observados em execução (evidência direta)

Estes foram vistos a correr a app. São factos.

Ambiente: build de desenvolvimento, Metro na porta 8082, backend de produção
(`app.piquetapp.com`, conforme `.env.local`), sessão de convidado (sem login).

---

## EXEC-01 — Deep link para serviço inválido fica em "A carregar…" para sempre
**Severidade:** Alto · **Prioridade:** P1 · **Tipo:** CONFIRMADO (execução + código)

**Passos:** `xcrun simctl openurl booted "piquet.customer:///(app)/(pages)/(services)/(open)/overview/999999"`

**Observado:** o ecrã abre com o cabeçalho "Serviço" e um spinner com "A carregar…"
que **nunca termina**. Sem timeout, sem mensagem de erro, sem retry. O único caminho
de saída é o botão de voltar.

**Causa (confirmada no código):** `app/(app)/(pages)/(services)/(open)/overview/[serviceId].tsx:39-61`
faz `if (!openService?.id) return <loading/>` — um guard incondicional. Não usa o
`serviceId` do URL para ir buscar o serviço, nem distingue "ainda a carregar" de
"este serviço não existe / não é meu". Foi introduzido para evitar um crash anterior
(navegação para `/progress/undefined`), mas trocou um crash por um beco sem saída.

**Solução:** usar o `serviceId` do URL para fazer `GET /customer/services/{id}`; enquanto
o pedido corre, mostrar o loading; em 404/403 mostrar "Não encontrámos este serviço"
com CTA para o histórico; em falha de rede, mensagem + "Tentar novamente".

---

## EXEC-02 — Rota inválida mostra o ecrã de erro cru do Expo Router (em inglês, com Sitemap)
**Severidade:** Alto · **Prioridade:** P1 · **Tipo:** CONFIRMADO (execução + código)

**Passos:** `xcrun simctl openurl booted "piquet.customer:///rota/que/nao/existe"`

**Observado:** ecrã preto de developer com **"Unmatched Route / Page could not be found."**
em **inglês**, o URL cru visível, e dois links: "Go back" e **"Sitemap"** — este último é
uma ferramenta de programador que lista toda a estrutura de rotas da app.

**Causa (confirmada):** não existe nenhum `+not-found.tsx` no projeto (`find app -iname "+not-found*"`
não devolve nada), pelo que o Expo Router cai no seu ecrã por omissão.

**Impacto:** qualquer link mal formado (campanha de notificações, email, QR, link partilhado,
versão antiga da app com rotas diferentes) leva o cliente a um ecrã que parece um erro grave
da aplicação, quebra a marca e expõe a estrutura interna.

**Solução:** criar `app/+not-found.tsx` no tema da app (creme/âmbar), em PT-PT, com mensagem
tipo "Não encontrámos esta página" e um botão único "Voltar ao início" → `/(app)/(tabs)/home`.

---

## EXEC-03 — Arranque bloqueia se o Metro não estiver na porta esperada (só dev)
**Severidade:** Baixo (só afeta programadores) · **Prioridade:** P3 · **Tipo:** CONFIRMADO

**Observado:** a app instalada procura o packager em `localhost:8082`; com o Metro na 8081
(porta por omissão do `npx expo start`) a app fica **presa no splash âmbar indefinidamente**,
sem qualquer mensagem. O log do sistema mostra `Connection refused` em `:8082`.

**Nota:** não afeta clientes (builds de produção têm o JS embutido). Fica registado porque
custou tempo de diagnóstico e vale a pena documentar no README ("correr `npx expo start --port 8082`
para o binário atualmente instalado").

---

## EXEC-04 — Sem ligação à API, a Home finge normalidade total
**Severidade:** Alto · **Prioridade:** P1 · **Tipo:** CONFIRMADO (execução)

**Passos:** apontar a API para um host inalcançável (`127.0.0.1:9`), reiniciar a app.

**Observado:** a Home carrega **exatamente igual** ao estado normal — grelha completa de
categorias, "Agendamentos · 0 serviços · Hoje: 0", "★ 4.8 · +5000 serviços executados".
**Nada** indica falta de ligação. As categorias vêm da cache local
(`piquet_operation_areas_v1`, `contexts/ServiceContext.tsx`), o que reforça a ilusão de
que está tudo bem. O cliente só descobre o problema quando toca em algo e falha.

**Impacto:** o cliente perde tempo e confiança a navegar num estado morto; num serviço
urgente (canalização a inundar) isto é particularmente mau.

**Solução:** o `@react-native-community/netinfo` **já é uma dependência do projeto** (hoje
usado só em `hooks/echo.ts:6` para o websocket). Elevar a um provider global e mostrar uma
faixa persistente não bloqueante no topo ("Sem ligação à internet — os dados podem estar
desatualizados"), e desativar os CTAs que exigem rede.

---

## EXEC-05 — Erro de rede é apresentado como "não há serviços nesta zona" (mensagem falsa)
**Severidade:** Alto · **Prioridade:** P1 · **Tipo:** CONFIRMADO (execução)

**Passos:** com a API inalcançável, abrir uma categoria (`select-service-type/1`).

**Observado:** o ecrã mostra **duas mensagens contraditórias em simultâneo**:
1. "Não há serviços disponíveis para esta área de operação." (cinzento)
2. "Ocorreu um erro, por favor tente novamente" (vermelho)

A primeira **culpa a zona do cliente** por um problema que é de rede — é factualmente
falsa e pode levá-lo a concluir que a Piquet não serve a sua área e a desistir. Não há
botão de "Tentar novamente" (o texto pede uma ação que não existe), nem indicação de
falta de rede.

**Causa provável:** o ecrã trata o estado de lista vazia como "sem serviços na área" sem
distinguir da falha de carregamento, e renderiza ambos os blocos ao mesmo tempo.

**Solução:** distinguir três estados no ecrã de categoria — (a) a carregar, (b) carregou e
está genuinamente vazio → "Ainda não temos serviços nesta categoria", (c) falhou →
"Não foi possível carregar. Verifica a ligação." + botão "Tentar novamente". Nunca mostrar
(b) e (c) ao mesmo tempo. Este padrão de "vazio == erro" deve ser procurado nos restantes
ecrãs de lista.

---

## EXEC-06 — Barra de navegação: safe area ignorada, rótulos em falta, a11y ausente
**Severidade:** Médio · **Prioridade:** P1 · **Tipo:** CONFIRMADO (execução + código)
**Ficheiro:** `components/TabBar.tsx`

Quatro defeitos no mesmo componente, todos visíveis nos screenshots capturados:

1. **`insets` obtido mas nunca usado** (`TabBar.tsx:10` chama `useSafeAreaInsets()`; `insets`
   não aparece mais nenhuma vez no ficheiro). A altura é fixa (`h-24`) e a barra não respeita
   a home indicator — nos screenshots os rótulos "Início/Serviços/Cesto/Histórico/Conta"
   aparecem **cortados na margem inferior**.
2. **Só o separador do Cesto tem rótulo de texto.** Os outros quatro renderizam apenas o ícone
   (`TabBar.tsx:128-146` devolve só `icon(...)`), apesar de os títulos existirem e estarem
   traduzidos em `(tabs)/_layout.tsx:50-108` (`tabs.home`, `tabs.services`, …).
3. **`accessibilityLabel={options.tabBarAccessibilityLabel}`** — `tabBarAccessibilityLabel`
   **não está definido em lado nenhum** da app (grep sem resultados), logo os separadores ficam
   sem nome para leitores de ecrã. Combinado com (2), quatro dos cinco separadores são
   completamente anónimos para um utilizador com VoiceOver.
4. **"Histórico" sem sessão fica a 50% de opacidade mas continua clicável**
   (`TabBar.tsx:141`: `opacity: ... && !session ? 0.5 : 1`, sem `disabled`). Parece desativado
   mas reage ao toque — afordância enganadora.

**Solução:** usar `insets.bottom` no `paddingBottom` do contentor; renderizar o `label` em todos
os separadores (o código já o calcula em `TabBar.tsx:39-45` e depois descarta-o nos não-Cesto);
passar `accessibilityLabel={label}`; e ou desativar mesmo o separador sem sessão (`disabled` +
`accessibilityState.disabled`) ou deixá-lo ativo a levar ao login.

---

## EXEC-07 — Contraste: `gray_medium` falha AA e é usado 138 vezes
**Severidade:** Alto (acessibilidade) · **Prioridade:** P1 · **Tipo:** CONFIRMADO (cálculo WCAG)

Rácios calculados (fórmula WCAG 2.1 de luminância relativa):

| Par de cores | Rácio | AA texto (4.5:1) | AA grande (3:1) |
|---|---:|---|---|
| `gray_medium` #858585 sobre branco | 3,69:1 | **FALHA** | passa |
| `gray_medium` #858585 sobre creme #FAF7F2 | 3,45:1 | **FALHA** | passa |
| `gray_light` #BBBBBB sobre branco | 1,92:1 | **FALHA** | **FALHA** |
| `gray_light` #BBBBBB sobre creme | 1,80:1 | **FALHA** | **FALHA** |
| branco sobre `primary` âmbar #FABB5B | 1,70:1 | **FALHA** | **FALHA** |
| `success` #059669 sobre branco | 3,77:1 | **FALHA** | passa |
| `error` #ED4949 sobre branco | 3,72:1 | **FALHA** | passa |
| `secondary` #1B1B1B sobre âmbar | 10,11:1 | passa | passa |
| `secondary` #1B1B1B sobre creme | 16,12:1 | passa | passa |

**Escala do problema:** `color="gray_medium"` aparece **138 vezes** em `app/` e `components/`;
`gray_light` **21 vezes**. É a cor de texto secundário dominante da app (subtítulos, descrições,
metadados) — ou seja, a maior parte do texto de apoio da aplicação está abaixo do mínimo legal
de contraste para texto normal.

**Texto branco sobre âmbar (1,70:1)** é o caso mais grave e aparece em botões e cabeçalhos
(ex.: `(pages)/(services)/history/[serviceId].tsx:31,106,157,304`,
`(open)/close/index.tsx:146`, `(open)/progress/[serviceId].tsx:353`,
`(schedules)/[schedule].tsx:196,370`).

**Solução:** escurecer `gray_medium` para ~#6B6B6B (≥4,5:1 sobre branco e creme) e `gray_light`
para uso exclusivo em elementos não textuais (bordas, divisórias, ícones decorativos). Em fundo
âmbar, usar sempre `secondary` #1B1B1B (10,11:1) em vez de branco — já é o padrão dominante da
app, o branco é a exceção. `success`/`error` só a partir de 18pt/14pt-bold, ou escurecer.

---

## EXEC-08 — PII do cliente em armazenamento não encriptado
**Severidade:** Médio · **Prioridade:** P2 · **Tipo:** CONFIRMADO (código)

**Bem feito:** o **token de sessão** usa `expo-secure-store` (keychain do iOS) — ver
`hooks/useStorageState.ts:17-33`. Está correto.

**Problema:** os **dados pessoais** ficam em `AsyncStorage`, que não é encriptado:
- `contexts/SessionContext.tsx:59` — `useAsyncStorage('user-data')` guarda o objeto completo do
  utilizador (nome, email, telemóvel, NIF, morada).
- `contexts/GuestSessionContext.tsx:45,99` — `guest-session` guarda **morada e telemóvel** do
  cliente convidado.

Num dispositivo comprometido ou com backup não encriptado, estes dados são legíveis em claro.
Não é uma falha de autenticação (o token está protegido), mas é dado pessoal ao abrigo do RGPD.

**Solução:** mover `user-data` e `guest-session` para `SecureStore` (o helper já existe), ou
guardar apenas o mínimo necessário em claro (ex.: primeiro nome para saudação) e ir buscar o
resto à API quando preciso.

---

## EXEC-09 — `console.log` do objeto de erro de login em produção
**Severidade:** Baixo · **Prioridade:** P2 · **Tipo:** CONFIRMADO (código)

`app/(auth)/signin/index.tsx:156` — `console.log(error)` **ativo** no catch do login. O objeto
de erro do axios inclui `config.data`, ou seja, o corpo do pedido de autenticação. Em builds de
produção estes logs continuam a ser emitidos e são legíveis por qualquer ferramenta de log do
dispositivo.

Contexto justo: a maioria dos logs sensíveis do projeto **já está comentada** (ApiContext,
SessionContext, signup) — este parece ser um caso esquecido. No total há **74 `console.log`**
em `app/`, `contexts/`, `components/` e `hooks/`.

**Solução:** remover este; envolver os restantes em `if (__DEV__)`.

---

## EXEC-10 — Texto acessível grande destrói a Home (conteúdo principal fica inacessível)
**Severidade:** CRÍTICO (acessibilidade) · **Prioridade:** P0 · **Tipo:** CONFIRMADO (execução)

**Passos:** `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`
(equivalente a Definições → Acessibilidade → Tamanho do texto no máximo), reiniciar a app.

**Observado na Home** (evidência: `audit_bigtext_home.png`):
- "Agendamentos" quebra **uma letra por linha** ("Ag / en / da / m / en / to / s"), ocupando
  praticamente o ecrã inteiro num cartão que deveria ser uma linha de resumo.
- O placeholder "Do que precisa?" fica **cortado a meio na horizontal** dentro da caixa de
  pesquisa (altura fixa da caixa não acompanha o texto).
- **A grelha de categorias — o conteúdo principal e o único caminho de conversão da Home —
  é empurrada completamente para fora do ecrã.** O cliente não vê um único serviço.
- Os separadores inferiores sobrepõem-se e tornam-se ilegíveis.

**Observado no Perfil** (evidência: `audit_bigtext_profile.png`): a estrutura de cartões
aguenta, mas **todos os rótulos truncam** — "O meu p…", "Pagam…", "Dados d…", "Nenhum…".
O utilizador não consegue saber o que cada opção faz.

**Causa provável:** o texto escala corretamente (não há `allowFontScaling={false}` em lado
nenhum — o que é bom), mas os contentores têm **alturas e larguras fixas** (`h-24`, `w-24`,
alturas de input fixas) e vários `numberOfLines={1}` sobre rótulos essenciais. Como a
tipografia cresce e a caixa não, o conteúdo é cortado ou expulso.

**Impacto:** utilizadores com baixa visão — exatamente quem mais depende de serviços ao
domicílio, incluindo população idosa — ficam **impedidos de usar a app**. É simultaneamente
um risco de exclusão de clientes e de conformidade (EN 301 549 / Diretiva (UE) 2019/882,
aplicável a serviços ao consumidor).

**Solução:** (1) substituir alturas fixas por `minHeight` + `paddingVertical` nos cartões,
inputs e barra de navegação; (2) remover `numberOfLines={1}` de rótulos de navegação e
títulos de opção (ou subir para 2 com `adjustsFontSizeToFit`); (3) fazer a grelha de
categorias fluir em coluna única acima de um limiar de `fontScale`
(`useWindowDimensions().fontScale > 1.3`); (4) acrescentar ao QA um teste obrigatório com
o tamanho de texto no máximo nos 5 ecrãs do funil principal.

---

## Observações de UX registadas em execução (Home, modo convidado)

- **Nenhum pedido de localização no arranque**: a Home abre com as categorias e a barra de
  pesquisa sem qualquer indicação da zona servida. O cliente só descobre que a sua zona não é
  coberta mais à frente no funil (ecrã `blocked-by-zone`), depois de já ter investido passos.
- **"Agendamentos · 0 serviços · Hoje: 0"** aparece com destaque a um utilizador **convidado**
  que nunca poderia ter agendamentos. Ocupa a posição mais nobre do ecrã (topo) com informação
  vazia e sem valor para quem ainda não reservou nada.
- **Prova social no rodapé**: "★ 4.8 | +5000 serviços executados" fica no fundo do ecrã, abaixo
  da dobra na maioria dos telemóveis — é o elemento de confiança mais forte da Home e está no
  sítio de menor visibilidade. (Nota: o valor 4.8 é fixo por decisão de produto; a observação
  aqui é só de **posicionamento**.)


## E.2 · Detalhe dos achados críticos e altos (análise estática)


### A11Y-01 — gray_medium #858585 — cor de todo o texto secundário da app — falha WCAG AA (3,69:1 sobre branco, 3,45:1 sobre o creme)

- **Área:** Acessibilidade · contraste · **Ecrã:** `constants/Colors.ts:13 (definição); 193 ocorrências em 52 ficheiros, ex. components/app/Services/vendor-card-selector/index.tsx:88,112,121; components/app/Services/technician-trust-footer/index.tsx:42; app/(app)/(tabs)/cart/index.tsx:207,260; components/services/OpenService.tsx:33`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Abrir qualquer ecrã da app (Home, Cesto, Selecionar técnico, Definições). 2. Observar qualquer texto secundário: descrição do serviço, "Técnicos verificados", distância em km, duração, hints. 3. Medir o par de cor #858585 sobre #FFFFFF (cartões) ou sobre #FAF7F2 (fundo).
- **Esperado:** Texto normal (<18pt regular / <14pt bold) deve ter contraste ≥ 4,5:1 com o fundo (WCAG 2.1 AA, critério 1.4.3). Em texto a 12–14px como o desta app, o limiar aplicável é sempre 4,5:1.
- **Observado:** #858585 sobre #FFFFFF = 3,69:1. Sobre o creme #FAF7F2 = 3,45:1. Sobre o campo de pesquisa #FBFBFA da Home = 3,56:1. Sobre o tint âmbar a 15–16% (#FEF4E5, usado no TechnicianTrustFooter e no resumo do Cesto) = 3,39:1. Todos falham AA; nenhum caso de uso é texto grande, logo a exceção AA-large (3:1) não se aplica.
- **Causa provável:** O token foi escolhido por critério estético (cinzento neutro suave) sem verificação de contraste; nunca houve auditoria de acessibilidade no projeto.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/constants/Colors.ts`, `/Users/andrelacerda/dev/app-costumer/tailwind.config.js`, `/Users/andrelacerda/dev/app-costumer/components/app/Services/vendor-card-selector/index.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/Services/technician-trust-footer/index.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/Services/schedule-vendor-card/index.tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(tabs)/cart/index.tsx`
- **Solução:** Correção de uma linha com impacto global: em constants/Colors.ts:13 e 30, mudar gray_medium de "#858585" para "#6B6B6B" (4,83:1 sobre branco, 4,52:1 sobre #FAF7F2 — passa AA em ambos os fundos) ou, se se quiser margem, "#666666" (5,74:1 / 5,37:1). Espelhar em tailwind.config.js:20. Alternativa mais conservadora visualmente: manter #858585 apenas para texto ≥18px e trocar os 193 usos a 12–14px por gray_strong #525252 (7,81:1) — mas isso é 52 ficheiros de edição contra 2 linhas. Recomendo a mudança do token. Depois, adicionar um teste de regressão de contraste (ver testes recomendados).

### A11Y-02 — Preço e etiqueta de poupança em âmbar sobre fundo claro: 1,70:1 e 1,53:1 — informação comercial crítica quase ilegível

- **Área:** Acessibilidade · contraste · **Ecrã:** `app/(app)/(tabs)/list/index.tsx:434-438; components/app/Services/service-card-selector/index.tsx:92-99; components/app/Services/schedule-vendor-card/index.tsx:133-139`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Abrir o separador Lista (ou a Home → escolher categoria → lista de tipos de serviço). 2. Observar a linha "Desde X,XX €" — o valor está a color="primary" (#FABB5B) sobre cartão branco. 3. No fluxo de agendamento, observar o chip "Poupa 25%" no cartão do técnico: texto #FABB5B sobre backgroundColor rgba(250,187,91,0.2).
- **Esperado:** O preço é o elemento de decisão mais importante do ecrã; deve ter ≥4,5:1 (é texto a 12–14px).
- **Observado:** list/index.tsx:437 — #FABB5B sobre #FFFFFF = 1,70:1 a 12px bold. service-card-selector/index.tsx:94 — o mesmo a 14px bold; e no ramo diffBackground (linha 94) o preço passa a support_secondary (#FFFFFF) sobre bg-[#FABB5B] = 1,70:1 também, ou seja **os dois ramos do ternário falham**. schedule-vendor-card/index.tsx:137 — #FABB5B sobre o tint âmbar a 20% (equivalente a #FEF1DE sobre branco) = **1,53:1**, o pior par de toda a app.
- **Causa provável:** O âmbar da marca foi usado como cor de ênfase de texto sobre fundos claros. #FABB5B tem luminância 0,54 — é uma cor de *fundo*, não de texto; sobre branco nunca poderá passar AA seja qual for o peso.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/app/(app)/(tabs)/list/index.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/Services/service-card-selector/index.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/Services/schedule-vendor-card/index.tsx`, `/Users/andrelacerda/dev/app-costumer/constants/Colors.ts`
- **Solução:** Regra a fixar no design system: **primary #FABB5B nunca é cor de texto sobre fundo claro** — só sobre secondary #1B1B1B (10,11:1, uso legítimo em OpenService, Dialog e nos ecrãs MB WAY). Concretamente: (a) list/index.tsx:437 e service-card-selector/index.tsx:94 → trocar color="primary" por color="secondary" com boldness="bold" (17,22:1) — o preço fica mais legível e mais destacado; (b) service-card-selector/index.tsx:85,94 no ramo diffBackground → usar color="secondary" (10,11:1 sobre âmbar) em vez de support_secondary; (c) schedule-vendor-card/index.tsx:137 → manter o chip com fundo rgba(250,187,91,0.2) mas pôr o texto a secondary (#1B1B1B → 14,2:1) e, se se quiser manter ênfase âmbar, escurecer o token de texto para um "primary_ink" #8A5A00 (4,6:1 sobre o tint). Adicionar `primary_ink: "#8A5A00"` a Colors.ts como token oficial de "âmbar legível em texto".

### NOTIF-01 — Token de push nunca é desassociado no servidor — notificações da conta anterior chegam ao novo utilizador do dispositivo

- **Área:** Notificações / Privacidade · **Ecrã:** `contexts/NotificationsContext.tsx:83-98 e contexts/SessionContext.tsx:104-121`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Iniciar sessão com a conta A num dispositivo físico e aceitar as notificações. 2. Confirmar que o POST /auth/device foi feito (NotificationsContext.tsx:85). 3. Terminar sessão em Perfil > Terminar sessão. 4. Iniciar sessão com a conta B no MESMO dispositivo. 5. Fazer o backend disparar uma notificação dirigida à conta A (ex.: atualização de um serviço da conta A).
- **Esperado:** Ao terminar sessão, a app deve pedir ao backend a remoção da associação entre este expoPushToken e a conta A. Notificações da conta A deixam de chegar a este dispositivo.
- **Observado:** O signOut (SessionContext.tsx:104-121) chama apenas DELETE /auth/logout e limpa o estado local; o NotificationsContext limpa apenas a variável local expoPushToken (linhas 94-98). Não existe qualquer chamada de remoção do device — e não existe sequer rota para isso em constants/ApiRoutes.ts (só CAMPAIGN_LOG_OPEN, CAMPAIGN_LOG_CLICK e NOTIFICATION_OPT_OUT). O registo (token, conta A) fica ativo no backend indefinidamente.
- **Causa provável:** O comentário nas linhas 92-93 revela a intenção — 'limpar o token local para evitar reenviar um token stale' — mas resolve apenas metade do problema: impede reenviar, não remove o que já lá está. O endpoint de remoção nunca foi criado no backend nem consumido na app.
- **Ficheiros:** `contexts/NotificationsContext.tsx`, `contexts/SessionContext.tsx`, `constants/ApiRoutes.ts`, `app/(app)/(modals)/(profile)/delete-account/index.tsx`
- **Solução:** Backend: expor DELETE /auth/device (ou POST /auth/device/revoke) que apaga o par (expoPushToken, user). App: (a) acrescentar AUTH_DEVICE e AUTH_DEVICE_DELETE a constants/ApiRoutes.ts, substituindo a string hardcoded '/auth/device' de NotificationsContext.tsx:85; (b) expor no NotificationsContext uma função `unregisterDevice()` que faça o DELETE com o token de sessão AINDA válido; (c) chamá-la no início de SessionContext.signOut(), antes do DELETE /auth/logout, e aguardar (ou pelo menos disparar) antes de limpar a sessão; (d) chamá-la também no fluxo de eliminação de conta (delete-account/index.tsx:60-64) antes do signOut(). Como salvaguarda no servidor, ao registar um token que já existe associado a outro utilizador, reatribuí-lo em vez de duplicar.

### PAY-01 — Segunda reserva MB Way da sessão nunca confirma: o ecrã de espera não faz polling se já existir serviço aberto/pendente

- **Área:** Pagamentos · MB Way · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx:84-86 + contexts/ServiceContext.tsx:532-533`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Entrar com conta. 2. Reservar um serviço e pagar com MB Way até ver o ecrã "Pagamento confirmado" (isto executa handlePaymentConfirmed → setServicePendingAcceptance(service)). 3. Tocar em "Ir para a página inicial" (o fluxo MB Way NÃO passa pelo wait-accept, que é o único sítio que limpa o servicePendingAcceptance). 4. Sem fechar a app, reservar um segundo serviço (cenário natural da fila do Cesto: "Faltam reservar N serviços" → "Continuar reservas") e pagar de novo com MB Way. 5. Autorizar o pagamento na app do banco e voltar à Piquet.
Variante igualmente válida: qualquer cliente que já tenha um serviço em curso (openService) ou pendente de aceitação obtido por getPendingService() no foreground da app (app/(app)/_layout.tsx:22-31) e faça um novo pagamento MB Way.
- **Esperado:** O ecrã de espera faz polling ao GET /customer/services/{id}/payment-status e, quando o pagamento assenta, navega para mb-way/confirmed; se passarem 4 minutos, mostra a mensagem de timeout com saídas.
- **Observado:** verifyStatus() devolve imediatamente sem criar o intervalo (`if (!serviceId || openService || servicePendingAcceptance) return;`). Não há polling, não há onTimeout, o `timedOut` nunca fica true. O cliente autoriza e paga no banco e fica preso no contador regressivo até 0:00 sem qualquer desfecho — nem confirmação, nem erro, nem botão de recuperação (o "Já realizei o pagamento" está comentado, ver PAY-14). Só lhe resta o back (que vai para a home) ou "Cancelar a solicitação" de um pagamento que já foi feito.
- **Causa provável:** O guard `openService || servicePendingAcceptance` no verifyStatus foi pensado para não fazer polling fora de um fluxo de pagamento, mas é avaliado no momento em que o ecrã de espera monta — precisamente quando servicePendingAcceptance pode estar preenchido de um pagamento anterior (nunca limpo no caminho MB Way) ou de um getPendingService() do backend. O ecrã de espera não tem plano B: chama verifyStatus e assume que arrancou.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx`, `contexts/ServiceContext.tsx`, `app/(app)/_layout.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/mb-way/confirmed.tsx`, `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx`
- **Solução:** 1) Remover o guard de estado do verifyStatus (ServiceContext.tsx:533): passar a `if (!serviceId) return;`. O polling deste endpoint é sempre sobre um serviceId explícito passado pelo ecrã de pagamento — o estado global não é critério válido para o suprimir. 2) Fazer verifyStatus devolver um booleano (arrancou / não arrancou) e, no mb-way/waiting.tsx:84-86, se não arrancou, cair para um polling local idêntico ao do card/waiting.tsx (que já é autónomo e não depende do contexto) em vez de ficar mudo. 3) Limpar `servicePendingAcceptance` ao sair do ecrã mb-way/confirmed (ou passar o MB Way a terminar no wait-accept, tal como o cartão, uniformizando os dois fluxos). 4) A prazo, unificar: o card/waiting.tsx já tem a implementação correta e autocontida; o mb-way/waiting deve usar a mesma.

### PAY-02 — Janela real de duplo pagamento MB Way: overlay fechado e lock libertado 1 segundo antes de navegar

- **Área:** Pagamentos · MB Way · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:836-867`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Checkout com MB Way selecionado e número preenchido. 2. Tocar em "Confirmar e pagar". 3. Quando o overlay escuro "A processar o seu pedido…" desaparecer (acontece no .then, antes da navegação), tocar outra vez no botão "Confirmar e pagar" durante o segundo em que o ecrã continua visível e interativo.
- **Esperado:** Depois de o pedido MB Way ser criado com sucesso o botão fica inerte (ou o ecrã sai imediatamente); é impossível criar um segundo serviço/pedido de pagamento.
- **Observado:** No .then (linha 842) faz-se `setOpeningService(false)` e só depois se agenda `setTimeout(..., 1000)` para navegar; o `.finally` (linhas 863-867) põe `submittingRef.current = false` e repete `setOpeningService(false)`. Durante ~1000 ms o ProcessingOverlay já não está visível (ProcessingOverlay.tsx:72 devolve null quando visible=false, deixando de bloquear os toques), `isCtaDisabled` volta a false e o lock síncrono está libertado. Um segundo toque dispara novo POST /services/open/mbway → segundo serviço criado e segundo push MB Way de cobrança para o mesmo cliente.
- **Causa provável:** O setTimeout de 1s foi provavelmente introduzido para contornar um conflito de navegação (ver PAY-06), mas o reset do estado ficou antes do timeout em vez de depois. O lock `submittingRef` está no .finally, que corre imediatamente após o .then — não sobrevive ao atraso da navegação.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `components/ProcessingOverlay.tsx`
- **Solução:** No .then do MB Way: NÃO chamar setOpeningService(false) nem libertar submittingRef até a navegação estar feita. Concretamente: (a) remover a linha 842; (b) no .finally, libertar o lock apenas em caso de erro — usar uma flag local `let succeeded = false` marcada no .then e no .finally fazer `if (!succeeded) { submittingRef.current = false; setOpeningService(false); }`; (c) mover a limpeza de estado para dentro do callback do setTimeout, ou eliminar de vez o setTimeout depois de resolvido o PAY-06. Aplicar o mesmo raciocínio ao caminho do cartão, que hoje já mantém o lock durante o 3DS (correto).

### PAY-03 — Sem chave de idempotência no abrir-serviço: um timeout de 30s convida o cliente a pagar duas vezes

- **Área:** Pagamentos · cartão e MB Way · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:754-784 e 833-867`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Checkout com cartão (ou MB Way). 2. Provocar uma resposta lenta do backend (>30 s) ou perder a rede logo após o POST — por exemplo ativar o modo avião imediatamente depois de tocar em "Confirmar e pagar". 3. A app mostra a mensagem de erro por baixo do botão e devolve o CTA ao estado ativo. 4. Tocar novamente em "Confirmar e pagar".
- **Esperado:** Uma segunda tentativa após timeout ou falha de rede não pode gerar um segundo serviço nem uma segunda cativação: ou é reconciliada com o pedido anterior, ou o backend rejeita o duplicado pela chave de idempotência.
- **Observado:** O payload de POST_OPEN_SERVICE / POST_OPEN_SERVICE_MBWAY (linhas 716-752 e 797-831) não leva nenhum identificador único do pedido. O axios tem `timeout: 30000`; se o servidor processou o pedido mas respondeu tarde (ou a resposta se perdeu), o cliente vê `errors.occurred_an_error`, o `submittingRef` é libertado no .finally e nada impede uma segunda submissão idêntica. Ao contrário do 3DS (que está protegido pelo pending3dsRef), esta janela não tem guarda nenhuma: dois serviços, duas cativações.
- **Causa provável:** O pending3dsRef só existe depois de haver resposta com validationUrl; o caso "não sei se o pedido chegou" (timeout/rede) não foi coberto. O contrato da API não prevê Idempotency-Key.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `contexts/ApiContext.tsx`, `constants/ApiRoutes.ts`
- **Solução:** 1) Gerar um `request_id`/`idempotency_key` (uuid) uma vez por tentativa de checkout, guardá-lo num ref e enviá-lo em ambos os POST de abertura; o backend passa a devolver o serviço já criado em vez de criar outro (requer alteração no Laravel — abrir pendência de backend). 2) Enquanto o backend não existir, mitigar no cliente: em caso de erro SEM resposta HTTP (`!error.response`, isto é, timeout/rede), não mostrar "tente novamente" — mostrar "não conseguimos confirmar se o pedido foi criado" e oferecer "Verificar estado" que consulta os serviços pendentes (GET_PENDING_SERVICES) antes de permitir nova submissão. 3) Manter o CTA desativado nesse estado específico até o cliente fazer a verificação.

### RT-01 — Canal de tempo real faz leave+rejoin a cada atualização de localização — eventos perdidos

- **Área:** Tempo real (WebSockets) · **Ecrã:** `contexts/ServiceContext.tsx:176-190 (efeito) + :449-451 (UpdateLocationEvent)`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Ter um serviço aceite com técnico a deslocar-se (ou emitir manualmente .UpdateLocationEvent no canal common.services.{id}). 2. Observar o tráfego HTTP da app e os logs do Reverb. 3. Enquanto chegam eventos de localização, mandar o técnico marcar 'cheguei' (.ServiceArrivedEvent) ou pedir um extra (.ServiceExtraRequestedEvent) no exato momento em que chega um ping de localização.
- **Esperado:** A app subscreve o canal common.services.{id} uma única vez por serviço e mantém a subscrição estável enquanto o serviço estiver aberto; nenhum evento é perdido.
- **Observado:** O useEffect das linhas 176-190 tem `openService` (o objeto inteiro) nas dependências. O handler `.UpdateLocationEvent` faz `setOpenService(data.service)`, criando SEMPRE uma nova referência. Cada ping de localização dispara a cleanup (`echo.leaveChannel`) seguida de nova `echo.private(...)` + novo POST /broadcasting/auth + novo registo de listeners. Durante essa janela a app não está subscrita: ServiceArrivedEvent, ServiceFinishedEvent, ServiceExtraRequestedEvent, ServiceCanceledEvent e NewMessageEvent emitidos nesse intervalo são perdidos definitivamente (não há replay). Como os handlers usam `router.push`, uma eventual re-entrega também pode empilhar ecrãs duplicados de /close ou /vendor-arrived.
- **Causa provável:** Dependência de efeito por identidade de objeto em vez de por identificador estável. O mesmo efeito serve de subscrição e de reação a mudanças de dados.
- **Ficheiros:** `contexts/ServiceContext.tsx`, `hooks/echo.ts`, `app/(app)/(pages)/(services)/(open)/progress/[serviceId].tsx`
- **Solução:** Em contexts/ServiceContext.tsx trocar as dependências do efeito de `[echo, openService, servicePendingAcceptance]` para `[echo, openService?.id, servicePendingAcceptance?.id]` e guardar o id atualmente subscrito num `useRef` (subscribedChannelRef) para que a cleanup faça `leaveChannel` do id que efetivamente subscreveu, e não do id corrente. Em complemento, mudar o handler de `.UpdateLocationEvent` para uma atualização parcial — `setOpenService(prev => prev ? { ...prev, vendor: { ...prev.vendor, location: data.service?.vendor?.location } } : data.service)` — evitando substituir o objeto inteiro por um payload possivelmente parcial. Trocar `router.push` por `router.navigate` nos handlers de ServiceFinishedEvent/ServiceArrivedEvent para não empilhar ecrãs em caso de re-entrega.

### SEC-01 — Tickets de suporte: endpoint público sem autenticação com IDs sequenciais permite ler mensagens de suporte de outros clientes

- **Área:** Segurança / Privacidade · **Ecrã:** `app/(app)/(modals)/support-ticket/index.tsx:25,77,103-116`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Abrir o ecrã de suporte na app e submeter um ticket — a app faz POST para https://piquet-dashboard.vercel.app/api/tickets sem qualquer token (support-ticket/index.tsx:103-116) e guarda o id devolvido (ex. TK-1187).
2. Fora da app, a partir de qualquer máquina: GET https://piquet-dashboard.vercel.app/api/tickets?ids=TK-1101,TK-1102,...,TK-1150 (o handler aceita até 50 ids por pedido, CORS Access-Control-Allow-Origin: *, sem autenticação).
3. Ler a resposta.
- **Esperado:** Só o próprio cliente (ou staff autenticado) deve conseguir ler o conteúdo de um ticket de suporte. O acesso deve exigir prova de posse do ticket (token opaco/assinado) ou sessão.
- **Observado:** O GET devolve, para qualquer id existente, `subject` e `reply_preview`. O `subject` do lado do servidor faz fallback para `message.slice(0, 80)` (dashboard route.ts, construção do ticket) — ou seja, os primeiros 80 caracteres da mensagem escrita pelo cliente — e `reply_preview` é o corpo integral da última resposta do agente. Como os ids são gerados por sequência (`id text primary key default ('TK-' || nextval('support_ticket_seq')::text)`, sequência a começar em 1101 — supabase/migrations/20260723200000_support_tickets.sql:3-6), são trivialmente enumeráveis. Adicionalmente, o POST é público e aceita nome, email e telefone reais (support-ticket/index.tsx:107-115), sem rate limit visível além do honeypot `website` — que a app nem sequer envia.
- **Causa provável:** O endpoint foi desenhado com o mesmo racional do /api/leads (receção pública), mas as leads são write-only e os tickets são read-write. O comentário no route.ts assume que 'a app só conhece os IDs que ela própria criou', o que é segurança por obscuridade — falha assim que os ids são sequenciais e o endpoint é público e CORS-aberto.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/support-ticket/index.tsx`, `/Users/andrelacerda/Developer/Dashboard Piquet/src/app/api/tickets/route.ts`, `/Users/andrelacerda/Developer/Dashboard Piquet/supabase/migrations/20260723200000_support_tickets.sql`
- **Solução:** Duas alterações, em conjunto:
(a) DASHBOARD: no POST, gerar além do id um `access_token` aleatório (32 bytes, `crypto.randomUUID()` ou `randomBytes`), guardá-lo numa nova coluna `access_token text not null` de support_tickets, e devolvê-lo na resposta. No GET, exigir o par (id, token): mudar o contrato de `?ids=TK-1,TK-2` para `?t=<tok1>,<tok2>` e filtrar por `access_token in (...)`, devolvendo só as linhas correspondentes. Enquanto o token não existir, remover `reply_preview` e `subject` da resposta do GET (devolver só `status_label` e `has_reply`) — mitigação imediata de 1 linha.
(b) APP: guardar `{id, token}` em vez de só o id no AsyncStorage (TICKETS_KEY, support-ticket/index.tsx:58) e enviar o token no GET (linha 77). Idealmente, mover o endpoint para trás do backend Laravel e usar a instância `api` (que já leva o Bearer), eliminando o caminho público — o utilizador autenticado não precisa de endpoint anónimo.
Em qualquer dos casos, adicionar rate limit por IP no POST e enviar o campo honeypot `website: ""` a partir da app.

### SEC-02 — Websocket de tempo real configurado sem TLS (ws:// na porta 8080) — chat e dados de serviço em texto claro

- **Área:** Segurança · **Ecrã:** `hooks/echo.ts:24-28`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Ler hooks/echo.ts:24-28: `new Pusher('ofo5ybpvhjf4i49rj2jm', { wsHost: DOMAIN, wsPort: 8080, forceTLS: false, enabledTransports: ["ws","wss"], ... })`.
2. Com `forceTLS: false`, o pusher-js escolhe o esquema não cifrado e liga a ws://app.piquetapp.com:8080. Não há `wssPort` definido.
3. Numa rede partilhada (Wi-Fi público), capturar o tráfego durante um serviço em curso e durante uma conversa no chat.
- **Esperado:** Todo o tráfego de tempo real deve ser cifrado (wss://, porta 443 ou 8080/TLS), tal como o REST já é (API_PROTOCOL = https://, app.config.ts:171).
- **Observado:** O cliente está configurado para ligação em claro. Os payloads que passam neste canal incluem dados pessoais diretos: `handleNewMessage` consome `messageToHandle.messageDecrypted` (chat/service/[serviceId].tsx:231-243) — ou seja, a mensagem já decifrada pelo servidor — e os eventos de serviço transportam o objeto ServiceInterface completo, que inclui `customer.email`, `customer.phone`, `address` e `vendor.user.phone/email` (types/services/index.ts:53-75). A cifra RSA aplicada no envio (chat:196) é anulada no retorno, porque o servidor reenvia a versão decifrada por este canal.
- **Causa provável:** Configuração de desenvolvimento (Reverb local em ws://:8080) que transitou para produção sem ser revista.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/hooks/echo.ts`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/ios/Piquet/Info.plist`
- **Solução:** Em hooks/echo.ts:24-28 passar a `forceTLS: true`, `enabledTransports: ["wss"]`, `wsPort: 443` e `wssPort: 443` (ou a porta TLS que o Reverb expuser), e confirmar com a equipa de infra que o Reverb tem terminação TLS. Derivar o host de `DOMAIN` como já faz. Depois de corrigido, considerar deixar de reenviar `messageDecrypted` pelo socket e passar a decifrar no cliente com a chave já obtida em GET_SERVICE_PUBLIC_KEY — hoje a cifra ponta-a-ponta do chat é decorativa.

### WAIT-01 — Contagem decrescente do pedido imediato é de 60 segundos e, ao chegar a 0, o cliente fica preso com o botão Cancelar desativado

- **Área:** Funil imediato / espera de aceitação · **Ecrã:** `components/Timer.tsx:17 e app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:367`
- **Severidade:** critico · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Concluir um pedido imediato até ao pagamento (cartão ou MB Way).
2. Chegar ao ecrã wait-accept e não tocar em nada.
3. Esperar 60 segundos sem que o técnico aceite.
4. Em alternativa (mais rápido): fechar o wait-accept, voltar à Home e reentrar pelo cartão 'Serviço à espera de aceitação' passados >60s do updated_at.
- **Esperado:** O cliente vê uma contagem coerente com o que lhe foi prometido (20 minutos) e, em qualquer momento, consegue cancelar o pedido ou é levado a um desfecho claro (timeout com opção de tentar outro técnico e informação sobre o valor pago).
- **Observado:** TIME_TO_WAIT_FOR_VENDOR = 60 (segundos) em Timer.tsx:17, contra SCHEDULED_TIME_TO_WAIT_FOR_VENDOR = 20*60 na linha 18. Ao fim de 60s o Timer chama onTimeout() (Timer.tsx:98), que em wait-accept:367 faz apenas setDisableButton(true). `disableButton` nunca volta a false em todo o ficheiro. Se getServiceDetails devolver o serviço ainda em PENDING, o ramo final de getServiceDetails (wait-accept:310-313) volta a pôr status='pending' e o ecrã fica com o círculo a 0:00, o texto 'O profissional tem 0:00 para aceitar o serviço' e o único botão da vista ('Cancelar') desativado. Ao reentrar no ecrã com um updated_at antigo, getInitialTime() devolve 0 no primeiro render e o botão nasce já desativado.
- **Causa provável:** A constante de espera do pedido imediato ficou em 60 segundos (provavelmente um valor de teste) e nunca foi alinhada com a janela real do backend nem com a copy. O comentário de debug deixado em wait-accept:174 ('debug on counter expiring after 60 seconds instead of 20 mins') confirma que a equipa já investigou exatamente este sintoma. Somando isso, o handler de timeout foi escrito como se o estado 'timeout' fosse chegar sempre pelo websocket, sem caminho de saída local.
- **Ficheiros:** `components/Timer.tsx`, `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx`, `translation/resources/pt_PT.ts`
- **Solução:** 1) Alinhar a janela com o backend: substituir a constante fixa por um valor vindo do serviço (ex.: service.accept_deadline_at / service.timeout_seconds) e usar TIME_TO_WAIT_FOR_VENDOR apenas como fallback; se o backend não expuser nada, pôr 20*60 (Timer.tsx:17) para igualar a copy e o agendado. 2) Em wait-accept, quando remainingTime chegar a 0 e o backend continuar a devolver PENDING, mostrar um estado intermédio explícito (ex.: 'ainda à procura de um profissional') com o botão de cancelar SEMPRE ativo — trocar `disabled={isLoading || disableButton}` (linha 418) por `disabled={isLoading}` e usar disableButton só para bloquear cliques durante o request. 3) Remover o comentário de debug da linha 174.

### A11Y-03 — App essencialmente inutilizável com leitor de ecrã: 216 controlos tácteis para 21 props de acessibilidade; 70 TextInput sem accessibilityLabel

- **Área:** Acessibilidade · leitores de ecrã · **Ecrã:** `transversal — components/app/BackHeader.tsx:31-49; components/app/UserHeader.tsx:59,70,100; components/CustomTouchableOpacity.tsx:140-162; components/CustomTextInput.tsx:152; components/TouchOpacity.tsx:27`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** baixo
- **Reproduzir:** 1. Ativar VoiceOver (iOS) ou TalkBack (Android). 2. Percorrer a Home, o Cesto, o Checkout e o Perfil por swipe. 3. Observar o que é anunciado nos botões só com ícone (voltar, notificações, remover do cesto, enviar mensagem no chat) e nos campos de formulário.
- **Esperado:** Cada controlo interativo anuncia um nome (accessibilityLabel), um papel (accessibilityRole) e, quando aplicável, o estado (selected/disabled/checked). Campos de texto anunciam a sua etiqueta. Ícones decorativos são ignorados (accessible={false}).
- **Observado:** Contagem exata sobre app/ e components/: 216 elementos tácteis (119 CustomTouchableOpacity, 61 TouchableOpacity, 23 TouchOpacity, 10 TouchableWithoutFeedback, 3 TouchableHighlight) contra 21 ocorrências totais de accessibilityLabel/Role/State/Hint/accessible — e 14 dessas 21 estão em apenas 2 ficheiros (schedule-service.tsx e TabBar.tsx). Os componentes-base CustomTouchableOpacity e TouchOpacity não repassam nem derivam qualquer prop de acessibilidade. 70 elementos <TextInput>/<CustomTextInput> com **zero** accessibilityLabel — a etiqueta existe apenas como placeholder visual (que desaparece ao escrever) ou como <CustomText> adjacente sem ligação semântica. 23 <Image> sem accessibilityLabel nem accessible={false}. Zero accessibilityViewIsModal/importantForAccessibility em 3 <Modal> e em todos os bottom sheets — o leitor continua a ler o conteúdo por trás do modal.
- **Causa provável:** Acessibilidade nunca foi requisito; os componentes-base foram desenhados para estilo (type/size/textColor) e não expõem superfície de acessibilidade, pelo que nem o caminho fácil existe.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/components/CustomTouchableOpacity.tsx`, `/Users/andrelacerda/dev/app-costumer/components/TouchOpacity.tsx`, `/Users/andrelacerda/dev/app-costumer/components/CustomTextInput.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/BackHeader.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/UserHeader.tsx`, `/Users/andrelacerda/dev/app-costumer/components/Dialog.tsx`
- **Solução:** Faseado, começando pela base (o retorno é imediato porque 119 botões passam por um único componente):
Fase 1 (1 dia): em CustomTouchableOpacity.tsx:140, acrescentar por omissão `accessibilityRole="button"`, `accessibilityLabel={props.accessibilityLabel ?? text}` e `accessibilityState={{ disabled: !!disabled }}` — a prop `text` já contém a etiqueta traduzida em 42 dos botões primários. Mesma coisa em TouchOpacity.tsx:27 (role "button" quando há onPress). Em CustomTextInput.tsx:152, adicionar `accessibilityLabel={props.accessibilityLabel ?? placeholder}` como rede de segurança.
Fase 2 (2 dias): botões só-de-ícone — BackHeader.tsx:31 (`accessibilityRole="button"` + `accessibilityLabel={t('general.back')}`), UserHeader.tsx:100 (label "Notificações" + `accessibilityValue={{text: notifications}}`), cart/index.tsx:222 ("Remover do cesto"), chat send button, botão de pesquisa da Home (home/index.tsx:364).
Fase 3: `accessibilityViewIsModal` em Dialog.tsx e em todos os DynamicSizingSheet; `accessible={false}` nas <Image> decorativas.
Critério de aceitação: correr o Accessibility Inspector (Xcode) e o Accessibility Scanner (Android) nos 6 ecrãs do funil principal sem avisos de "unlabelled element".

### A11Y-04 — Botão de voltar mede 40×20pt em 40 ecrãs; só existem 2 hitSlop em toda a app

- **Área:** Acessibilidade · áreas de toque · **Ecrã:** `components/app/BackHeader.tsx:44-48 (usado em 40 ecrãs); components/app/UserHeader.tsx:100; components/warnings/GeolocationPermissionBanner.tsx:76,85; components/app/Profile/Settings.tsx:100-109; components/FilterTabs.tsx:34-48`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Abrir qualquer ecrã com cabeçalho (Histórico, Definições, Checkout, Perfil…). 2. Tentar tocar no canto do ícone de seta para voltar, sobretudo com o polegar ou com destreza reduzida. 3. Repetir no sino de notificações da Home e no botão "Agora não" do banner de geolocalização.
- **Esperado:** Mínimo 44×44pt (Apple HIG) / 48×48dp (Material Design). Quando o alvo visual é menor, compensar com hitSlop.
- **Observado:** BackHeader.tsx:44 — o TouchableWithoutFeedback envolve `<View className="w-10">` (40pt de largura) contendo `<View className="w-5 h-5">` (20×20). Como não há altura definida no wrapper, a área efetiva é **40×20pt**, ~40% da área mínima, sem hitSlop. Presente em 40 ecrãs. Além disso é um TouchableWithoutFeedback: não dá qualquer feedback visual ao toque.
UserHeader.tsx:100 — sino de notificações: `className="w-6 h-6"` = **24×24pt**.
GeolocationPermissionBanner.tsx:76 e 85 — botões "Agora não" e "Permitir" com `px-2 py-1`/`px-3 py-1`: texto extraSmall (lineHeight 16) + 8pt de padding vertical = **~24pt de altura**.
Settings.tsx:103 — toggle de idioma PT/EN, `px-3.5 py-1.5` = **~32pt**.
FilterTabs.tsx:44 — chips de filtro do Histórico, paddingVertical 8 + lineHeight 20 = **36pt**.
Em toda a app existem apenas 2 hitSlop (cart/index.tsx:222 e rate/[serviceId].tsx:186).
- **Causa provável:** Layout construído a partir do tamanho do ícone e não do tamanho do alvo; ausência de um componente `IconButton` padronizado que garanta 44pt.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/components/app/BackHeader.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/UserHeader.tsx`, `/Users/andrelacerda/dev/app-costumer/components/warnings/GeolocationPermissionBanner.tsx`, `/Users/andrelacerda/dev/app-costumer/components/app/Profile/Settings.tsx`, `/Users/andrelacerda/dev/app-costumer/components/FilterTabs.tsx`
- **Solução:** 1. Criar `components/IconButton.tsx`: TouchableOpacity com `style={{minWidth:44, minHeight:44, alignItems:'center', justifyContent:'center'}}`, `hitSlop={{top:8,bottom:8,left:8,right:8}}`, `accessibilityRole="button"` e prop `accessibilityLabel` obrigatória. Uma peça, resolve o padrão todo.
2. BackHeader.tsx:44 — substituir TouchableWithoutFeedback + `<View className="w-10">` por `<IconButton accessibilityLabel={t('general.back')}>` mantendo o ícone 20×20 lá dentro. Corrige 40 ecrãs de uma vez e passa a haver feedback ao toque.
3. UserHeader.tsx:100 — trocar `className="w-6 h-6"` por IconButton com o ícone 24×24 centrado (cuidado: o badge está posicionado com `absolute -top-3 -right-2` relativo ao touchable, terá de ser reancorado ao ícone).
4. GeolocationPermissionBanner.tsx:76,85 — `py-1` → `py-2.5` + hitSlop vertical de 8.
5. Settings.tsx:103 — `py-1.5` → `py-2.5` e adicionar `accessibilityRole="radio"` + `accessibilityState={{selected: active}}`.
6. FilterTabs.tsx:44 — paddingVertical 8 → 12 (chip fica com 44pt) + `accessibilityRole="tab"` + `accessibilityState={{selected: isActive}}`.

### ANL-01 — Analytics silenciosamente desligada: EXPO_PUBLIC_MIXPANEL_TOKEN não está definido em nenhum ficheiro de ambiente nem no eas.json

- **Área:** Analytics / Configuração · **Ecrã:** `services/MixpanelService.ts:2,8-10`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Listar os ficheiros de ambiente do repositório: existe apenas `.env.local`, com duas variáveis (EXPO_PUBLIC_DEV_API_DOMAIN e EXPO_PUBLIC_DEV_API_PROTOCOL). Não há `.env`, `.env.production` nem `.env.example`.
2. Ler eas.json (ficheiro inteiro, 13 linhas): os perfis preview/preview2/preview3/preview4/production não têm qualquer bloco `env`.
3. Ler services/MixpanelService.ts:2 e 8-10: `const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? ''` e, sem token, `mixpanel = null`.
- **Esperado:** Uma build de produção deve emitir eventos, e a falha de configuração de analytics deve ser visível (aviso em arranque, evento de saúde, verificação no CI) e não silenciosa.
- **Observado:** Com o working tree tal como está, qualquer build (local ou EAS) sai com `mixpanel = null`. Consequências em cadeia: `track()` e `setUserProfile()` tornam-se no-ops (MixpanelService.ts:46,55); `initMixpanel()` devolve `false` (linha 23), logo `isInitialized` fica `false` em MixpanelContext.tsx:42; e o ConsentBannerWrapper devolve `null` (ConsentBannerWrapper.tsx:8) — **o banner de consentimento nunca aparece**. O único sinal é um `console.warn` que só corre em `__DEV__` (MixpanelService.ts:12-16). Nota: o funil está reportadamente a receber dados em produção, o que indica que o token está a ser injetado por um ficheiro `.env.production` não versionado na máquina de quem faz a build — o que torna a produção de builds dependente de uma máquina específica e não reprodutível a partir do repositório.
- **Causa provável:** O token foi endurecido para fora do código (o .gitignore tem um bloco explícito 'Ficheiros de segredos — auditoria de segurança 2026-07') mas não foi migrado para EAS secrets, e não ficou nenhum `.env.example` a documentar a variável necessária.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/services/MixpanelService.ts`, `/Users/andrelacerda/dev/app-costumer/eas.json`, `/Users/andrelacerda/dev/app-costumer/.env.local`, `/Users/andrelacerda/dev/app-costumer/.gitignore`
- **Solução:** (a) Criar `.env.example` (permitido pelo .gitignore, que já tem `!.env.example`) com `EXPO_PUBLIC_MIXPANEL_TOKEN=` e as duas variáveis de API, documentado no README.
(b) Registar o token como EAS secret (`eas secret:create --name EXPO_PUBLIC_MIXPANEL_TOKEN`) e acrescentar em eas.json blocos `"env": { "EXPO_PUBLIC_MIXPANEL_TOKEN": "..." }` por perfil — com projetos Mixpanel **distintos** para preview e produção, resolvendo em simultâneo a separação de ambientes (hoje MixpanelContext.tsx:6,34 resolve isso desligando a analytics em preview, o que impede testar a instrumentação antes de ir a produção).
(c) Falhar alto: em MixpanelService.ts:12, trocar o `__DEV__` por um aviso sempre visível e, em produção, enviar um ping ao backend próprio (`/common/app-health`) quando `mixpanel === null`, para que a ausência de analytics apareça no dashboard em vez de passar despercebida.

### ANL-02 — Plano de eventos com dupla contagem: cada seleção de técnico emite dois eventos diferentes e service_confirmed é emitido em quatro sítios com semânticas contraditórias

- **Área:** Analytics · **Ecrã:** `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:118,197`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** baixo
- **Reproduzir:** 1. Selecionar um técnico na lista: `selectVendorAndProceed` (select-vendor/[serviceId].tsx:195) emite `technician_selected` na linha 197 e chama de imediato `openService(item)` (linha 203), que emite `vendor_selected` na linha 118. Uma ação do utilizador → dois eventos.
2. Concluir um pagamento: `service_confirmed` é emitido em checkout/[serviceId].tsx:566, :646 e :767 com `is_new_user: isGuest`, e em wait-accept/[serviceId].tsx:106 com `is_new_user: !userData?.phone_number_verified_at`.
3. Abrir o funil no Mixpanel e comparar contagens.
- **Esperado:** Um nome de evento por conceito, um conjunto de propriedades estável por nome, e um único ponto de emissão por conversão.
- **Observado:** Problemas concretos e verificáveis no código:
- `technician_selected` (technician_id, price, rating, position_in_list) e `vendor_selected` (vendor_id, vendor_name, vendor_rating, service_name) descrevem a mesma ação com vocabulários diferentes ('technician' vs 'vendor') e chaves diferentes para a mesma coisa (rating vs vendor_rating). Só `technician_selected` está no plano documentado em AGENTS.md.
- `service_confirmed` tem quatro emissores e duas definições incompatíveis de `is_new_user`; num pagamento com 3DS o caminho de checkout emite-o e o ecrã wait-accept pode emiti-lo outra vez (o guard `hasNavigatedToProgressRef` de wait-accept:104 é local ao ecrã, não global à reserva) — sobrecontagem da métrica de conversão, que é a métrica de negócio mais importante.
- `phone_entered`, `sms_sent` e `sms_verified` existem em duplicado, em signin/index.tsx:80,91,118 e em checkout/[serviceId].tsx:903,909,961, sem qualquer propriedade que distinga login de checkout convidado — impossível separar os dois funis.
- `profile_completion_prompted` sem propriedades em dois sítios: rate/[serviceId].tsx:74 e components/warnings/CompleteYourProfile.tsx:17.
- `service_viewed` (select-service-type/[operationAreaId].tsx:126) e `service_type_viewed` (select-service-type/info.tsx:46) são nomes quase iguais para coisas diferentes.
- `checkout_confirm_pressed` (checkout:712 e :793) é emitido **antes** do guard `if (submittingRef.current) return` da linha seguinte (713/794), pelo que toques rápidos inflacionam o evento sem pedido correspondente.
- **Causa provável:** Instrumentação acrescentada em vagas sucessivas (o AGENTS.md documenta 13 eventos; o código tem 34 chamadas a track) sem um plano único nem revisão de nomenclatura.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(auth)/signin/index.tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/components/warnings/CompleteYourProfile.tsx`
- **Solução:** 1. Eliminar `vendor_selected` (select-vendor:118) — ficar só com `technician_selected`, que já é o nome documentado; migrar as propriedades úteis (`service_name`) para ele.
2. Centralizar `service_confirmed`: emitir apenas uma vez, em `goToWaitAccept` (checkout) ou num helper único, com um `bookingIdRef` guardado que impeça repetição para o mesmo service_id; remover a emissão de wait-accept:106. Fixar `is_new_user` numa só definição (proponho `is_guest_checkout: isGuest` + `is_first_service: boolean` vindo do backend, para não confundir dois conceitos).
3. Acrescentar `context: 'signin' | 'guest_checkout'` a `phone_entered`/`sms_sent`/`sms_verified`, e `source: 'rating_sheet' | 'home_banner'` a `profile_completion_prompted`.
4. Renomear `service_viewed` → `service_type_list_item_tapped` e `service_type_viewed` → `service_type_detail_viewed`.
5. Mover `track("checkout_confirm_pressed")` para **depois** do guard `submittingRef` (checkout:713 e :794).
6. Criar `constants/AnalyticsEvents.ts` com os nomes como constantes tipadas e passar `track` a aceitar só essas chaves — impede a divergência de nomes no futuro. Atualizar o AGENTS.md para ser a tabela real (hoje descreve 13 dos 34).

### AUTH-01 — Token expirado provoca logout forçado no arranque — o refresh nunca chega a ser tentado

- **Área:** Sessão / refresh de token · **Ecrã:** `contexts/SessionContext.tsx:127-153`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado · ✅ **verificado adversarialmente** (auditor propôs *critico*, corrigido para *alto*)
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Iniciar sessão na app. 2. Fechar a app (kill) e deixar passar mais do que o TTL do access token JWT (tipicamente 60 min). 3. Reabrir a app.
- **Esperado:** A app renova o token silenciosamente (o refresh token / janela de refresh do Laravel ainda é válida durante dias) e o utilizador continua autenticado.
- **Observado:** `fetchAndSaveUserData` faz `axios.get(API_ROUTES.AUTH_ME, { headers: { Authorization: Bearer ${session} } })` com o axios GLOBAL, não com a instância `api` do ApiContext. Como não passa pelos interceptores, não há renovação proativa (ApiContext.tsx:43-56) nem retry com refresh no 401 (ApiContext.tsx:158-170). O 401 cai em SessionContext.tsx:149-151 e chama `signOut()`. O utilizador é despejado para o modo convidado sempre que o access token expira entre sessões.
- **Causa provável:** Três funções do SessionContext (`getAvailableGenders`:63, `changeUserLanguage`:92, `fetchAndSaveUserData`:127) usam `axios` cru com o header montado à mão, muito provavelmente para evitar a dependência circular SessionContext↔ApiContext. O mesmo padrão está em contexts/WalletContext.tsx:34-40 (aí o 401 é só engolido: a lista de cartões fica vazia sem explicação).
- **Ficheiros:** `contexts/SessionContext.tsx`, `contexts/ApiContext.tsx`, `contexts/WalletContext.tsx`
- **Solução:** Extrair a lógica de refresh para um módulo sem React (ex. services/AuthTokenService.ts) que exponha `getValidToken()`: descodifica o JWT, e se `exp < now` faz POST /auth/refresh com deduplicação (ver AUTH-04) e devolve o token novo. `fetchAndSaveUserData`, `changeUserLanguage` e `WalletContext.fetchPaymentMethods` passam a chamar `await getValidToken()` antes do pedido, e o interceptor do ApiContext passa a delegar nesse mesmo módulo. Em alternativa mínima e imediata: em SessionContext.tsx:149, antes de chamar `signOut()` no 401, tentar uma vez POST /auth/refresh e repetir /auth/me; só deslogar se esse refresh também falhar.
- **Nota da verificação:** MECANISMO CENTRAL: CONFIRMADO. `fetchAndSaveUserData` usa mesmo o axios global (contexts/SessionContext.tsx:5 import, :127 `axios.get(API_ROUTES.AUTH_ME, {headers:{Authorization: Bearer ${session}}})`), portanto não passa pelos interceptores da instância criada em contexts/ApiContext.tsx:33-83. O interceptor de request (ApiContext.tsx:38-74) é o ÚNICO sítio com renovação proativa (jwtDecode → `if (date && date < now) token = await refreshToken()`, :45-50) e o interceptor de response é o único com retry em 401 (:158-166); `refreshToken()` (:88-120) é uma função local do ApiProvider, não exportada — grep confirma que `/auth/refresh` só é chamado em ApiContext.tsx:95. Logo, o 401 de /auth/me ca

### AUTH-07 — Eliminar conta exige palavra-passe — impossível para quem entrou por OTP de telemóvel ou converteu de convidado

- **Área:** Eliminação de conta / conformidade · **Ecrã:** `app/(app)/(modals)/(profile)/delete-account/index.tsx:49-93 e 153-159`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado · ✅ **verificado adversarialmente** (auditor propôs *alto*, corrigido para *alto*)
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** baixo
- **Reproduzir:** 1. Entrar por telemóvel + código SMS (app/(auth)/signin/index.tsx:102, PHONE_LOGIN_VERIFY) ou concluir um checkout como convidado, que faz GUEST_REGISTER e cria sessão (app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:939-951). 2. Ir a Conta → Definições → Eliminar conta. 3. Tentar submeter.
- **Esperado:** O utilizador consegue eliminar a conta com o mesmo fator com que autentica (código SMS), conforme a guideline 5.1.1(v) da App Store e o direito ao apagamento do RGPD (art. 17.º).
- **Observado:** O ecrã tem um único campo obrigatório, `password` com `required` e `minLength: 8` (linhas 156-159), e envia `{ password }` para COMMON_ACCOUNT_DELETE. Contas criadas por OTP/convidado nunca definiram palavra-passe, pelo que o botão está permanentemente bloqueado pela validação — não há caminho alternativo no ecrã (nem "não tenho palavra-passe", nem confirmação por SMS, nem link para definir palavra-passe).
- **Causa provável:** O ecrã foi desenhado quando só existia registo por email/palavra-passe; a autenticação por telemóvel e o fluxo de convidado foram acrescentados depois sem rever a eliminação de conta.
- **Ficheiros:** `app/(app)/(modals)/(profile)/delete-account/index.tsx`, `app/(auth)/signin/index.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `constants/ApiRoutes.ts`
- **Solução:** Tornar o fator de confirmação dependente do tipo de conta: se `userData` não tiver email verificado/palavra-passe definida (ou expor uma flag `has_password` no /auth/me), mostrar em vez do campo de palavra-passe um fluxo de confirmação por OTP reutilizando o `ValidatePhoneModal` já existente, e enviar `{ verification_token }` para COMMON_ACCOUNT_DELETE. Requer suporte no backend — registar em BACKEND_PENDENCIAS.md. Mitigação imediata enquanto isso não existe: quando não há palavra-passe, oferecer no ecrã o botão "Definir palavra-passe" (fluxo de recuperação por email) ou um pedido de eliminação por ticket de suporte, para que nunca haja um beco sem saída.
- **Nota da verificação:** O NÚCLEO DO ACHADO CONFIRMA-SE, MAS O MECANISMO DESCRITO ESTÁ ERRADO.

Confirmado (li o código):
1. `app/(app)/(modals)/(profile)/delete-account/index.tsx:148-190` — o ecrã tem um único fator de confirmação, o campo `password`, e envia exclusivamente `{ password: getValues('password') }` para `COMMON_ACCOUNT_DELETE` (linhas 57-59). Não existe caminho alternativo: nem OTP, nem "não tenho palavra-passe", nem link para definir/recuperar palavra-passe. O resto do ecrã é código morto de um formulário copiado (imports de `DatePicker`, `ImagePicker`, `validateNIF`, estados `asset`/`avatarError` nas linhas 32-33, e `loadingResetPassword` na linha 31 que nunca é posto a true — vestígio de um botão de

### CART-01 — Convidado com cesto que passa pela morada perde o cesto inteiro: sai para um único serviço e o modo (imediato/agendado) é descartado

- **Área:** Funil imediato / cesto + convidado · **Ecrã:** `app/(app)/(modals)/(services)/(request)/address/guest/index.tsx:216-229 (origem em app/(app)/(tabs)/cart/index.tsx:76-87)`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Sem sessão iniciada e sem morada de convidado guardada, adicionar 2 ou 3 serviços ao cesto (botão do carrinho no ecrã de detalhe do serviço).
2. Ir ao separador Cesto e tocar em 'Imediato' (ou 'Agendar').
3. Como não há morada, a app abre o formulário de morada de convidado. Preencher e confirmar.
- **Esperado:** Depois de guardar a morada, o convidado volta ao fluxo do cesto — o ecrã cart-technicians com os N serviços e o modo escolhido (imediato ou agendado).
- **Observado:** onSubmit da morada de convidado ignora completamente o cesto: calcula `serviceTypeId = guestSession?.selected_service_type_id || serviceToRequest?.service_type?.id` (linha 216) e faz router.replace para select-vendor/{esse único id} (linha 228) — ou, se nada estiver definido, um simples router.back() (linhas 218-223). O parâmetro `mode` que cart/index.tsx:85 passava também se perde, porque o ramo agendado depende de `scheduledService`, que o cesto nunca põe a true antes de sair para a morada (cart/index.tsx:76-81 chama proceed → navigate para address/guest sem tocar em setScheduledService).
- **Causa provável:** O ecrã de morada de convidado foi escrito para o fluxo de serviço único (o único que existia antes do cesto) e o fluxo de cesto da build 15 foi ligado por cima sem lhe passar destino de regresso.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/address/guest/index.tsx`, `app/(app)/(tabs)/cart/index.tsx`, `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx`, `contexts/CartContext.tsx`
- **Solução:** Passar um destino de regresso explícito ao ecrã de morada: em cart/index.tsx:79 navegar com params `{ returnTo: 'cart-technicians', mode: nextMode }`; em address/guest/index.tsx, no onSubmit, ler esses params e, se returnTo === 'cart-technicians', fazer router.replace({ pathname: '/(app)/(modals)/(services)/(request)/cart-technicians', params: { mode } }) antes de cair no ramo do serviço único. Enquanto o param não existir, manter o comportamento atual.

### CHAT-01 — Chat ignora o parâmetro de rota [serviceId] e nunca se recompõe se openService chegar depois

- **Área:** Chat · **Ecrã:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:129, 152-163`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Com um serviço em curso, matar a app. 2. Abrir diretamente a rota /(app)/(pages)/(services)/(open)/(chat)/service/{id} (deep-link, ou notificação que restaure esta rota). 3. Alternativamente: entrar no chat antes de getOpenService() em app/(app)/_layout.tsx:24 ter resolvido.
- **Esperado:** O chat usa o id da rota, carrega mensagens e chave pública desse serviço, e funciona mesmo sem o serviço já estar no contexto.
- **Observado:** Linha 129: `const serviceId = openService?.id;` — o parâmetro `[serviceId]` da rota nunca é lido (não há `useLocalSearchParams`). Com openService a null, os pedidos vão para `/common/services/undefined/public-key` e `/common/services/undefined/message` (404): aparece o diálogo de erro do fetchMessages e `publicKey` fica undefined, o que faz `handleSendMessage` retornar imediatamente (linha 182) — o botão de enviar deixa de fazer o que quer que seja, sem qualquer mensagem. Pior: as dependências do efeito são apenas `[echo]` (linha 163), pelo que quando `openService` finalmente chega, nada é refeito — o ecrã fica permanentemente partido até ser desmontado. O cabeçalho mostra também nome do técnico vazio.
- **Causa provável:** Ecrã escrito assumindo que a única entrada é a navegação interna com contexto já carregado; o ficheiro está numa rota dinâmica cujo parâmetro nunca foi ligado.
- **Ficheiros:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx`, `contexts/ServiceContext.tsx`, `app/(app)/_layout.tsx`
- **Solução:** No chat: `const { serviceId: serviceIdParam } = useLocalSearchParams(); const serviceId = (openService?.id ?? serviceIdParam) as string | undefined;`. Guardar todos os efeitos com `if (!serviceId) return;` e acrescentar `serviceId` às dependências dos efeitos das linhas 152-163 e 138-142, para que a chegada tardia do contexto reative o carregamento. Enquanto `serviceId` for undefined, mostrar o mesmo estado de carregamento defensivo já usado em overview/[serviceId].tsx:40-62 (que é o padrão correto neste repositório).

### CHAT-02 — Envio falhado deixa a bolha da mensagem no ecrã — o cliente julga que enviou

- **Área:** Chat · **Ecrã:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:181-209`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** baixo
- **Reproduzir:** 1. Abrir o chat de um serviço em curso. 2. Ativar modo avião (ou fazer o backend devolver 500 em POST /common/services/{id}/message). 3. Escrever uma mensagem e tocar em enviar.
- **Esperado:** A mensagem que não chegou ao servidor é marcada como falhada (ou removida) e o utilizador é informado, com opção de reenviar.
- **Observado:** `buildMessages(...)` (linha 190) insere a bolha otimista ANTES do POST. No `.catch` (linhas 202-207) só se restaura o texto na caixa de escrita — a bolha continua na conversa, indistinguível de uma mensagem entregue. O cliente vê a mensagem no histórico E o mesmo texto de volta na caixa: ou reenvia duplicando, ou assume que o técnico recebeu. Num marketplace onde a mensagem pode ser 'não estou em casa, venha às 15h', isto tem consequências operacionais reais.
- **Causa provável:** Atualização otimista sem estado de entrega nem rollback.
- **Ficheiros:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx`
- **Solução:** Dar identidade e estado às mensagens locais: acrescentar `localId: string` e `status: 'sending' | 'sent' | 'failed'` à interface `Message` (linha 21). No `.then` marcar 'sent'; no `.catch` marcar 'failed' em vez de restaurar o texto. Em `CustomerMessage` (linhas 28-46) renderizar um ícone de erro + toque para reenviar quando `status === 'failed'`, e opacidade reduzida quando 'sending'.

### CHAT-03 — RSA.encrypt e GET da chave pública sem tratamento de erro: chat pode ficar mudo ou com o botão bloqueado para sempre

- **Área:** Chat · **Ecrã:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:152-157, 181-208`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** Cenário A (chave): 1. Fazer GET /common/services/{id}/public-key falhar (offline no momento de abrir o chat, ou 500). 2. Escrever uma mensagem e tocar em enviar, repetidamente. Cenário B (encrypt): 1. Ter uma chave pública malformada/vazia no payload. 2. Enviar uma mensagem.
- **Esperado:** Falha de chave ou de cifra produz um erro visível ao utilizador e o chat recupera (retry da chave); o botão de enviar nunca fica permanentemente inativo.
- **Observado:** Linha 153: o `api.get(GET_SERVICE_PUBLIC_KEY)` tem `.then` mas NÃO tem `.catch` — rejeição não tratada e `publicKey` fica undefined. A linha 182 (`if (!publicKey) return;`) faz então com que cada toque em enviar não produza absolutamente nada: sem erro, sem spinner, sem log visível ao utilizador. Linha 197: `const signedData = await RSA.encrypt(...)` está fora de qualquer try/catch e ANTES do `.catch()` da cadeia do axios; se rejeitar, a função async rebenta, o `.finally(() => setSendingMessage(false))` (linha 208) nunca chega a ser agendado e `sendingMessage` fica `true` para sempre — o botão de enviar fica `disabled` (linha 475) até o ecrã ser desmontado, com a bolha otimista já inserida.
- **Causa provável:** Ausência de tratamento de erro em duas fronteiras assíncronas (rede e crypto nativa).
- **Ficheiros:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx`, `constants/ApiRoutes.ts`
- **Solução:** Envolver todo o `handleSendMessage` num try/catch/finally, com `setSendingMessage(false)` no finally. Acrescentar `.catch()` ao GET da chave pública, guardando um estado `keyError` e mostrando uma faixa não-bloqueante no topo do chat ('Não foi possível ligar à conversa — tocar para tentar de novo') que volte a pedir a chave. Enquanto `!publicKey`, desativar visualmente o botão de enviar em vez de o deixar clicável sem efeito.

### CHECKOUT-01 — Botão de pagar fica ativo mas não faz absolutamente nada quando o serviço/técnico se perdem do contexto

- **Área:** Funil imediato / checkout · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:699 e 792`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Chegar ao checkout de um pedido imediato.
2. Forçar a perda de serviceToRequest — em desenvolvimento, um fast-refresh/reload de JS com o ecrã aberto; em produção, qualquer caminho que reponha o ServiceContext (ex.: sessão limpa pelo effect de ServiceContext.tsx:144-161) ou uma entrada direta na rota /checkout/[serviceId] por deep link.
3. Tocar no botão 'Confirmar'.
- **Esperado:** Ou o botão está desativado com um motivo visível, ou o toque devolve o cliente ao passo em falta (escolher técnico), ou mostra um erro. Nunca um no-op silencioso num ecrã de pagamento.
- **Observado:** handleOpenService faz `if (!serviceType || !vendorId) return;` (linha 699) e handleOpenServiceWithMbWay faz `if (!mbWayPhone)...; if (!serviceType || !vendorId || !serviceType) return;` (linha 792) — retornos silenciosos, sem estado nem mensagem. O cálculo de isCtaDisabled (linhas 1027-1031) não inclui serviceType nem vendorId, portanto o botão está pintado como ativo. Como calculateService também retorna cedo (linha 414) quando falta serviceType/vendorId, checkoutData fica null e o botão mostra só 'Confirmar' sem preço — mas continua clicável e inerte.
- **Causa provável:** Os guards defensivos foram escritos como proteção contra estados impossíveis, mas o cálculo de habilitação do CTA foi feito noutro sítio e nunca incluiu as mesmas condições. Não há uma única fonte de verdade para 'este pedido está completo'.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `contexts/ServiceContext.tsx`
- **Solução:** Incluir `!serviceType || !vendorId` no cálculo de isCtaDisabled (linha 1027) e acrescentar um ctaHint correspondente ('Falta escolher o profissional'). Em complemento, num useEffect de montagem do checkout: se !serviceType || !vendorId, fazer router.replace para /(app)/(modals)/(services)/(request)/select-vendor/${params.serviceId} — o serviceId já vem no parâmetro de rota e é suficiente para recomeçar sem perder o cliente.

### D2-01 — Falha de rede deixa o separador Serviços permanentemente vazio e culpa a zona do utilizador

- **Área:** Descoberta / lista de serviços · **Ecrã:** `app/(app)/(tabs)/list/index.tsx:70-72, 102-128, 550-575`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado · ✅ **verificado adversarialmente** (auditor propôs *critico*, corrigido para *alto*)
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** baixo
- **Reproduzir:** 1. Abrir a app com rede fraca/inexistente (ou com o backend a devolver 5xx). 2. Tocar no separador 'Serviços'. 3. Observar o ecrã. 4. Repor a rede e voltar a tocar no separador Serviços (ou trocar de separador e voltar). 5. Tentar puxar a lista para baixo (pull-to-refresh).
- **Esperado:** Mensagem de erro de ligação distinta do estado vazio ('Não foi possível carregar os serviços — verifique a ligação'), com botão 'Tentar novamente'; ao repor a rede, a lista recarrega.
- **Observado:** O ecrã mostra o estado vazio genérico com o título 'Nenhum serviço encontrado' e o subtítulo 'Assim que houver serviços disponíveis na tua zona, aparecem aqui' (pt_PT.ts:715) — atribui a falha de rede à cobertura geográfica. O pedido só é feito no mount (useEffect com deps []) e os separadores mantêm-se montados, por isso voltar ao separador NÃO refaz o pedido. Não existe RefreshControl em nenhum ficheiro da app (grep confirmado), logo não há pull-to-refresh. A lista só recupera reiniciando a app.
- **Causa provável:** O carregamento inicial está num useEffect com array de dependências vazio (list/index.tsx:70-72) em vez de useFocusEffect ou de um mecanismo de retry; o estado de erro não é distinguido do estado 'sem resultados' — `searchedServiceTypes` fica null/[] tanto num caso como no outro e o ListEmptyComponent só distingue 'com termo de pesquisa' vs 'sem termo'.
- **Ficheiros:** `app/(app)/(tabs)/list/index.tsx`, `app/(app)/(tabs)/home/index.tsx`, `contexts/ServiceContext.tsx`, `translation/resources/pt_PT.ts`, `translation/resources/en_US.ts`
- **Solução:** 1) Introduzir estado `loadError: boolean` em list/index.tsx, posto a true no catch de handleSearch (linha 114) e limpo no then. 2) Adicionar um terceiro ramo ao ListEmptyComponent (linha 480): se `loadError`, mostrar título 'errors.connection.title' + subtítulo 'errors.connection.subtitle' + botão 'Tentar novamente' que chama `handleSelectOperationArea({id:-1, ...})`. 3) Adicionar `refreshControl={<RefreshControl refreshing={loadingSearchedServiceTypes} onRefresh={() => handleSearch(selectedOperationAreas.includes(-1) ? [] : selectedOperationAreas)} />}` à FlatList da linha 380. 4) Trocar o useEffect da linha 70-72 por useFocusEffect com guarda `if (!searchedServiceTypes || loadError)` para recarregar ao voltar ao separador sem refazer pedidos desnecessários. 5) Criar as chaves errors.connection.* em pt_PT.ts e en_US.ts.
- **Nota da verificação:** Li o ficheiro inteiro (586 linhas) e os colaterais. O núcleo do achado é real, mas o auditor descreveu mal o mecanismo e exagerou a severidade.

CONFIRMADO (li o código):
1. `useEffect(() => { handleSelectOperationArea({id:-1,...}) }, [])` — app/(app)/(tabs)/list/index.tsx:70-72. Só corre no mount. O único `useFocusEffect` (linhas 60-68) apenas limpa o termo de pesquisa no blur, não recarrega nada. Com expo-router `Tabs` (app/(app)/(tabs)/_layout.tsx:38-77, sem `unmountOnBlur`), o ecrã fica montado → voltar ao separador não repete o pedido. Correto.
2. Não existe estado de erro distinto: no `.catch` (114-124) `searchedServiceTypes` fica `null`, e o `ListEmptyComponent` (480-576) só ramifica 

### DS-01 — Três fontes de tokens de cor em paralelo, já divergentes — incluindo dois amarelos de marca diferentes

- **Área:** Design system · tokens · **Ecrã:** `constants/Colors.ts:19-35 vs tailwind.config.js:9-33 vs constants/DesignTokens.ts:4-29`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Abrir o separador Histórico (usa DesignTokens) e a seguir a Home ou o Cesto (usam Colors.ts). 2. Comparar o amarelo dos chips/ícones do Histórico com o amarelo da barra de tabs e dos botões. 3. Comparar o verde de "Concluído" no Histórico com o verde de sucesso no Checkout.
- **Esperado:** Uma única fonte de verdade para cor; todos os ecrãs partilham o mesmo âmbar de marca e as mesmas cores semânticas.
- **Observado:** Existem três definições simultâneas:
• constants/Colors.ts — primary #FABB5B, secondary #1B1B1B, success #059669, error #ED4949.
• tailwind.config.js — os mesmos nomes mas **success = #23E69E** (verde-menta completamente diferente de #059669; 1,63:1 sobre branco, falharia tudo). Não é usado hoje (não há nenhuma classe bg-success/text-success no código), mas está armado: a primeira pessoa que escrever `text-success` pinta com a cor errada. Também faltam a tailwind os tokens gray_lighter e bg_schedule que existem em Colors.ts, e todo o bloco `dark-*` da tailwind está morto (darkMode:'class' mas nenhum consumidor).
• constants/DesignTokens.ts — introduz um **segundo amarelo de marca (A: #F4B740)** diferente de #FABB5B, um segundo preto (ink #1B1813 vs secondary #1B1B1B), um segundo verde (green #2FA36B) e um segundo vermelho (red #E0503A). Está a ser usado em 2 sítios (app/(app)/(tabs)/history/index.tsx:9 e components/FilterTabs.tsx:5), ou seja o Histórico tem literalmente uma identidade visual diferente do resto da app.
Contrastes dos tokens novos: mut #8C867A = 3,62:1 (falha AA); mut2 #B8B2A6 = **2,11:1** e é usado para as datas dos serviços em history/index.tsx:298; green #2FA36B = 3,20:1; AD #E39A17 sobre AT #FCF3DC = 2,13:1 (ícones).
- **Causa provável:** Migração incremental para um design novo ("design/app-customer/ui.jsx") feita ecrã a ecrã, criando um ficheiro de tokens paralelo em vez de fazer o corte na paleta global. O comentário no topo de DesignTokens.ts admite-o explicitamente.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/constants/Colors.ts`, `/Users/andrelacerda/dev/app-costumer/constants/DesignTokens.ts`, `/Users/andrelacerda/dev/app-costumer/tailwind.config.js`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(tabs)/history/index.tsx`, `/Users/andrelacerda/dev/app-costumer/components/FilterTabs.tsx`
- **Solução:** Decidir e executar num único PR:
1. Corrigir já o bug latente: tailwind.config.js:12 success "#23E69E" → "#059669" (e alinhar error/link). Custo zero, evita um bug futuro garantido.
2. Fazer o tailwind.config.js importar de constants/Colors.ts em vez de duplicar literais: `const { Colors } = require('./constants/Colors')` e `colors: { ...Colors }`. Passa a ser impossível divergirem.
3. Sobre DesignTokens.ts, escolher explicitamente: (a) se o design novo é o futuro, promovê-lo a paleta global e migrar Colors.ts para ele (grande, mas acaba com a duplicação); (b) se não é, reverter history/index.tsx e FilterTabs.tsx para Colors.ts e apagar DesignTokens.ts. O estado atual — dois amarelos de marca em produção — é o pior dos três.
4. Independentemente da escolha: corrigir mut2 #B8B2A6 (2,11:1) usado nas datas do Histórico → mínimo #767065 (4,5:1).
5. Remover o bloco `dark-*` morto da tailwind ou implementar dark mode a sério.

### DS-02 — 175 cores hardcoded em 60 ficheiros; o fundo principal da app (#FAF7F2) e o roxo dos banners (#6A40DA) não são tokens

- **Área:** Design system · tokens · **Ecrã:** `transversal — 32 ocorrências de #FAF7F2 (ex. app/(app)/(tabs)/profile/index.tsx:155,332; app/(app)/(tabs)/cart/index.tsx:112; app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:133,141,148,207); 6 de #6A40DA (components/warnings/*.tsx)`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** baixo
- **Reproduzir:** 1. `grep -rnoE '#[0-9a-fA-F]{3,8}' app components | wc -l` → 175. 2. Procurar #FAF7F2 em constants/Colors.ts e tailwind.config.js → não existe em nenhum dos dois. 3. Idem #6A40DA.
- **Esperado:** Cores só entram no JSX através de tokens; hexes literais são a exceção justificada, não a regra.
- **Observado:** 175 hexes literais em 60 ficheiros. Os casos que mais custam:
• **#FAF7F2 (32 usos)** — é o fundo creme de praticamente todos os ecrãs modais, bottom sheets e do Perfil, e não existe como token em lado nenhum. Curiosamente Colors.ts tem `bg_schedule: "#FEFBF4"` (um creme *diferente*, usado uma vez) — ou seja o creme ocasional é token e o creme principal não é.
• **#6A40DA (6 usos)** — roxo dos banners de aviso (CompleteYourProfile, BlockedByZone, EmailNeedsToVerify, PhoneNeedsToVerify, GeolocationPermissionBanner). Um roxo saturado numa marca âmbar/preto, replicado por copy-paste em 5 componentes. Se amanhã se quiser mudar a cor dos avisos são 6 edições.
• 48 × `shadowColor:'#000'` e 3 × `'#000000'`/`'#fff'` misturados com `Colors.secondary`/`Colors.support_secondary` para o mesmo efeito.
• Cinzentos ad-hoc que duplicam tokens existentes: #DDDDDD e #dddddd (separadores) quando existe support_primary #E4E3E3; #fbfbfaff, #eae4e4ff, #c1cdd3ff, #a0a0a0, #b0b0b0, #d4d4d4, #eaeaea, #e0e0e0, #f9f9f9, #555555, #333, #2A2A28, #c5c4c4ff.
• #0a7ea4 em components/ThemedText.tsx:95 — é a cor de link do template por omissão do Expo, nunca substituída pela cor `link` #4B68EE do design system.
- **Causa provável:** Ausência de lint que proíba literais de cor no JSX + desenvolvimento a partir de mockups HTML colados diretamente.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/constants/Colors.ts`, `/Users/andrelacerda/dev/app-costumer/components/warnings/CompleteYourProfile.tsx`, `/Users/andrelacerda/dev/app-costumer/components/warnings/BlockedByZone.tsx`, `/Users/andrelacerda/dev/app-costumer/components/warnings/EmailNeedsToVerify.tsx`, `/Users/andrelacerda/dev/app-costumer/components/warnings/PhoneNeedsToVerify.tsx`, `/Users/andrelacerda/dev/app-costumer/components/warnings/GeolocationPermissionBanner.tsx`
- **Solução:** 1. Adicionar a Colors.ts (e à tailwind por reexportação, ver DS-01): `background: "#FAF7F2"` (o creme principal), `warning_purple: "#6A40DA"` (ou, melhor, renomear semanticamente para `notice`), `shadow: "#000000"`, `divider: "#E4E3E3"` (alias de support_primary). Depois substituir por codemod: `sed -i '' 's/"#FAF7F2"/Colors.background/g'` nos 32 sítios (com o import a acompanhar) — mecânico e de baixo risco.
2. Extrair um `components/warnings/NoticeBanner.tsx` que os 5 banners roxos consomem (todos têm a mesma estrutura ícone-a-10% + texto-a-90% + bg roxo + p-3 rounded-xl); elimina 5 duplicações e o hex passa a existir uma vez.
3. ThemedText.tsx:95 — #0a7ea4 → Colors.link.
4. Prevenção: adicionar a regra ESLint `no-restricted-syntax` a bloquear literais que casem com /^#[0-9a-fA-F]{3,8}$/ em ficheiros .tsx de app/ e components/, com allowlist para 'transparent' e rgba() de opacidade. Sem isto os 175 voltam.

### EXTRA-01 — Extra aprovado que fica a precisar de 3DS ou de cartão não é mostrado onde o cliente está

- **Área:** Extras (tempo/peças) · **Ecrã:** `app/(app)/(bottom-sheets)/(services)/extra-request/[extraId].tsx:78-85 + components/app/Services/ServiceExtrasCard.tsx:140-222`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Estar na Home (ou em qualquer ecrã que não seja o overview) com um serviço em curso. 2. O técnico pede um extra com custo; a folha abre automaticamente (ServiceContext.tsx:466-482). 3. Tocar em 'Aceitar' com um cartão que exija 3D Secure — ou sem cartão gravado.
- **Esperado:** Se a cobrança do extra exigir ação do cliente (3DS ou adicionar cartão), essa ação é pedida imediatamente, no mesmo fluxo em que ele acabou de aprovar.
- **Observado:** `respond('approved')` (linhas 78-85) guarda o extra atualizado no contexto e faz `router.back()` sem NUNCA inspecionar `payment_status` nem `payment_validation_url` da resposta. O tratamento desses estados existe e está bem feito — mas apenas em `ServiceExtrasCard`, que é renderizado num único sítio: `overview/[serviceId].tsx:232`. Como a folha é aberta a partir do evento em tempo real onde quer que o cliente esteja, ao fechar volta ao ecrã anterior (tipicamente a Home) e o extra fica aprovado mas por cobrar, sem qualquer sinal. O cliente pensa que aceitou e pagou; o técnico executa o trabalho; a cobrança nunca acontece.
- **Causa provável:** O tratamento do desfecho do pagamento foi implementado no cartão de resumo e não no caminho de aprovação.
- **Ficheiros:** `app/(app)/(bottom-sheets)/(services)/extra-request/[extraId].tsx`, `components/app/Services/ServiceExtrasCard.tsx`, `app/(app)/(pages)/(services)/(open)/overview/[serviceId].tsx`, `contexts/ServiceContext.tsx`
- **Solução:** Em extra-request/[extraId].tsx, no `.then` de `respond`, ler `updated.payment_status`: se for 'requires_action' com `payment_validation_url`, não fechar a folha e abrir logo `WebBrowser.openAuthSessionAsync(...)` seguido de `getServiceExtras()`; se `payment_error === 'no_stored_payment_method'`, manter a folha e mostrar o botão 'Adicionar cartão' (reutilizando o bloco de ServiceExtrasCard.tsx:174-195, extraído para um componente partilhado). Em alternativa mínima, redirecionar para o overview em vez de `router.back()` quando o estado exigir ação.

### FAT-01 — Dados de faturação exigem um nome com exatamente duas palavras — bloqueia a maioria dos nomes portugueses

- **Área:** Pagamentos / Dados de faturação · **Ecrã:** `app/(app)/(modals)/(payments)/invoice-data/index.tsx:216 (e 212)`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Ter uma conta cujo nome tenha três ou mais palavras (ex.: 'André Lacerda Silva'), que é o caso típico em Portugal. 2. Perfil > Dados de faturação. 3. O campo Nome é pré-preenchido a partir da conta pelo reset() da linha 144. 4. Tentar guardar.
- **Esperado:** O nome de faturação aceita nomes compostos, com apóstrofos e hífenes ('Maria João Vasconcelos', "D'Almeida", 'Vila-Nova'), exigindo apenas pelo menos nome próprio e apelido.
- **Observado:** A regra da linha 216 é `value.trim().split(/\s+/).length < 2 || value.trim().split(/\s+/).length > 2` — ou seja, exige EXATAMENTE 2 palavras. Com 3+ palavras o campo fica em erro permanente com a mensagem 'deve conter pelo menos o primeiro e último nome' (que nem sequer descreve a regra aplicada), o botão passa pelo handleSubmit (linha 419) e nunca submete. O utilizador só consegue guardar apagando parte do próprio nome. Além disso a regex da linha 212 `/[^a-zA-Z\sÀ-ÖØ-öø-ÿ]/` rejeita apóstrofo e hífen, ao contrário da do Editar Perfil (edit-profile/index.tsx:283) que os permite.
- **Causa provável:** O `|| length > 2` parece ter sido acrescentado por engano (talvez copiado de uma regra de 'primeiro e último nome' mal traduzida em código). A divergência com edit-profile/index.tsx:283-289, que só valida `< 2`, mostra que as duas validações do mesmo conceito nunca foram unificadas.
- **Ficheiros:** `app/(app)/(modals)/(payments)/invoice-data/index.tsx`, `app/(app)/(modals)/(profile)/edit-profile/index.tsx`, `utils/index.ts`
- **Solução:** 1. Em invoice-data/index.tsx:216 remover a segunda condição, ficando apenas `value.trim().split(/\s+/).length < 2`. 2. Alinhar a regex da linha 212 com a do edit-profile: `/[^a-zA-Z\sÀ-ÖØ-öø-ÿ'-]/`. 3. Extrair ambas as regras para um único `validateFullName(value)` em utils/ e usá-lo nos dois ecrãs (e em qualquer outro que valide nome), para a divergência não voltar. 4. Corrigir a mensagem para descrever a regra real ('Indique pelo menos o nome próprio e o apelido').

### HIST-01 — "Carregar mais" substitui a lista de histórico em vez de a concatenar

- **Área:** Histórico · **Ecrã:** `contexts/ServiceContext.tsx:585-617 (linha 601) + app/(app)/(tabs)/history/index.tsx:399`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Ter uma conta com mais serviços do que uma página do backend. 2. Abrir a aba Histórico. 3. Tocar em 'Carregar mais' no fundo da lista.
- **Esperado:** A segunda página é acrescentada ao fundo da lista; os serviços já vistos continuam visíveis.
- **Observado:** `getHistoryServices` faz sempre `setHistoryServices(data.services)` (linha 601), independentemente do offset. Chamado a partir de history/index.tsx:399 com `offset === undefined` → offset = `historyServices.length` → o backend devolve APENAS a página seguinte → a lista visível passa a conter só essa página; os primeiros N serviços desaparecem do ecrã. O utilizador tem de sair e voltar à aba (useFocusEffect refaz com offset 0) para os reaver. Efeito colateral em cascata: o detalhe do histórico (HIST-02) procura o serviço nesta mesma lista, pelo que serviços 'empurrados para fora' deixam de poder ser abertos.
- **Causa provável:** A mesma função serve o primeiro carregamento e a paginação, sem distinguir os dois casos.
- **Ficheiros:** `contexts/ServiceContext.tsx`, `app/(app)/(tabs)/history/index.tsx`
- **Solução:** Em contexts/ServiceContext.tsx substituir a linha 601 por uma atualização condicional ao offset efetivo: calcular `const effectiveOffset = offset !== undefined ? offset : historyServices.length;` antes do POST e depois fazer `setHistoryServices(prev => effectiveOffset === 0 ? data.services : [...prev, ...data.services]);`, deduplicando por `id` para tolerar páginas sobrepostas.

### HIST-02 — Detalhe do histórico só lê da lista em memória — ecrã vazio com "Invalid Date" fora do caminho feliz

- **Área:** Histórico · **Ecrã:** `app/(app)/(pages)/(services)/history/[serviceId].tsx:45-54, 251`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Abrir a aba Histórico e tocar em 'Carregar mais' (ver HIST-01) — ou fazer deep-link direto para /(app)/(pages)/(services)/history/{id} depois de matar a app. 2. Tocar num serviço da primeira página que já não esteja na lista atual.
- **Esperado:** O ecrã vai buscar o serviço ao backend por id (GET_SERVICE_DETAILS) quando não o encontra em memória, ou mostra um estado de erro claro.
- **Observado:** O efeito das linhas 45-54 procura exclusivamente em `historyServices` e, se não encontrar, deixa `service` a null — sem qualquer pedido à API e sem estado de erro. O ecrã renderiza a casca completa: avatar genérico, nome vazio, morada vazia, ' km' sem valor, e na linha 251 `renderDate(service?.created_at as string)` recebe undefined → `new Date(undefined)` → o utilizador vê literalmente 'Invalid Date'. Nota adicional: `setIsLoading(true)` e `setIsLoading(false)` estão no mesmo tick síncrono (linhas 46 e 53), pelo que os esqueletos cuidadosamente desenhados neste ficheiro nunca chegam a aparecer.
- **Causa provável:** Ecrã desenhado como vista sobre a cache da lista, sem fonte de verdade própria.
- **Ficheiros:** `app/(app)/(pages)/(services)/history/[serviceId].tsx`, `contexts/ServiceContext.tsx`, `constants/ApiRoutes.ts`
- **Solução:** No efeito das linhas 45-54: se não encontrar em `historyServices`, chamar `api.get(API_ROUTES.GET_SERVICE_DETAILS(String(serviceId)))` e alimentar o estado local com `response.data.data.service`; manter `isLoading` verdadeiro durante o pedido (mover o `setIsLoading(false)` para o `.finally`). Blindar `renderDate` com uma verificação `Number.isNaN(parsedDate.getTime())` que devolva string vazia, como já é feito em `renderShortDate` de history/index.tsx:101.

### INFO-01 — O 'Desde X €' do detalhe é o mínimo de TODOS os técnicos, mas o ecrã seguinte só mostra 3 — a promessa de preço pode não existir na lista

- **Área:** Funil imediato / preço · **Ecrã:** `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:66-82 vs select-vendor/[serviceId].tsx:96`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Escolher um serviço numa zona com mais de 3 técnicos disponíveis, em que o mais barato não esteja entre os 3 primeiros da resposta do backend.
2. Ler o 'Desde' na barra inferior do ecrã de detalhe.
3. Tocar em 'Pedir já' → 'Imediato' e comparar com os preços dos 3 cartões apresentados.
- **Esperado:** O 'Desde' corresponde ao preço mais baixo que o cliente vai efetivamente poder escolher no passo seguinte.
- **Observado:** info.tsx calcula minVendorRate como Math.min de TODOS os rates devolvidos pelo endpoint (linhas 69-72), sem qualquer corte. select-vendor faz `const vendorsSlice = _vendors.slice(0, 3)` (linha 96) sobre uma lista ordenada apenas pela chave numérica do objeto devolvido (convertDataIntoArray, linhas 56-60) — não por preço. Se o técnico mais barato estiver na 4.ª posição ou além, o cliente vê 'Desde 25 €' e a seguir só cartões acima disso. Os dois ecrãs derivam preço de conjuntos diferentes da mesma resposta.
- **Causa provável:** O 'Desde' real foi acrescentado no detalhe (build 15) reutilizando a resposta completa do endpoint, enquanto o corte aos 3 técnicos foi uma decisão de UI feita no ecrã seguinte. Ninguém alinhou os dois cálculos.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx`, `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx`
- **Solução:** Alinhar os dois: em select-vendor, ordenar por `rate` ascendente antes do slice(0,3) — assim o mínimo global é sempre o 1.º cartão e o 'Desde' passa a ser verdadeiro por construção. Se a ordem atual dos 3 for uma decisão deliberada de curadoria, então fazer o inverso: em info.tsx calcular o mínimo apenas sobre os 3 primeiros (`list.slice(0,3)`) usando exatamente a mesma função de ordenação, extraída para um utilitário partilhado (ex.: utils/vendors.ts::pickTopVendors) usado pelos dois ecrãs e por cart-technicians.

### INFO-02 — Guard baseado em userData em vez de session: utilizador autenticado pode ser atirado para o formulário de morada de convidado, e o convidado é obrigado a repetir a morada em cada tentativa

- **Área:** Funil imediato / roteamento guest vs autenticado · **Ecrã:** `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:86 e 103`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** Caso A (convidado, sempre): 1. Sem sessão, escolher um serviço, 'Pedir já' → 'Imediato'. 2. Preencher a morada de convidado e confirmar — chega a select-vendor. 3. Voltar atrás para o detalhe do serviço e tocar outra vez em 'Pedir já' → 'Imediato'.
Caso B (autenticado, corrida): 1. Fazer login e, imediatamente a seguir (antes de /auth/me responder), navegar até um serviço e tocar em 'Pedir já' → 'Imediato'. Reproduz-se melhor com rede lenta ou com o backend a demorar em /auth/me.
- **Esperado:** Caso A: como o convidado já tem morada válida em guestSession, avança direto para a lista de técnicos. Caso B: um utilizador com sessão nunca vê o formulário de morada de convidado.
- **Observado:** goToSelectVendors faz `if (!userData) { router.navigate('.../address/guest'); return; }` (linha 86) — e o mesmo em scheduleService (linha 103). Para um convidado, userData é SEMPRE null, portanto o ecrã de morada é reaberto em todas as tentativas mesmo com guestSession.guest_address preenchido (o formulário vem pré-preenchido, mas é um passo extra em cada pedido). Para um utilizador autenticado, userData vem de useAsyncStorage('user-data') e é null durante a hidratação e sempre que /auth/me falha por rede (SessionContext.tsx:59 e 122-153) — nessa janela, `session` existe mas `userData` não, e o utilizador com conta cai no formulário de convidado. Pior: a morada aí escrita é gravada só em guestSession (address/guest:213) e nunca é enviada no POST de abertura do serviço quando há sessão (checkout:722-728 só junta payload.address se isGuest), portanto o que ele escreveu é silenciosamente descartado.
- **Causa provável:** `userData` está a ser usado como proxy de 'está autenticado', quando o sinal correto é `session`. O contexto expõe ambos e o ecrã escolheu o errado.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx`, `contexts/SessionContext.tsx`, `contexts/GuestSessionContext.tsx`, `app/(app)/(modals)/(services)/(request)/address/guest/index.tsx`
- **Solução:** Reescrever os dois guards com a mesma lógica do cesto (cart/index.tsx:42-44), que já está correta: `const hasAddress = session ? !!userData?.address : !!(guestSession?.guest_address?.latitude && guestSession?.guest_address?.longitude);`. Depois: se `session && !userData` → esperar (mostrar loading no botão) em vez de navegar; se `!session && !hasAddress` → address/guest; se `!session && hasAddress` → seguir direto para select-vendor; se `session && !userData.address` → (address)/update; se `session && !userData.allowed_by_zone` → blocked-by-zone. Extrair esta decisão para um hook partilhado (ex.: hooks/useBookingGuard.ts) e usá-lo também em cart/index.tsx e address/guest.

### NET-01 — Erro de rede no histórico rebenta dentro do próprio catch; getOpenService/getPendingService sem tratamento de erro

- **Área:** Robustez / rede · **Ecrã:** `contexts/ServiceContext.tsx:603-613 (linha 604), :240-248, :290-293`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Pôr o dispositivo em modo avião. 2. Trazer a app para primeiro plano (app/(app)/_layout.tsx:22-31 dispara getOpenService, getPendingService e getHistoryServices). 3. Abrir a aba Histórico.
- **Esperado:** Falha de rede produz um estado de erro tratado e uma mensagem ao utilizador; nenhuma rejeição por tratar.
- **Observado:** Linha 604: `if (error.response.status !== 401)` — num erro de rede (timeout, offline, DNS) o axios entrega um erro SEM `response`, pelo que o acesso a `.status` lança TypeError DENTRO do catch. Consequências: o diálogo de erro nunca aparece, a rejeição fica por tratar e — como não há Sentry ativo (app/_layout.tsx) — o incidente não deixa rasto nenhum. Nas linhas 240-248 e 290-293, `getOpenService` e `getPendingService` são funções async com `await api.get(...)` sem try/catch e são chamadas sem `.catch()` em app/(app)/_layout.tsx:24-25: qualquer regresso a primeiro plano sem rede gera rejeições não tratadas. Padrão a confirmar noutros domínios: procurar `error.response.status` sem optional chaining em todo o repositório.
- **Causa provável:** Assunção de que todo o erro axios tem `response`.
- **Ficheiros:** `contexts/ServiceContext.tsx`, `app/(app)/_layout.tsx`, `contexts/ApiContext.tsx`
- **Solução:** Trocar a linha 604 por `if (error?.response?.status !== 401)`. Envolver os corpos de `getOpenService` e `getPendingService` em try/catch, mantendo o estado anterior em caso de falha (não fazer `setOpenService(null)` num erro de rede — isso apagaria um serviço em curso do ecrã). Fazer um varrimento global por `\.response\.status` sem `?.` e corrigir todas as ocorrências.

### OBS-01 — Sem captura de crashes em produção: Sentry integralmente comentado e, mesmo na versão comentada, restrito a __DEV__

- **Área:** Observabilidade · **Ecrã:** `app/_layout.tsx:55,64-82`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Ler app/_layout.tsx:55 — o import `import * as Sentry from '@sentry/react-native'` está comentado.
2. Ler app/_layout.tsx:64-82 — todo o bloco `Sentry.init({...})` está dentro de um comentário de bloco.
3. Ler app.config.ts:105-113 — o plugin `@sentry/react-native/expo` também está comentado na lista de plugins.
4. Confirmar em package.json que `@sentry/react-native: ~6.10.0` continua instalado (dependência paga em peso do bundle, sem qualquer benefício).
- **Esperado:** Uma app de produção com pagamentos, zero testes automatizados e utilizadores reais precisa de reporte de crashes e de erros não capturados.
- **Observado:** Não existe qualquer captura de crashes. Pior: mesmo que alguém descomente o bloco tal como está, a linha 78 diz `enabled: __DEV__` — ou seja, o Sentry ficaria ativo **apenas em desenvolvimento**, exatamente ao contrário do pretendido, e produção continuaria cega. A linha 69 tem ainda `sendDefaultPii: true` e a 74 `Sentry.mobileReplayIntegration()` com `replaysOnErrorSampleRate: 1` — se for reativado assim, passa a enviar IP, dados de utilizador e gravações de ecrã (incluindo o formulário de cartão) para o Sentry, o que reabre o problema de privacidade por outra porta. O impacto prático da ausência é direto e visível noutros achados deste relatório: o crash de deep link em edit-payment-method (SEC-06) e qualquer exceção nos parsers de params passam sem deixar rasto.
- **Causa provável:** Desativado durante uma investigação e nunca reposto; a configuração ficou congelada num estado intermédio.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/app/_layout.tsx`, `/Users/andrelacerda/dev/app-costumer/app.config.ts`, `/Users/andrelacerda/dev/app-costumer/package.json`
- **Solução:** Reativar com a configuração corrigida: descomentar o import (_layout.tsx:55) e o plugin (app.config.ts:105-113), e substituir o bloco por `Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, enabled: !__DEV__, environment: Constants.expoConfig?.extra?.APP_ENV ?? 'production', sendDefaultPii: false, tracesSampleRate: 0.2, release: packageInfo.version })` — sem `mobileReplayIntegration` (ou, se for mesmo desejado, com `maskAllText: true` e `maskAllImages: true`). Mover o DSN para variável de ambiente/EAS secret em vez de o deixar em código, tal como em ANL-01. Envolver o `<Slot/>` com `Sentry.wrap()` para apanhar erros de render. Se a decisão for não usar Sentry, remover a dependência do package.json em vez de a manter morta.

### PAY-01 — WalletContext usa axios cru sem refresh de token — cartões existentes aparecem como 'Sem métodos de pagamento'

- **Área:** Pagamentos · **Ecrã:** `contexts/WalletContext.tsx:34-47`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Iniciar sessão e adicionar um cartão. 2. Deixar a app em segundo plano até o access token expirar (ou forçar a expiração). 3. Reabrir a app e ir a Perfil > Pagamentos.
- **Esperado:** O 401 deve acionar o refresh do token e repetir o pedido, ou — se o refresh falhar — mostrar um erro claro e/ou terminar a sessão. O utilizador nunca deve ver a sua carteira como vazia estando ela cheia.
- **Observado:** O fetch usa `axios.get(...)` diretamente (linha 34) e não a instância `api` do ApiContext, pelo que fica fora dos interceptores que fazem o refresh e a repetição do pedido (ApiContext.tsx:38-83 e 156-170). O catch limita-se a `console.error(error)` (linha 44), `paymentMethods` fica `null` e o ecrã de Pagamentos renderiza o ListEmptyComponent 'Sem Métodos de Pagamento' (components/app/Profile/Payments.tsx:102-115) como se o utilizador não tivesse cartão nenhum. O mesmo padrão de axios cru repete-se em SessionContext.tsx:63 (getAvailableGenders), 92 (changeUserLanguage) e 127 (fetchAndSaveUserData).
- **Causa provável:** O WalletProvider está montado acima do consumo de useApi na árvore (app/_layout.tsx:334, dentro do ApiProvider mas escrito antes de o padrão da instância api estar consolidado) e passou a montar o header Authorization à mão a partir de `session`. A ausência de estado de erro fecha o ciclo: falha silenciosa indistinguível de carteira vazia.
- **Ficheiros:** `contexts/WalletContext.tsx`, `contexts/ApiContext.tsx`, `components/app/Profile/Payments.tsx`
- **Solução:** 1. Injetar `const { api } = useApi()` no WalletProvider e trocar o `axios.get(API_ROUTES.GET_PAYMENTS_METHODS, {headers...})` por `api.get(API_ROUTES.GET_PAYMENTS_METHODS)` — o Accept-Language e o Authorization já são postos pelo interceptor (ApiContext.tsx:41 e 70). 2. Acrescentar ao contexto um estado `paymentMethodsError` e distingui-lo de lista vazia. 3. Em Payments.tsx, quando houver erro, mostrar um estado de erro com botão 'Tentar novamente' que chama fetchPaymentMethods(), em vez do ListEmptyComponent. 4. Aproveitar para corrigir o useFocusEffect de Payments.tsx:20-24, cujo array de dependências vazio congela `paymentMethods` no valor inicial (null) e força um refetch em todos os focos.

### PAY-04 — É possível confirmar o pagamento sem que o preço alguma vez tenha sido mostrado

- **Área:** Checkout · preço · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:1027-1031 e 1824-1854`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Abrir o checkout com rede instável ou provocar erro no POST /customer/services/calculate. 2. Fecha-se o diálogo "Erro do servidor" (fecha sozinho ao fim de 2 s) e o ecrã permanece. 3. Reparar que o total e o subtotal ficam em branco e o botão mostra apenas "Confirmar e pagar" sem valor. 4. Tocar no botão.
- **Esperado:** Sem preço calculado não deve ser possível pagar: o CTA fica desativado com indicação de "não foi possível calcular o preço" e um botão de tentar novamente.
- **Observado:** `isCtaDisabled` só considera `!paymentMethod || isLoading || openingService || (isGuest && otpState !== 'verified')` — não inclui `!checkoutData`. Com checkoutData a null o botão fica ativo (fundo âmbar) e dispara handleOpenService normalmente; o serviço é criado e o cartão cativado por um valor que o cliente nunca viu. Em paralelo, `renderMoney(null)` devolve `false` (utils/money/index.ts:2-4), pelo que o subtotal e o total simplesmente desaparecem em vez de indicarem erro — não há sinal visual de que algo falhou.
- **Causa provável:** O tratamento de erro do calculateService limita-se a um diálogo efémero (o `router.back()` está comentado nas linhas 453-457) e o estado de erro não é propagado para o CTA nem para o bloco de totais.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `utils/money/index.ts`
- **Solução:** 1) Acrescentar `|| !checkoutData` a `isCtaDisabled` (linha 1027) e um `ctaHint` dedicado ("Não foi possível calcular o preço. Toca para tentar de novo."). 2) Guardar um `calculateError` no catch do calculateService (linha 446) e, quando existir, substituir o cartão de totais por um estado de erro com botão "Tentar novamente" que chama calculateService(). 3) Fazer `renderMoney` devolver `"—"` em vez de `false` para valores nulos, ou tipá-la como `string | null` e tratar explicitamente nos 4 sítios do checkout (1712, 1724, 1743, 1770) — hoje um `false` renderiza silenciosamente como vazio.

### PAY-05 — Rascunho de checkout não é limpo depois de um pagamento com cartão confirmado pelo ecrã de espera: voucher já usado é reaplicado na reserva seguinte

- **Área:** Checkout · rascunho e vouchers · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/card/waiting.tsx:47-55 vs app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:515-529`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Checkout de um serviço com cartão, aplicar um código de desconto e preencher o NIF. 2. Autorizar no 3DS de forma que o retorno seja ambíguo (aprovar na app do banco e voltar manualmente à Piquet, ou fechar o browser 3DS) — a app cai em checkout/card/waiting. 3. O polling confirma o pagamento e navega para card/confirmed → "Ir para a página inicial". 4. Voltar a reservar o MESMO tipo de serviço e abrir o checkout.
- **Esperado:** Pagamento concluído ⇒ o rascunho morre. A nova reserva começa do zero, sem voucher e sem código preenchido.
- **Observado:** `setCheckoutDraft(null)` só existe em goToWaitAccept ([serviceId].tsx:518) e no signout (ServiceContext.tsx:153). O caminho 3DS-ambíguo → card/waiting → goToConfirmed nunca limpa o rascunho, e o caminho MB Way com sucesso ([serviceId].tsx:836-856) também não. Resultado: ao reabrir o checkout do mesmo service_type, a reidratação (linhas 282-317) repõe `voucher`, `voucherCode` e `customerNIF`; o useEffect [voucher] dispara calculateService com `voucher_id` de um cupão já consumido e o POST de abertura volta a enviá-lo. O cliente vê "Desconto de X% aplicado" que pode não se materializar (ou, no pior caso, um cupão de uso único a ser usado duas vezes).
- **Causa provável:** A limpeza do rascunho ficou amarrada a uma única rota de sucesso (goToWaitAccept) em vez de ao evento "pagamento concluído", que tem três saídas diferentes (deep link 3DS, polling do card/waiting, e MB Way).
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/card/waiting.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `contexts/ServiceContext.tsx`
- **Solução:** Centralizar: criar `clearCheckoutState()` no ServiceContext (limpa checkoutDraft + item do cesto) e chamá-la em TODAS as transições para um estado pago — card/waiting.tsx:47-55 (goToConfirmed), ServiceContext.tsx:522-526 (handlePaymentConfirmed, que serve o MB Way) e [serviceId].tsx:515-529 (goToWaitAccept). Em complemento, dar validade ao rascunho: guardar um `createdAt` no CheckoutDraft (ServiceContext.tsx:21-29) e descartá-lo na reidratação se tiver mais de ~30 minutos.

### PAY-06 — O guard beforeRemove pode bloquear a saída do checkout depois de um pagamento com cartão bem sucedido

- **Área:** Checkout · navegação pós-pagamento · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:336-347 (guard) vs 515-529, 645-677 (navegações)`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** risco_potencial
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Pagar com cartão e concluir o 3DS com sucesso (deep link piquet.customer:://validation/success). 2. Observar a stack de navegação: o esperado é ficar no wait-accept sem o checkout por baixo. 3. Repetir para o caminho de recusa (router.dismissTo card/denied) e para o caminho ambíguo (dismissTo card/waiting).
- **Esperado:** Depois do desfecho do 3DS o modal de checkout é removido da stack e o cliente fica no ecrã de espera/recusa; carregar em back não devolve o checkout já pago.
- **Observado:** O listener `beforeRemove` faz `e.preventDefault()` sempre que `openingService === true` (linhas 337-344). Todas as navegações do fluxo de cartão acontecem exatamente nesse estado: goToWaitAccept (dismissAll + navigate), o dismissTo para card/denied e o dismissTo para card/waiting correm DENTRO do `await open3dsBrowser(...)`, ou seja, antes do `.finally` que repõe openingService=false (linha 783). Se o preventDefault bloquear estas ações (comportamento normal do React Navigation para ações que removem o ecrã), o wait-accept é empilhado por cima de um checkout que continua vivo na stack. O setTimeout de 1000 ms com setOpeningService(false) antecipado no ramo MB Way ([serviceId].tsx:842-855) é forte indício de que este conflito já foi sentido — e foi contornado num ramo só, criando o PAY-02.
- **Causa provável:** O guard anti-saída foi escrito a pensar no gesto do utilizador (back durante o processamento) mas não distingue "saída provocada pelo utilizador" de "saída programática de sucesso".
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`
- **Solução:** Introduzir um `allowLeaveRef` (ref booleano). Pôr `allowLeaveRef.current = true` imediatamente antes de qualquer navegação programática (goToWaitAccept, os dois router.dismissTo do open3dsBrowser e o router.dismissTo do ramo MB Way) e alterar o listener para `if (allowLeaveRef.current || !openingService) { ...track/return } else { e.preventDefault(); }`. Com isso pode eliminar-se o setTimeout de 1s do MB Way, fechando também o PAY-02. Provar com execução: instrumentar o listener com um log e verificar no simulador se o preventDefault é ou não atingido nas 4 navegações.

### PAY-07 — Convidado que escolhe cartão é silenciosamente passado para MB Way ao validar o telemóvel

- **Área:** Checkout · seleção de método · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:247-276`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Fluxo de convidado (sem login) até ao checkout. 2. Adicionar/escolher um cartão em "Alterar" (a lista de convidado vem do getBillingInfo, linhas 386-388) — o cartão fica selecionado e visível em "Pagamento". 3. Só depois validar o telemóvel por OTP (obrigatório: o CTA está bloqueado até otpState === 'verified'). 4. Observar o cartão "Pagamento" logo após a validação.
- **Esperado:** A validação do telemóvel não muda o método de pagamento escolhido pelo cliente.
- **Observado:** handleVerifyOtp faz `setSession(access_token)` (linha 954) ⇒ `isGuest` passa a false e `paymentMethods` (WalletContext) está ainda a null enquanto o fetch decorre (WalletContext.tsx:50-59). O efeito das linhas 247-276 corre com `methods = null`: `preferredMethod` = 'mb_way', `paymentMethodInitializedRef` já é true e `methods?.find(...)` devolve undefined ⇒ `setPaymentMethod('mb_way')`. O cartão escolhido é substituído por MB Way. Se o número MB Way já estiver pré-preenchido (efeito das linhas 178-188, que usa o telemóvel acabado de validar), o toque seguinte em "Confirmar e pagar" cobra por MB Way em vez do cartão que o cliente escolheu.
- **Causa provável:** O updater trata "lista ainda não carregada" (null) como "o método já não existe" e cai no preferido. Falta distinguir `null` (a carregar) de `[]`/lista sem o cartão.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `contexts/WalletContext.tsx`
- **Solução:** No efeito (linha 263), sair cedo enquanto a lista está a carregar: `if (methods == null) return;` antes de qualquer setPaymentMethod, e usar `isLoadingPaymentMethods` do WalletContext como segunda guarda. Adicionalmente, ao transitar de convidado para autenticado, tentar reconciliar por `last4`+`brand` em vez de por `id`, já que o id do método pode mudar ao passar de guest_token para conta.

### PAY-08 — Agendamento antigo em memória contamina uma reserva imediata: data errada no checkout e serviço criado como agendado

- **Área:** Checkout · agendamento e preço · **Ecrã:** `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx:148-159 + checkout/[serviceId].tsx:413-462, 743-752`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** edge-case · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Fazer uma reserva AGENDADA completa (schedule-service preenche dataToMakeSchedule, schedule-service.tsx:268-278) e concluir o pagamento. 2. Sem fechar a app, ir ao Cesto, adicionar um serviço e escolher "Imediato". 3. Escolher técnico em cart-technicians e avançar para o checkout.
- **Esperado:** Reserva imediata: o checkout mostra "Hoje, assim que aceitar", o preço é o de serviço imediato e o POST leva scheduled:false.
- **Observado:** `setDataToMakeSchedule(null)` só existe em três sítios (select-service-type/info.tsx:123 e :184, schedule-service.tsx:400) — nenhum deles no caminho do Cesto. startBooking (cart-technicians:148-159) define apenas `setScheduledService(mode === 'scheduled')` e navega direto para o checkout. Com o dataToMakeSchedule antigo ainda em memória: bookingDateLabel ([serviceId].tsx:1009-1011) mostra a data da reserva ANTERIOR, calculateService envia scheduled:true (linha 417) e o POST de abertura envia `schedule` com o dia/horas antigos (linhas 743-749). O cliente paga um serviço com data errada.
- **Causa provável:** Estado de agendamento vive no ScheduleContext sem dono claro do ciclo de vida; cada novo fluxo de reserva assume que quem veio antes limpou.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx`, `app/(app)/(tabs)/cart/index.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `contexts/ScheduleContext.tsx`, `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx`
- **Solução:** 1) Em cart-technicians/index.tsx:150 e em cart/index.tsx:93 (resumeQueue), chamar `setDataToMakeSchedule(null)` sempre que mode !== 'scheduled'. 2) Melhor ainda, limpar sempre o dataToMakeSchedule ao concluir com sucesso um pedido (junto do clearCheckoutState do PAY-05) — hoje sobrevive a toda a sessão. 3) Coerência de fonte de verdade no checkout: `payload.scheduled` (linha 743) usa só dataToMakeSchedule, enquanto calculateService (linha 417) usa `dataToMakeSchedule || scheduledService`; alinhar os dois para o mesmo predicado, sob pena de calcular um preço agendado e abrir um serviço imediato.

### PAY-09 — NIF inválido é descartado em silêncio: fatura emitida sem contribuinte sem o cliente saber

- **Área:** Checkout · faturação · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:734-736 e 813-815`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. No checkout, escrever no campo NIF um número com 9 dígitos mas dígito de controlo errado (ex.: 123456780) — validateNIF devolve false e aparece "NIF inserido não é válido.". 2. Não corrigir. 3. Tocar em "Confirmar e pagar".
- **Esperado:** Ou o pagamento é bloqueado até o NIF ficar válido (ou vazio), ou o cliente é avisado explicitamente de que a fatura será emitida sem NIF.
- **Observado:** O CTA continua ativo (`error` não entra em isCtaDisabled, linha 1027) e o payload omite o campo: `if (customerNIF && ... && !error) payload.nif = ...`. O pagamento avança e a fatura sai sem contribuinte. O cliente escreveu o NIF, viu uma mensagem vermelha discreta a meio de um ecrã longo e não tem forma de perceber que a informação foi ignorada — e uma fatura de serviço doméstico sem NIF não é recuperável do lado do cliente (implica nota de crédito + refaturação).
- **Causa provável:** A regra "não enviar NIF inválido" foi implementada no payload em vez de na porta de entrada (o botão), e o campo está rotulado "NIF (opcional)", o que dilui a gravidade percebida.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `utils/index.ts`, `translation/resources/pt_PT.ts`
- **Solução:** 1) Acrescentar `|| !!error` a isCtaDisabled (linha 1027) e um ctaHint específico: "Corrige o NIF ou apaga o campo para continuar." 2) Em alternativa (se o produto preferir não bloquear), mostrar um diálogo de confirmação explícito antes do POST: "O NIF introduzido não é válido — a fatura será emitida sem contribuinte. Continuar?". 3) Verificar o mesmo padrão em (modals)/(payments)/invoice-data/index.tsx, que aí está correto (usa handleSubmit, linha 419).

### PERF-01 — Arranque: 3650 ms de espera fixa + 18 fontes bloqueiam o primeiro conteúdo e todos os providers

- **Área:** Arranque / time-to-first-content · **Ecrã:** `app/_layout.tsx:117-128, 204-206, 258-310`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Fechar a app por completo (kill). 2. Abrir a app. 3. Cronometrar desde o toque no ícone até aparecer conteúdo real (grelha de categorias da Home).
- **Esperado:** Conteúdo útil no ecrã em ~1-1,5 s; enquanto a animação de marca corre, os providers já estão montados e os pedidos à API (categorias, serviço aberto, agendamentos) já foram disparados, para que a Home apareça preenchida.
- **Observado:** Sequência estritamente serial: (a) `if (!fontsLoaded) return <SafeAreaView backgroundColor=primary>` (linha 204) — ecrã âmbar vazio enquanto as 18 fontes Poppins carregam; (b) só depois monta o splash animado e o `onLayout` dispara `SplashScreen.hideAsync()` seguido de `setTimeout(..., 3650)` (linhas 121-125); (c) só quando `showAnimatedSplash` passa a false (linha 258) é que `<GestureHandlerRootView>` … `<CartProvider>` e o `<Slot/>` montam (linhas 319-355). Nenhum pedido à API arranca antes disso — SessionContext, ApiContext e ServiceContext ainda não existem. O tempo até ao primeiro conteúdo é fontes + 3650 ms + leitura do SecureStore + latência da rede.
- **Causa provável:** O ecrã de splash animado foi implementado como um early-return no componente Root em vez de uma overlay por cima da árvore já montada. O 3650 ms é um número mágico escolhido para a duração do GIF, não para o tempo de carregamento real.
- **Ficheiros:** `app/_layout.tsx`, `app/(app)/_layout.tsx`, `contexts/SessionContext.tsx`, `assets/images/piquet-animated-logo.gif`
- **Solução:** Inverter a estrutura: montar SEMPRE a árvore de providers + <Slot/> e desenhar o splash animado como overlay absoluta por cima (`<View style={StyleSheet.absoluteFill}>` com zIndex alto), removendo os early-returns das linhas 204 e 258. Substituir o `setTimeout(3650)` por uma corrida: `Promise.race([animacaoMinima(1200), prontoParaMostrar])`, onde `prontoParaMostrar` resolve quando fontsLoaded && session lida do SecureStore. Assim a animação continua a ver-se, mas em paralelo com o carregamento — e desaparece assim que houver conteúdo. Manter um mínimo de ~1,2 s só para a animação não piscar.

### PERF-02 — MB WAY: o polling do estado do pagamento pode nunca arrancar e o cliente fica preso no ecrã de espera sem timeout

- **Área:** Pagamentos / recuperação · **Ecrã:** `contexts/ServiceContext.tsx:532-563`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** raro · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Ter um serviço aberto ou pendente de aceitação (ex.: um pedido anterior ainda por aceitar → `servicePendingAcceptance` preenchido pelo `getPendingService()` do app/(app)/_layout.tsx:25). 2. Iniciar um novo pedido e pagar por MB WAY. 3. Chegar ao ecrã mb-way/waiting.
- **Esperado:** O polling arranca, verifica o estado a cada 10 s e, ao fim de 24 tentativas (4 min), chama o `onTimeout` que mostra a mensagem de timeout e o botão "Ir para a página inicial".
- **Observado:** `verifyStatus` faz `if (!serviceId || openService || servicePendingAcceptance) return;` (linha 533) e sai em silêncio. Como o `setInterval` nunca é criado, o `onTimeout` passado pelo ecrã (mb-way/waiting.tsx:85) nunca é invocado → `timedOut` fica sempre false → nunca aparece a mensagem de timeout nem o botão de saída. O contador visual de 4:00 (waiting.tsx:46-51) continua a correr até 0:00 e fica lá parado. O único caminho de saída é o botão "Cancelar pedido", que cancela um pagamento que pode já ter sido autorizado.
- **Causa provável:** A guarda foi escrita para impedir polling duplicado, mas usa estado global do contexto (`openService`/`servicePendingAcceptance`) que pode estar preenchido por um serviço COMPLETAMENTE diferente. O ecrã não tem defesa própria contra o arranque falhado.
- **Ficheiros:** `contexts/ServiceContext.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx`, `app/(app)/_layout.tsx`
- **Solução:** Duas alterações: (a) em ServiceContext.tsx:533 remover `openService || servicePendingAcceptance` da guarda — a proteção contra polling duplicado já é feita pelo `stopVerifyStatus()` da linha 535 e pela auto-defesa do `paymentStatusIntervalRef.current !== intervalId` (linha 540); (b) fazer `verifyStatus` devolver um boolean (`false` quando não arranca) e, em mb-way/waiting.tsx:84-86, se devolver false, chamar `setTimedOut(true)` imediatamente para o cliente ter sempre uma saída. Idealmente, replicar o padrão auto-contido de card/waiting.tsx (que faz o seu próprio polling sem depender do contexto).

### PERF-03 — Pedidos autenticados fora do ApiContext: sem refresh de token e com signOut() ao primeiro 401

- **Área:** Rede / sessão · **Ecrã:** `contexts/SessionContext.tsx:127-152`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Autenticar-se. 2. Deixar a app em background tempo suficiente para o JWT expirar. 3. Voltar a abrir a app.
- **Esperado:** O pedido a /auth/me passa pelo interceptor do ApiContext, que deteta o `exp` expirado, renova o token via /auth/refresh e repete o pedido. O utilizador continua autenticado.
- **Observado:** `fetchAndSaveUserData` usa `axios.get(API_ROUTES.AUTH_ME, { headers: { Authorization: Bearer ${session} } })` — `axios` global, não a instância `api` do ApiContext. Não há interceptor de pedido (sem verificação de `exp`) nem de resposta (sem retry com refresh). No catch (linhas 148-152): `if (error?.response?.status === 401 || 403) signOut();` → o utilizador é deslogado em vez de o token ser renovado. O mesmo padrão de axios cru repete-se em WalletContext.tsx:34 (métodos de pagamento — a lista fica vazia no checkout), SessionContext.tsx:63 (géneros), :92 (locale) e :107 (logout). Este efeito é disparado sempre que `session` muda (SessionContext.tsx:155-160) e ainda por app/(app)/_layout.tsx:27-29 em cada regresso ao primeiro plano quando o email ou o telefone não estão verificados.
- **Causa provável:** Estes ficheiros foram escritos antes do ApiContext (ou não puderam usá-lo por ordem de providers: SessionProvider é o PAI do ApiProvider, logo não pode consumir `useApi`). A dependência circular foi resolvida com axios cru em vez de extrair uma instância partilhada.
- **Ficheiros:** `contexts/SessionContext.tsx`, `contexts/WalletContext.tsx`, `contexts/ApiContext.tsx`, `app/(app)/_layout.tsx`, `app/_layout.tsx`
- **Solução:** Extrair a instância axios e o interceptor de refresh para um módulo puro (ex.: `services/http.ts`) que não dependa de React: exporta `http` (AxiosInstance) e aceita callbacks `getSession()/setSession()/onSessionLost()` registados uma vez pelo SessionProvider. Depois substituir todos os `axios.*` autenticados por `http.*` em SessionContext.tsx:63/92/107/127 e WalletContext.tsx:34. Em alternativa mínima e imediata: em SessionContext.tsx:148-152, antes de fazer signOut(), tentar UMA renovação via POST /auth/refresh e só deslogar se essa também falhar.

### PERF-04 — Os interceptores do ApiContext são instalados DEPOIS dos efeitos dos filhos — os primeiros pedidos após restaurar a sessão seguem sem Authorization

- **Área:** Rede / arranque · **Ecrã:** `contexts/ApiContext.tsx:27-86`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Cold start com sessão guardada no SecureStore. 2. Observar (proxy/Charles ou log do interceptor) os pedidos a /customer/services/open, /services/pending e /services/history disparados por app/(app)/_layout.tsx:24-26 no momento em que `session` deixa de ser null.
- **Esperado:** Todos os pedidos autenticados saem com `Authorization: Bearer <token>`.
- **Observado:** O `api` é criado por `useState` (linha 27) SEM interceptores. Os interceptores são montados dentro de `useEffect(..., [session])` (linhas 32-86) e copiados para o objeto `api` com `Object.assign(api, instance)` (linha 85). Em React, os efeitos dos filhos correm ANTES dos efeitos do pai: no commit em que `session` passa a não-nulo, o efeito de AppLayout (app/(app)/_layout.tsx:22-31, descendente) dispara `getOpenService()`/`getPendingService()`/`getHistoryServices(0)` enquanto o `api` ainda tem o interceptor da ronda anterior, cujo closure tem `session === null` (linha 39: `let token = session`) — ou seja, sem cabeçalho Authorization. Consequência encadeada: `getHistoryServices` engole o 401 (ServiceContext.tsx:604) e a lista fica vazia; `getOpenService`/`getPendingService` não têm catch nenhum e rejeitam sem tratamento (ver PERF-07).
- **Causa provável:** Padrão de `Object.assign` sobre uma instância axios mantida em useState para preservar a identidade da referência entre renders. O closure do interceptor sobre `session` e a ordem de flush dos efeitos (filho→pai) não foram tidos em conta.
- **Ficheiros:** `contexts/ApiContext.tsx`, `app/(app)/_layout.tsx`, `contexts/ServiceContext.tsx`
- **Solução:** Deixar de fechar sobre `session`: guardar o token num `useRef` (`sessionRef.current = session` atualizado no corpo do render, não num efeito) e o interceptor lê `sessionRef.current` no momento do pedido. Instalar os interceptores UMA vez com `useMemo`/módulo (não em useEffect), eliminando o `Object.assign`. Assim a instância tem sempre interceptor válido e lê sempre o token mais recente, independentemente da ordem dos efeitos. Verificação: um log temporário no interceptor de pedido a imprimir `config.url` + presença do header, num cold start com sessão.

### PERF-05 — useEcho não é singleton: cada componente que o chama abre uma ligação WebSocket própria

- **Área:** Tempo real / bateria · **Ecrã:** `hooks/echo.ts:11-104`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** medio · **Risco de regressão:** alto
- **Reproduzir:** 1. Ter um serviço aceite em curso. 2. Navegar Home → overview → progress → chat. 3. Observar as ligações ws:// abertas contra `DOMAIN:8080` e os POST a /broadcasting/auth.
- **Esperado:** Uma única ligação WebSocket por sessão, partilhada por todos os ecrãs, com os canais subscritos uma vez.
- **Observado:** `useEcho` faz `new Pusher(...)` dentro do seu próprio `useEffect` (linha 24) e guarda-o em estado LOCAL do componente que o chama. É chamado em 6 sítios: contexts/ServiceContext.tsx:82, app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:44, app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:125, app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx:52, app/(app)/(pages)/(services)/(open)/close/index.tsx:41 e app/(app)/(pages)/(services)/(open)/cancel/[serviceId].tsx:50. Cada ecrã aberto cria uma SEGUNDA ligação, com nova autorização por canal, e subscreve `common.services.{id}` em paralelo com a do ServiceContext — os mesmos eventos (.ServiceAcceptedEvent, .NewMessageEvent…) chegam duas vezes, a dois handlers diferentes. Montar/desmontar o ecrã faz connect/disconnect completo de um websocket. Há ainda um listener NetInfo (linhas 83-93) por instância, que chama `echo.connect()` em qualquer mudança de conectividade (ex.: Wi-Fi→dados).
- **Causa provável:** O hook foi desenhado como "fábrica" e reutilizado como se fosse um contexto. Falta um EchoProvider.
- **Ficheiros:** `hooks/echo.ts`, `contexts/ServiceContext.tsx`, `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx`, `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx`, `app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx`, `app/(app)/(pages)/(services)/(open)/close/index.tsx`
- **Solução:** Converter em provider: criar `contexts/EchoContext.tsx` com a lógica atual de hooks/echo.ts, montá-lo em app/_layout.tsx logo acima do ServiceProvider, e transformar `hooks/echo.ts` em `const useEcho = () => useContext(EchoContext)`. Nenhum call-site muda de assinatura. Aproveitar para: (a) fazer `setEchoInstance(undefined)` no cleanup, para os consumidores não ficarem com uma instância desligada; (b) mudar a dependência `appStateStatus !== "active"` para só reagir a `background` (ignorar `inactive`), evitando teardown do websocket sempre que o utilizador puxa o centro de notificações no iOS.

### PERF-06 — Cada atualização de localização do técnico faz leaveChannel + resubscribe do canal do serviço

- **Área:** Tempo real / re-renders · **Ecrã:** `contexts/ServiceContext.tsx:176-190`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** medio
- **Reproduzir:** 1. Serviço aceite, técnico a caminho (ecrã progress com mapa). 2. O backend emite .UpdateLocationEvent a cada ping de GPS. 3. Observar as mensagens pusher:unsubscribe/pusher:subscribe no websocket.
- **Esperado:** O canal `common.services.{id}` é subscrito uma vez e mantém-se subscrito enquanto o serviço estiver aberto; a posição do técnico atualiza sem tocar na subscrição.
- **Observado:** O useEffect tem `[echo, openService, servicePendingAcceptance]` nas dependências — `openService` é um OBJETO, comparado por referência. O handler `.UpdateLocationEvent` (linha 449-451) faz `setOpenService(data.service)`, criando um objeto novo → as dependências mudam → o cleanup faz `echo.leaveChannel('common.services.' + id)` e o corpo volta a chamar `subscribeToServicesChannel(id)` para o MESMO id. Ciclo unsubscribe/subscribe a cada ping de GPS. Como os listeners só são registados dentro de `channel.subscribed(...)` (linha 357), há uma janela em que o canal está a re-subscrever e nenhum listener está ligado — eventos como .ServiceArrivedEvent ou .ServiceFinishedEvent emitidos nessa janela podem perder-se. O cleanup (linhas 183-189) também chama `echo.leaveChannel` sem verificar se `echo` está definido, ao contrário do corpo (linha 351 tem `if (echo)`).
- **Causa provável:** Dependências de efeito com objetos em vez de identificadores primitivos.
- **Ficheiros:** `contexts/ServiceContext.tsx`, `hooks/echo.ts`, `app/(app)/(pages)/(services)/(open)/progress/[serviceId].tsx`
- **Solução:** Trocar as dependências para primitivos: `}, [echo, openService?.id, servicePendingAcceptance?.id]);` e capturar o id numa const no topo do efeito (`const channelId = openService?.id ?? servicePendingAcceptance?.id;`) para o cleanup usar exatamente o mesmo valor. Adicionar `if (!echo) return;` no início do cleanup. A perda de eventos na janela de re-subscrição é a parte que só se prova em execução — um teste com o backend a emitir .ServiceArrivedEvent imediatamente a seguir a um .UpdateLocationEvent confirma-a.

### PROF-01 — Guardar Perfil salta a validação do formulário e falha em silêncio; o catch pode rebentar em erro de rede

- **Área:** Perfil / Edição de dados · **Ecrã:** `app/(app)/(modals)/(profile)/edit-profile/index.tsx:131-139, 192-200, 409-412`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** Caminho A (falha silenciosa): 1. Ter uma conta sem NIF preenchido. 2. Perfil > O meu perfil. 3. Alterar o nome. 4. Carregar em 'Guardar alterações' e confirmar no diálogo. O pedido envia nif='' (linha 83); se o backend responder 422 sobre 'nif' ou 'date_birthday', o setError é aplicado a campos que NÃO têm input visível (o bloco de data/NIF foi removido, ver comentário na linha 324) — logo não aparece mensagem nenhuma no ecrã.
Caminho B (crash no catch): 1. Selecionar um avatar. 2. Ativar o modo avião ou deixar o upload passar o timeout de 30s (linha 100). 3. Guardar.
Caminho C (validação ignorada): apagar o nome deixando-o com uma só palavra e guardar sem tocar noutro campo.
- **Esperado:** A: qualquer falha ao guardar mostra uma mensagem visível ao utilizador. B: erro de rede mostra um diálogo de erro. C: o botão não submete enquanto o formulário estiver inválido, ou o handleSubmit bloqueia o envio e destaca o campo.
- **Observado:** A: o ecrã volta ao estado normal sem qualquer indicação — o utilizador julga que guardou. B: `error.response.data.errors` (linha 132) é acedido sem optional chaining; num erro de rede `error.response` é undefined, o catch lança TypeError e a rejeição fica por tratar; se houver resposta mas sem chave `errors`, `Object.keys(undefined)` lança na mesma. Não existe diálogo de fallback nenhum neste catch. C: o botão (linha 409-412) só está desativado por `loading || loadingResetPassword` — nunca por `isValid` — e o onPress vai a openSaveDialog (linha 411) que chama updateProfile diretamente (linha 198), sem passar por `handleSubmit`.
- **Causa provável:** O padrão de confirmação por diálogo foi enxertado sobre o formulário sem manter o handleSubmit na cadeia. O ecrã irmão de faturação faz o correto (`handleSubmit(() => openSaveDialog())`, invoice-data/index.tsx:419), o que confirma que se trata de uma omissão neste ficheiro. O catch é uma cópia antiga anterior ao endurecimento feito noutros ecrãs.
- **Ficheiros:** `app/(app)/(modals)/(profile)/edit-profile/index.tsx`, `app/(app)/(modals)/(payments)/invoice-data/index.tsx`, `contexts/DialogContext.tsx`
- **Solução:** 1. Trocar `onPress={openSaveDialog}` (linha 411) por `onPress={handleSubmit(() => openSaveDialog())}` e acrescentar `|| !isValid` ao disabled da linha 412, replicando exatamente o que invoice-data/index.tsx:419 já faz. 2. Reescrever o catch das linhas 131-139 no molde do de invoice-data/index.tsx:107-124: `const errors = error?.response?.data?.errors; if (errors && Object.keys(errors).length) { ...setError... } else { openDialog({ title: t('errors.title'), subtitle: error?.response?.data?.message || t('errors.occurred_an_error'), closeOnClickOutside: true, closeAfterMSeconds: 2000 }); }`. 3. Como os campos nif e date_birthday já não têm UI (linha 324), deixar de os enviar quando estão vazios: só fazer `formData.append('nif', ...)` se `getValues('nif')` for não-vazio, evitando 422 em campos invisíveis. 4. Acrescentar um fallback que mostre sempre um diálogo quando o setError incidir sobre chaves sem campo visível.

### RATE-01 — Avaliação fica bloqueada se rating_by_customer vier ausente do payload

- **Área:** Conclusão / avaliação · **Ecrã:** `app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:185, 206, 231`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** risco_potencial
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Concluir um serviço pelo ecrã de status ou close (POST /customer/services/{id}/close). 2. A folha de avaliação abre com `service` = JSON do serviço devolvido por esse endpoint. 3. Tentar avaliar.
- **Esperado:** Um serviço acabado de fechar e ainda não avaliado apresenta estrelas ativas, caixa de comentário e botão 'Enviar'.
- **Observado:** Todas as três condições de UI testam `service.rating_by_customer === null` (comentário e botão) ou `!== null` (estrelas desativadas). Se o payload devolvido por POST_CLOSE_SERVICE não incluir a chave `rating_by_customer`, o valor é `undefined` — que NÃO é `null` — logo as estrelas ficam `disabled`, a caixa de comentário não é renderizada e o botão 'Enviar' desaparece. A folha abre bonita e completamente inerte, e o cliente sai sem avaliar. Não posso confirmar sem executar porque depende do payload real do backend; o tipo `ServiceInterface` declara o campo como obrigatório (`rating_by_customer: number | null`, types/services/index.ts), mas o histórico do mesmo repositório mostra que os payloads variam por endpoint. Nota: o mesmo ficheiro já usa o padrão robusto noutro sítio (`history/[serviceId].tsx:259` testa `!== null && !== undefined`), o que sugere que o problema já foi encontrado uma vez.
- **Causa provável:** Comparação estrita com `null` sobre um campo que pode vir ausente conforme o endpoint.
- **Ficheiros:** `app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx`, `app/(app)/(pages)/(services)/(open)/close/index.tsx`, `app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx`, `types/services/index.ts`
- **Solução:** Introduzir `const alreadyRated = service.rating_by_customer !== null && service.rating_by_customer !== undefined;` e usar essa variável nas linhas 185, 206 e 231. Em complemento, fazer o ecrã de conclusão passar sempre o serviço normalizado (com `rating_by_customer: service.rating_by_customer ?? null`) ao navegar para a folha, em close/index.tsx:60-66 e status/[serviceId].tsx:82-88.

### RGPD-01 — Dados pessoais e de pagamento enviados como propriedades de eventos para o Mixpanel, contra a regra escrita no próprio AGENTS.md

- **Área:** Privacidade / RGPD · **Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:1583`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Dar consentimento no banner.
2. Selecionar um cartão guardado no checkout → checkout/[serviceId].tsx:1583 emite `track("checkout_input_filled", { field: "payment_method", method: item.brand, last4: item.last4 })`.
3. Avaliar um serviço com comentário → rate/[serviceId].tsx:86 emite `track("service_rated", { rating, has_comment, comment: trimmed || undefined, service_id })`.
4. Guardar o perfil → edit-profile/index.tsx:111-120 chama `setUserProfile({ $name, $email, $phone, ..., nif })`; o mesmo em complete-profile/index.tsx:50-59.
5. Aplicar um voucher → checkout:487 e :495 enviam `voucher_code` em claro.
- **Esperado:** O AGENTS.md deste repositório define explicitamente, na secção Anti-Patterns: não enviar PII como propriedades de evento e não identificar utilizadores por email. Sob o RGPD, o NIF é um identificador nacional e os 4 últimos dígitos do cartão são dado de pagamento — nenhum dos dois é necessário para medir o funil.
- **Observado:** Vão para o Mixpanel, hoje: os 4 últimos dígitos do cartão (checkout:1583), o comentário livre do cliente sobre o serviço (rate:86 — texto que pode conter nomes, moradas, queixas sobre o técnico), o NIF (edit-profile:119 e complete-profile:59), o email e o telefone no perfil (`$email`, `$phone` em edit-profile:113-114, complete-profile:53-54 e SessionContext.tsx:136-141), e o código de voucher (checkout:487, :495). Nenhuma destas propriedades é usada por qualquer métrica de funil descrita no AGENTS.md.
- **Causa provável:** Instrumentação feita por conveniência ('mandar tudo o que está à mão') sem revisão contra a política que o próprio repositório documenta.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(profile)/edit-profile/index.tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/complete-profile/index.tsx`, `/Users/andrelacerda/dev/app-costumer/contexts/SessionContext.tsx`, `/Users/andrelacerda/dev/app-costumer/AGENTS.md`
- **Solução:** Cirurgia por linha:
- checkout:1583 → remover `last4`; manter só `method: item.brand`.
- rate:86 → remover `comment`; `has_comment` (booleano) já lá está e chega para a métrica. Se quiserem o comprimento, `comment_length: trimmed.length`.
- edit-profile:119 e complete-profile:59 → remover `nif`; se for preciso saber quem tem NIF preenchido, usar `has_nif: !!updatedUserData.nif`.
- checkout:487 e :495 → substituir `voucher_code` por `voucher_id` (o objeto já traz `voucher.id`, usado em checkout:731) ou por um hash.
- `$email`/`$phone` no perfil: manter só se estiver declarado no registo de atividades de tratamento e no contrato com o Mixpanel; caso contrário, deixar apenas `$name` e o distinct_id interno, como o AGENTS.md manda.
Acrescentar em MixpanelService.ts uma lista negra de chaves (`['cvc','cardNumber','last4','nif','comment','voucher_code','email','phone']`) filtrada dentro de `track()` e `setUserProfile()`, para que o problema não regresse por outra via.

### RGPD-02 — Mixpanel arranca opted-in por omissão, identify() não verifica consentimento e o logging do SDK fica ligado em produção

- **Área:** Privacidade / RGPD · **Ecrã:** `services/MixpanelService.ts:26-27,49-51`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Instalação limpa com token de Mixpanel configurado. `MixpanelContext.tsx:41` chama `initMixpanel()` no arranque, antes de qualquer resposta ao banner.
2. `MixpanelService.ts:26` executa `mixpanel.init(false, {}, 'https://api-eu.mixpanel.com')` — o primeiro argumento é `optOutTrackingDefault`, logo `false` significa que o SDK arranca a tratar o utilizador como **não** opted-out.
3. Fazer login por SMS sem tocar no banner. `SessionContext.tsx:135` chama `identify(String(userData.id))`.
4. `MixpanelService.ts:49-51` — `identify` não tem o guard `if (!hasConsent) return;` que `track` (linha 45) e `setUserProfile` (linha 54) têm.
- **Esperado:** Antes de consentimento explícito, nada deve sair do dispositivo para o Mixpanel — nem eventos, nem chamadas de identidade. O RGPD (art. 6.º e diretiva ePrivacy) exige consentimento prévio para analytics não estritamente necessária, e o próprio AGENTS.md diz 'Do NOT track events before consent is given'.
- **Observado:** Três desvios no mesmo ficheiro: (1) o SDK arranca com opt-out por omissão desligado, portanto está funcionalmente opted-in até o utilizador carregar em 'Rejeitar'; (2) `identify()`, `setDistinctId()`, `reset()` e `flush()` não verificam `hasConsent` — só `track` e `setUserProfile` verificam; (3) `mixpanel.setLoggingEnabled(true)` na linha 27 fica ativo em produção, o que despeja no logcat/Consola todos os eventos e respetivas propriedades — combinando-se com RGPD-01, isso significa NIF, email e last4 do cartão também nos logs do dispositivo. Nota de rigor: que a chamada `identify()` produza efetivamente um pedido de rede antes do consentimento depende do comportamento interno do mixpanel-react-native; o que está inequivocamente errado no nosso código é a ausência do guard e o `optOutTrackingDefault: false`.
- **Causa provável:** O guard de consentimento foi acrescentado só às duas funções óbvias (`track`, `setUserProfile`); o `init` foi copiado do exemplo da documentação, onde o primeiro parâmetro é normalmente deixado a `false`.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/services/MixpanelService.ts`, `/Users/andrelacerda/dev/app-costumer/contexts/MixpanelContext.tsx`, `/Users/andrelacerda/dev/app-costumer/contexts/SessionContext.tsx`
- **Solução:** Em services/MixpanelService.ts:
- linha 26: `await mixpanel.init(true, {}, 'https://api-eu.mixpanel.com')` — arrancar sempre opted-out; o `optInTracking()` chamado em MixpanelContext.tsx:46/56 já trata de reverter quando há consentimento.
- linha 27: `mixpanel.setLoggingEnabled(__DEV__)`.
- linhas 36-42 e 49-60: acrescentar `if (!hasConsent) return;` a `setDistinctId` e `identify`. Deixar `reset()` e `optOutTracking()` sem guard (têm de funcionar sempre, para apagar).
- Adicionalmente, em MixpanelContext.tsx acrescentar eventos `consent_given` / `consent_rejected` (o segundo só como contagem local ou no backend próprio), porque hoje não é possível medir a taxa de opt-in e, sem ela, não se sabe que fração do funil o Mixpanel está sequer a ver.

### RT-02 — useEcho não é singleton: cada ecrã abre a sua própria ligação WebSocket e os leaveChannel são no-ops

- **Área:** Tempo real (WebSockets) · **Ecrã:** `hooks/echo.ts:11-104 (6 call sites)`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Abrir a app com sessão iniciada e um serviço em curso. 2. Navegar home → overview → progress → chat → status → cancel (todos ficam montados na stack). 3. Inspecionar as ligações WebSocket abertas para DOMAIN:8080 (logs do servidor Reverb ou proxy).
- **Esperado:** Uma única ligação WebSocket por sessão, partilhada por toda a app.
- **Observado:** `useEcho` cria dentro do próprio useEffect um `new Pusher(...)` + `new Echo(...)` por cada componente que o chama. Há 6 call sites (contexts/ServiceContext.tsx, chat, status, close, cancel, wait-accept), pelo que se podem manter 3-4 ligações simultâneas com autenticações independentes. Consequência funcional direta: em status/[serviceId].tsx:80 e close/index.tsx:58 o `echo.leaveChannel(`common.services.${service.id}`)` opera sobre uma instância que NUNCA subscreveu esse canal — é um no-op, e a subscrição real (a do ServiceContext) fica ativa depois de o serviço ser fechado. Também custo de bateria e de handshakes de auth multiplicados.
- **Causa provável:** O hook cria a instância em vez de a consumir de um provider partilhado.
- **Ficheiros:** `hooks/echo.ts`, `contexts/ServiceContext.tsx`, `app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx`, `app/(app)/(pages)/(services)/(open)/close/index.tsx`, `app/(app)/(pages)/(services)/(open)/cancel/[serviceId].tsx`, `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx`
- **Solução:** Converter em EchoProvider: mover o corpo atual de hooks/echo.ts para um `contexts/EchoContext.tsx` montado uma única vez em app/_layout.tsx, e transformar `useEcho()` num `useContext(EchoContext)`. Os 6 call sites ficam inalterados na sintaxe. Depois disto, os `leaveChannel` de status/close passam a ter efeito real (e devem ser removidos ou substituídos por `setOpenService(null)`, que já dispara a cleanup correta via RT-01).

### SEC-03 — Dados pessoais completos (email, telefone e morada de cliente e técnico) escritos em console.log que sobrevive nas builds de release

- **Área:** Privacidade / Segurança · **Ecrã:** `contexts/ServiceContext.tsx:246`
- **Severidade:** alto · **Prioridade:** P0 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Instalar uma build de release (yarn build-local:android:production) num dispositivo.
2. Ligar `adb logcat` (Android) ou a Consola do macOS com o dispositivo ligado (iOS).
3. Trazer a app para primeiro plano com um serviço em curso — app/(app)/_layout.tsx:24 chama `getOpenService()` sempre que `appStateStatus === 'active'`.
- **Esperado:** Nenhum dado pessoal em logs de dispositivo numa build de produção. Os logs de dispositivo são legíveis por qualquer app com permissão de leitura de logs em Android antigo, por qualquer pessoa com acesso físico ao aparelho e por ferramentas de diagnóstico de terceiros.
- **Observado:** `contexts/ServiceContext.tsx:246` faz `console.log(response.data.data)` do payload do serviço aberto — que inclui `customer.email`, `customer.phone`, `address` completa e os contactos do técnico (types/services/index.ts:53-75). O mesmo padrão repete-se em: ServiceContext.tsx:197 e :210 (payloads dos eventos de websocket do canal do cliente), ServiceContext.tsx:373 e :388, app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:142, :148, :196, :218, contexts/ScheduleContext.tsx:28 e :32 (dados do agendamento e resposta do servidor), app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx:57 e app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:71. O babel.config.js (ficheiro inteiro, 7 linhas) tem apenas `babel-preset-expo` e `nativewind/babel` — não há `transform-remove-console`, e nem o preset do Expo nem o minificador do Metro removem `console.*` por omissão. Logo, todas estas chamadas ficam no bundle de produção.
- **Causa provável:** Logs de depuração deixados para trás; a maioria dos `console.log` do repositório está comentada, o que sugere uma limpeza a meio.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/contexts/ServiceContext.tsx`, `/Users/andrelacerda/dev/app-costumer/contexts/ScheduleContext.tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/babel.config.js`
- **Solução:** Duas camadas:
(a) Rede de segurança: em babel.config.js acrescentar `env: { production: { plugins: ['transform-remove-console'] } }` (instalar `babel-plugin-transform-remove-console`). Deixar `console.error`/`console.warn` de fora do exclude só depois de SEC-03 estar resolvido, porque hoje há `console.error(error, error?.response?.data)` em SessionContext.tsx:146 que também imprime corpos de resposta.
(b) Remover à mão as 13 chamadas listadas acima (as que imprimem `data`/`response.data.data`/`service`). Onde o log ajuda a diagnosticar, substituir por um log só com identificadores não pessoais, ex. `console.log('open service', response.data.data?.service?.id, response.data.data?.service?.status)`.

### SEC-04 — guest_token guardado em AsyncStorage não cifrado e enviado na query string do URL

- **Área:** Segurança · **Ecrã:** `contexts/GuestSessionContext.tsx:121-127 e app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:380-381`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** sempre · **Esforço:** medio · **Risco de regressão:** medio
- **Reproduzir:** 1. Fazer o fluxo de convidado até adicionar um método de pagamento — new-payment-method/index.tsx:108-109 recebe `guest_token` da resposta de GET_PUBLIC_KEY e chama `setGuestToken(guestToken)`.
2. `setGuestToken` (GuestSessionContext.tsx:121-127) escreve o token dentro do objeto `guest-session` via `AsyncStorage.setItem` (linha 99).
3. No checkout, observar o pedido de dados de faturação: checkout/[serviceId].tsx:380-381 constrói `${API_ROUTES.GET_BILLING_INFO}?guest_token=${guestSession.guest_token}`.
- **Esperado:** Uma credencial de autenticação (mesmo que de convidado) deve ficar em armazenamento seguro — Keychain/Keystore, como já acontece com o JWT de sessão (hooks/useStorageState.ts:31 usa `SecureStore.setItemAsync`) — e viajar em cabeçalho ou corpo, nunca na query string.
- **Observado:** Dois problemas em simultâneo. (1) O `guest_token` fica em AsyncStorage, que em Android é um ficheiro SQLite em texto simples no sandbox da app (legível em dispositivo com root, em backups adb e por qualquer ferramenta de extração) e em iOS um ficheiro no diretório de documentos incluído em backups. Há aqui uma incoerência clara: o token autenticado está em SecureStore, o token de convidado não. (2) O token vai na query string em checkout:381, o que o expõe nos logs de acesso do servidor, em proxies intermédios e em qualquer telemetria de URL. Nas outras duas utilizações o token vai no corpo do POST (checkout:724-725 e :805-806), o que confirma que a query string é uma exceção evitável. O valor também não é passado por `encodeURIComponent`.
- **Causa provável:** O `guest_token` foi acrescentado ao objeto GuestSessionData já existente (que só tinha estado de wizard) sem separar credenciais de estado; o GET de billing info foi construído por concatenação em vez de `params` do axios.
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/contexts/GuestSessionContext.tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(bottom-sheets)/new-payment-method/index.tsx`, `/Users/andrelacerda/dev/app-costumer/hooks/useStorageState.ts`
- **Solução:** (a) Retirar `guest_token` de GuestSessionData e guardá-lo com `SecureStore` numa chave própria (ex. 'guest-session-token'), reutilizando `setStorageItemAsync` de hooks/useStorageState.ts. O `clearGuestSession` (GuestSessionContext.tsx:179) passa a apagar também essa chave via `SecureStore.deleteItemAsync`.
(b) Em checkout/[serviceId].tsx:380-381, substituir a concatenação por `api.get(API_ROUTES.GET_BILLING_INFO, { params: { guest_token: token } })` e, de preferência, pedir ao backend que aceite o token em cabeçalho (`X-Guest-Token`) para sair de vez da query string.
(c) Enquanto o SecureStore não entra, no mínimo garantir que o objeto `guest-session` deixa de ser reescrito com o token a cada `saveGuestSession`.

### SUP-01 — Histórico de tickets de suporte guardado numa chave global de AsyncStorage — mensagens do utilizador anterior ficam visíveis a quem entrar a seguir

- **Área:** Suporte / Privacidade · **Ecrã:** `app/(app)/(modals)/support-ticket/index.tsx:27, 56-91`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Com a conta A, abrir Perfil > Ajuda e suporte e submeter um ticket com um assunto e uma mensagem identificáveis. 2. Terminar sessão. 3. Iniciar sessão com a conta B no mesmo dispositivo. 4. Abrir Perfil > Ajuda e suporte. Variante: em vez de terminar sessão, eliminar a conta A em Definições > Eliminar conta e depois entrar com a conta B.
- **Esperado:** O histórico de tickets é privado de cada conta: a conta B não vê pedidos da conta A. Após eliminar a conta, todos os dados locais do utilizador desaparecem do dispositivo.
- **Observado:** A chave é a constante global `piquet_support_tickets_v1` (linha 27), sem qualquer sufixo de utilizador. O loadTickets (linhas 62-91) lê essa chave em qualquer sessão e o renderTicket (linhas 168-207) mostra o assunto do pedido — que, quando o assunto vai vazio, é substituído pelo início da própria mensagem (linha 126: `subject.trim() || message.trim().slice(0, 60)`). Nem o signOut (SessionContext.tsx:104-121) nem o fluxo de eliminação de conta (delete-account/index.tsx:60-64) tocam nesta chave. A app volta ainda a consultar o dashboard com os ids do utilizador anterior (linha 77).
- **Causa provável:** O histórico foi desenhado como 'a app só conhece os tickets que ela própria criou' (comentário da linha 26), assumindo um dispositivo = um utilizador. O caso de troca de conta e o de eliminação de conta não foram considerados, e não existe um ponto central de limpeza de dados locais no logout.
- **Ficheiros:** `app/(app)/(modals)/support-ticket/index.tsx`, `contexts/SessionContext.tsx`, `app/(app)/(modals)/(profile)/delete-account/index.tsx`
- **Solução:** 1. Tornar a chave dependente do utilizador: `const ticketsKey = userData?.id ? \`piquet_support_tickets_v1_${userData.id}\` : 'piquet_support_tickets_v1_guest'` e usá-la no getItem/setItem (linhas 58, 65, 86). 2. Criar em SessionContext um `clearLocalUserData()` que apague as chaves de dados pessoais (tickets, e reveja também o cesto em CartContext e a sessão de convidado) e chamá-lo no signOut e no sucesso da eliminação de conta. 3. Migração: no primeiro arranque após a atualização, apagar a chave global antiga para não deixar resíduo nos dispositivos já instalados.

### VENDOR-01 — Qualquer falha da API na procura de técnicos é apresentada ao cliente como 'Sem profissionais disponíveis na tua zona'

- **Área:** Funil imediato / seleção de técnico · **Ecrã:** `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:104-106 e 276-307`
- **Severidade:** alto · **Prioridade:** P1 · **Tipo:** confirmado
- **Frequência:** frequente · **Esforço:** pequeno · **Risco de regressão:** baixo
- **Reproduzir:** 1. Entrar no fluxo imediato até ao ecrã de escolha de técnico.
2. Provocar uma falha do POST /customer/services (modo avião a meio do carregamento, backend a devolver 4xx/5xx, ou token expirado sem refresh possível).
3. Observar o ecrã.
- **Esperado:** Uma falha técnica é apresentada como falha técnica ('Não conseguimos ligar. Verifica a ligação e tenta novamente'), distinta do caso legítimo de zona sem técnicos.
- **Observado:** No .catch, `setOpenServiceError(error.response?.data.message)` (linha 105) — e `openServiceError` NÃO é renderizado em lado nenhum do JSX deste ecrã (é lido apenas nas linhas 71 e 114 para ser limpo). Como `vendors` fica a [], o ecrã cai no estado vazio das linhas 276-307 e mostra o ícone de utilizadores + 'Sem profissionais disponíveis' + 'Ainda não há técnicos para este serviço na tua zona'. A mensagem real do backend desaparece. Nota adicional: `error.response?.data.message` rebenta se `data` for undefined (o optional chaining pára em `response`), o que numa falha de rede pura lança dentro do catch.
- **Causa provável:** O ecrã foi reescrito para o novo estado vazio da build 15 e o bloco que mostrava openServiceError foi removido do JSX sem que a variável de estado fosse retirada nem substituída por um estado de erro distinto.
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx`, `translation/resources/pt_PT.ts`
- **Solução:** Separar os dois estados: manter `openServiceError` só para falhas técnicas (corrigindo para `error?.response?.data?.message`) e nunca o preencher com a mensagem de lista vazia (remover o setOpenServiceError da linha 93). No render, antes do ramo `vendors.length === 0`, tratar `openServiceError` com um bloco próprio: ícone de aviso, a mensagem do backend (ou 'errors.occurred_an_error' como fallback) e o mesmo botão 'Tentar novamente' que já existe. Acrescentar as strings services.select_vendor.error_title/error_subtitle a pt_PT.ts e en_US.ts.


## E.3 · Tabela completa de achados

| ID | Título | Severidade | Prio. | Tipo | Ecrã |
|---|---|---|---|---|---|
| A11Y-01 | gray_medium #858585 — cor de todo o texto secundário da app — falha WCAG AA (3,69:1 sobre branco, 3,45:1 sobre o creme) | critico | P0 | confirmado | `constants/Colors.ts:13 (definição); 193 ocorrências em 52 ficheiros, ex. components/app/Services/vendor-card-selector/index.tsx:88,112,121; components/app/Services/technician-trust-footer/index.tsx:42; app/(app)/(tabs)/cart/index.tsx:207,260; components/services/OpenService.tsx:33` |
| A11Y-02 | Preço e etiqueta de poupança em âmbar sobre fundo claro: 1,70:1 e 1,53:1 — informação comercial crítica quase ilegível | critico | P0 | confirmado | `app/(app)/(tabs)/list/index.tsx:434-438; components/app/Services/service-card-selector/index.tsx:92-99; components/app/Services/schedule-vendor-card/index.tsx:133-139` |
| NOTIF-01 | Token de push nunca é desassociado no servidor — notificações da conta anterior chegam ao novo utilizador do dispositivo | critico | P0 | confirmado | `contexts/NotificationsContext.tsx:83-98 e contexts/SessionContext.tsx:104-121` |
| PAY-01 | Segunda reserva MB Way da sessão nunca confirma: o ecrã de espera não faz polling se já existir serviço aberto/pendente | critico | P0 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx:84-86 + contexts/ServiceContext.tsx:532-533` |
| PAY-02 | Janela real de duplo pagamento MB Way: overlay fechado e lock libertado 1 segundo antes de navegar | critico | P0 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:836-867` |
| PAY-03 | Sem chave de idempotência no abrir-serviço: um timeout de 30s convida o cliente a pagar duas vezes | critico | P0 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:754-784 e 833-867` |
| RT-01 | Canal de tempo real faz leave+rejoin a cada atualização de localização — eventos perdidos | critico | P0 | confirmado | `contexts/ServiceContext.tsx:176-190 (efeito) + :449-451 (UpdateLocationEvent)` |
| SEC-01 | Tickets de suporte: endpoint público sem autenticação com IDs sequenciais permite ler mensagens de suporte de outros clientes | critico | P0 | confirmado | `app/(app)/(modals)/support-ticket/index.tsx:25,77,103-116` |
| SEC-02 | Websocket de tempo real configurado sem TLS (ws:// na porta 8080) — chat e dados de serviço em texto claro | critico | P0 | confirmado | `hooks/echo.ts:24-28` |
| WAIT-01 | Contagem decrescente do pedido imediato é de 60 segundos e, ao chegar a 0, o cliente fica preso com o botão Cancelar desativado | critico | P0 | confirmado | `components/Timer.tsx:17 e app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:367` |
| A11Y-03 | App essencialmente inutilizável com leitor de ecrã: 216 controlos tácteis para 21 props de acessibilidade; 70 TextInput sem accessibilityLabel | alto | P0 | confirmado | `transversal — components/app/BackHeader.tsx:31-49; components/app/UserHeader.tsx:59,70,100; components/CustomTouchableOpacity.tsx:140-162; components/CustomTextInput.tsx:152; components/TouchOpacity.tsx:27` |
| A11Y-04 | Botão de voltar mede 40×20pt em 40 ecrãs; só existem 2 hitSlop em toda a app | alto | P1 | confirmado | `components/app/BackHeader.tsx:44-48 (usado em 40 ecrãs); components/app/UserHeader.tsx:100; components/warnings/GeolocationPermissionBanner.tsx:76,85; components/app/Profile/Settings.tsx:100-109; components/FilterTabs.tsx:34-48` |
| ANL-01 | Analytics silenciosamente desligada: EXPO_PUBLIC_MIXPANEL_TOKEN não está definido em nenhum ficheiro de ambiente nem no eas.json | alto | P1 | confirmado | `services/MixpanelService.ts:2,8-10` |
| ANL-02 | Plano de eventos com dupla contagem: cada seleção de técnico emite dois eventos diferentes e service_confirmed é emitido em quatro sítios com semânticas contraditórias | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:118,197` |
| AUTH-01 | Token expirado provoca logout forçado no arranque — o refresh nunca chega a ser tentado | alto (auditor propôs *critico*) ✅verificado | P0 | confirmado | `contexts/SessionContext.tsx:127-153` |
| AUTH-07 | Eliminar conta exige palavra-passe — impossível para quem entrou por OTP de telemóvel ou converteu de convidado | alto ✅verificado | P1 | confirmado | `app/(app)/(modals)/(profile)/delete-account/index.tsx:49-93 e 153-159` |
| CART-01 | Convidado com cesto que passa pela morada perde o cesto inteiro: sai para um único serviço e o modo (imediato/agendado) é descartado | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/address/guest/index.tsx:216-229 (origem em app/(app)/(tabs)/cart/index.tsx:76-87)` |
| CHAT-01 | Chat ignora o parâmetro de rota [serviceId] e nunca se recompõe se openService chegar depois | alto | P1 | confirmado | `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:129, 152-163` |
| CHAT-02 | Envio falhado deixa a bolha da mensagem no ecrã — o cliente julga que enviou | alto | P1 | confirmado | `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:181-209` |
| CHAT-03 | RSA.encrypt e GET da chave pública sem tratamento de erro: chat pode ficar mudo ou com o botão bloqueado para sempre | alto | P1 | confirmado | `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:152-157, 181-208` |
| CHECKOUT-01 | Botão de pagar fica ativo mas não faz absolutamente nada quando o serviço/técnico se perdem do contexto | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:699 e 792` |
| D2-01 | Falha de rede deixa o separador Serviços permanentemente vazio e culpa a zona do utilizador | alto (auditor propôs *critico*) ✅verificado | P0 | confirmado | `app/(app)/(tabs)/list/index.tsx:70-72, 102-128, 550-575` |
| DS-01 | Três fontes de tokens de cor em paralelo, já divergentes — incluindo dois amarelos de marca diferentes | alto | P1 | confirmado | `constants/Colors.ts:19-35 vs tailwind.config.js:9-33 vs constants/DesignTokens.ts:4-29` |
| DS-02 | 175 cores hardcoded em 60 ficheiros; o fundo principal da app (#FAF7F2) e o roxo dos banners (#6A40DA) não são tokens | alto | P1 | confirmado | `transversal — 32 ocorrências de #FAF7F2 (ex. app/(app)/(tabs)/profile/index.tsx:155,332; app/(app)/(tabs)/cart/index.tsx:112; app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:133,141,148,207); 6 de #6A40DA (components/warnings/*.tsx)` |
| EXTRA-01 | Extra aprovado que fica a precisar de 3DS ou de cartão não é mostrado onde o cliente está | alto | P1 | confirmado | `app/(app)/(bottom-sheets)/(services)/extra-request/[extraId].tsx:78-85 + components/app/Services/ServiceExtrasCard.tsx:140-222` |
| FAT-01 | Dados de faturação exigem um nome com exatamente duas palavras — bloqueia a maioria dos nomes portugueses | alto | P0 | confirmado | `app/(app)/(modals)/(payments)/invoice-data/index.tsx:216 (e 212)` |
| HIST-01 | "Carregar mais" substitui a lista de histórico em vez de a concatenar | alto | P1 | confirmado | `contexts/ServiceContext.tsx:585-617 (linha 601) + app/(app)/(tabs)/history/index.tsx:399` |
| HIST-02 | Detalhe do histórico só lê da lista em memória — ecrã vazio com "Invalid Date" fora do caminho feliz | alto | P1 | confirmado | `app/(app)/(pages)/(services)/history/[serviceId].tsx:45-54, 251` |
| INFO-01 | O 'Desde X €' do detalhe é o mínimo de TODOS os técnicos, mas o ecrã seguinte só mostra 3 — a promessa de preço pode não existir na lista | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:66-82 vs select-vendor/[serviceId].tsx:96` |
| INFO-02 | Guard baseado em userData em vez de session: utilizador autenticado pode ser atirado para o formulário de morada de convidado, e o convidado é obrigado a repetir a morada em cada tentativa | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:86 e 103` |
| NET-01 | Erro de rede no histórico rebenta dentro do próprio catch; getOpenService/getPendingService sem tratamento de erro | alto | P1 | confirmado | `contexts/ServiceContext.tsx:603-613 (linha 604), :240-248, :290-293` |
| OBS-01 | Sem captura de crashes em produção: Sentry integralmente comentado e, mesmo na versão comentada, restrito a __DEV__ | alto | P1 | confirmado | `app/_layout.tsx:55,64-82` |
| PAY-01 | WalletContext usa axios cru sem refresh de token — cartões existentes aparecem como 'Sem métodos de pagamento' | alto | P1 | confirmado | `contexts/WalletContext.tsx:34-47` |
| PAY-04 | É possível confirmar o pagamento sem que o preço alguma vez tenha sido mostrado | alto | P0 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:1027-1031 e 1824-1854` |
| PAY-05 | Rascunho de checkout não é limpo depois de um pagamento com cartão confirmado pelo ecrã de espera: voucher já usado é reaplicado na reserva seguinte | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/card/waiting.tsx:47-55 vs app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:515-529` |
| PAY-06 | O guard beforeRemove pode bloquear a saída do checkout depois de um pagamento com cartão bem sucedido | alto | P1 | risco_potencial | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:336-347 (guard) vs 515-529, 645-677 (navegações)` |
| PAY-07 | Convidado que escolhe cartão é silenciosamente passado para MB Way ao validar o telemóvel | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:247-276` |
| PAY-08 | Agendamento antigo em memória contamina uma reserva imediata: data errada no checkout e serviço criado como agendado | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx:148-159 + checkout/[serviceId].tsx:413-462, 743-752` |
| PAY-09 | NIF inválido é descartado em silêncio: fatura emitida sem contribuinte sem o cliente saber | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:734-736 e 813-815` |
| PERF-01 | Arranque: 3650 ms de espera fixa + 18 fontes bloqueiam o primeiro conteúdo e todos os providers | alto | P0 | confirmado | `app/_layout.tsx:117-128, 204-206, 258-310` |
| PERF-02 | MB WAY: o polling do estado do pagamento pode nunca arrancar e o cliente fica preso no ecrã de espera sem timeout | alto | P0 | confirmado | `contexts/ServiceContext.tsx:532-563` |
| PERF-03 | Pedidos autenticados fora do ApiContext: sem refresh de token e com signOut() ao primeiro 401 | alto | P0 | confirmado | `contexts/SessionContext.tsx:127-152` |
| PERF-04 | Os interceptores do ApiContext são instalados DEPOIS dos efeitos dos filhos — os primeiros pedidos após restaurar a sessão seguem sem Authorization | alto | P1 | confirmado | `contexts/ApiContext.tsx:27-86` |
| PERF-05 | useEcho não é singleton: cada componente que o chama abre uma ligação WebSocket própria | alto | P1 | confirmado | `hooks/echo.ts:11-104` |
| PERF-06 | Cada atualização de localização do técnico faz leaveChannel + resubscribe do canal do serviço | alto | P1 | confirmado | `contexts/ServiceContext.tsx:176-190` |
| PROF-01 | Guardar Perfil salta a validação do formulário e falha em silêncio; o catch pode rebentar em erro de rede | alto | P0 | confirmado | `app/(app)/(modals)/(profile)/edit-profile/index.tsx:131-139, 192-200, 409-412` |
| RATE-01 | Avaliação fica bloqueada se rating_by_customer vier ausente do payload | alto | P1 | risco_potencial | `app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:185, 206, 231` |
| RGPD-01 | Dados pessoais e de pagamento enviados como propriedades de eventos para o Mixpanel, contra a regra escrita no próprio AGENTS.md | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:1583` |
| RGPD-02 | Mixpanel arranca opted-in por omissão, identify() não verifica consentimento e o logging do SDK fica ligado em produção | alto | P1 | confirmado | `services/MixpanelService.ts:26-27,49-51` |
| RT-02 | useEcho não é singleton: cada ecrã abre a sua própria ligação WebSocket e os leaveChannel são no-ops | alto | P1 | confirmado | `hooks/echo.ts:11-104 (6 call sites)` |
| SEC-03 | Dados pessoais completos (email, telefone e morada de cliente e técnico) escritos em console.log que sobrevive nas builds de release | alto | P0 | confirmado | `contexts/ServiceContext.tsx:246` |
| SEC-04 | guest_token guardado em AsyncStorage não cifrado e enviado na query string do URL | alto | P1 | confirmado | `contexts/GuestSessionContext.tsx:121-127 e app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:380-381` |
| SUP-01 | Histórico de tickets de suporte guardado numa chave global de AsyncStorage — mensagens do utilizador anterior ficam visíveis a quem entrar a seguir | alto | P1 | confirmado | `app/(app)/(modals)/support-ticket/index.tsx:27, 56-91` |
| VENDOR-01 | Qualquer falha da API na procura de técnicos é apresentada ao cliente como 'Sem profissionais disponíveis na tua zona' | alto | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:104-106 e 276-307` |
| A11Y-05 | Zero controlo de escala de texto: sem allowFontScaling/maxFontSizeMultiplier e com contentores de altura fixa — texto grande do sistema deve cortar conteúdo | medio | P2 | risco_potencial | `components/CustomText.tsx:102-119 (nunca define allowFontScaling); app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:194 (h-6 fixo); components/app/TrustBadge.tsx:27-43; components/app/ServiceCard.tsx:49-53 (height:100); app/(app)/(tabs)/home/_styles.ts:14-38` |
| A11Y-06 | Avaliação por estrelas: valor transmitido só por cor, sem semântica de acessibilidade, e as estrelas vazias têm 1,80:1 | medio | P2 | confirmado | `app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:180-191` |
| A11Y-07 | Quatro animações em loop infinito sem respeitar "Reduzir movimento"; overlay de processamento bloqueia o ecrã sem prender o foco nem anunciar o estado | medio | P2 | confirmado | `components/ProcessingOverlay.tsx:20-34 e 57-66; app/_layout.tsx:162; app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx:57` |
| A11Y-08 | Chips de filtro do Histórico e seletor de idioma: estado ativo só por cor de fundo, sem accessibilityState, e a etiqueta inativa falha AA | medio | P2 | confirmado | `components/FilterTabs.tsx:34-58; components/app/Profile/Settings.tsx:100-109` |
| A11Y-09 | gray_light #BBBBBB (1,92:1) usado como cor de texto em 10 sítios e como placeholder de campos de formulário | medio | P2 | confirmado | `components/CustomTextInput.tsx:172; app/(app)/(modals)/(payments)/invoice-data/index.tsx:252,305,349,406; components/HomeSection.tsx:31; components/app/PaymentResult.tsx:82; app/(auth)/signin/index.tsx:505; app/(app)/(modals)/(services)/(request)/checkout/card/waiting.tsx:249,252` |
| ANL-03 | Funil sem cobertura em toda a metade posterior da jornada e sem medição de abandono, retenção ou erros fora do checkout | medio | P2 | confirmado | `AGENTS.md:36-50 vs. instrumentação real em app/` |
| AUTH-02 | Não existe guard de autenticação: ecrãs autenticados ficam montados e a dar 401 depois de a sessão cair | medio (auditor propôs *alto*) ✅verificado | P0 | confirmado | `app/(app)/_layout.tsx:33-93` |
| AUTH-03 | Login por email falha em silêncio: password errada, rate limit ou falta de rede não mostram mensagem nenhuma | medio (auditor propôs *alto*) ✅verificado | P0 | confirmado | `app/(auth)/signin/index.tsx:155-186` |
| AUTH-04 | Refresh de token sem single-flight: N pedidos em paralelo disparam N POST /auth/refresh com o mesmo token | medio (auditor propôs *alto*) ✅verificado | P1 | confirmado | `contexts/ApiContext.tsx:88-120 e 158-170` |
| AUTH-05 | Depois de logout→login na mesma execução da app, o token de push nunca é re-registado; e o dispositivo nunca é desassociado no servidor | medio (auditor propôs *alto*) ✅verificado | P1 | confirmado | `contexts/NotificationsContext.tsx:40-98` |
| AUTH-06 | Arranque bloqueado 3,65 s por um splash animado fixo, com toda a árvore de providers por montar | medio (auditor propôs *alto*) ✅verificado | P1 | confirmado | `app/_layout.tsx:117-128 e 258-310` |
| AUTH-08 | Logout não limpa o cesto nem os tickets de suporte guardados localmente — passam para a conta seguinte | medio | P1 | confirmado | `contexts/CartContext.tsx:12,43-58 e app/(app)/(modals)/support-ticket/index.tsx:27,58` |
| AUTH-09 | `error.response.status` sem optional chaining rebenta o handler de erro quando não há resposta (offline ou refresh cancelado) | medio | P1 | confirmado | `contexts/ServiceContext.tsx:604` |
| AUTH-10 | Os interceptores do ApiContext são instalados no efeito do PAI — pedidos disparados por efeitos de filhos no mesmo commit usam a sessão anterior | medio | P1 | risco_potencial | `contexts/ApiContext.tsx:27-86` |
| AUTH-11 | Política de palavra-passe incoerente entre registo (8) e redefinição (12), e os campos bloqueiam colar de gestores de palavras-passe | medio | P2 | confirmado | `components/auth/signup/Steps/PasswordInformation/index.tsx:48 vs app/(reset-password)/[token].tsx:66` |
| AUTH-12 | O ecrã de redefinição de palavra-passe pode ser inalcançável: não há Universal Links (iOS) nem App Links (Android) configurados | medio | P2 | risco_potencial | `app/(reset-password)/[token].tsx:25 e app.config.ts:24-70` |
| AUTH-13 | O modal "fora de zona" é empurrado de novo a cada regresso da app a primeiro plano, empilhando cópias | medio | P2 | confirmado | `contexts/SessionContext.tsx:142-144 combinado com app/(app)/_layout.tsx:22-31` |
| AUTH-14 | `handleVerifyOtp` não devolve valor: o modal de OTP trata sempre a validação como falhada e, no erro, mostra dois avisos | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:927-966 e components/ValidatePhoneModal.tsx:129-141` |
| AUTH-15 | O Mixpanel associa a identidade real do utilizador sem passar pelo gate de consentimento RGPD | medio | P2 | confirmado | `services/MixpanelService.ts:48-50 chamado de contexts/SessionContext.tsx:135` |
| AUTH-16 | Completar perfil: dois efeitos chamam `closeFlow()` no mesmo commit e o ecrã fica em spinner infinito sem dados de utilizador | medio | P2 | risco_potencial | `app/(app)/(modals)/complete-profile/index.tsx:65-101 e 144-148` |
| AUTH-17 | Registo só é considerado bem-sucedido com HTTP 200; um 201 deixa o ecrã morto, sem sessão e sem erro | medio | P2 | risco_potencial | `app/(auth)/signup/index.tsx:106-115` |
| AUTH-18 | Erro de registo com 422 sem objeto `errors` deixa o botão de registo bloqueado para sempre | medio | P2 | risco_potencial | `app/(auth)/signup/index.tsx:116-163` |
| AUTH-19 | Dois layouts devolvem uma Promise como elemento React (crash latente em React 18) | medio | P3 | risco_potencial | `app/(auth)/_layout.tsx:10-14 e app/(app)/(tabs)/_layout.tsx:27-29` |
| AUTH-20 | Dados pessoais completos (nome, email, telemóvel, NIF, morada) guardados em AsyncStorage não cifrado | medio | P2 | confirmado | `contexts/SessionContext.tsx:59 e hooks/useAsyncStorage.ts:16-27` |
| CANCEL-01 | Taxa de cancelamento nunca é mostrada: código do valor está morto e o aviso é vago | medio | P2 | confirmado | `app/(app)/(pages)/(services)/(open)/cancel/[serviceId].tsx:98-108, 153-158` |
| CART-02 | cart-technicians procura técnicos uma única vez no mount, com dependências vazias, antes de o cesto poder estar hidratado | medio | P2 | risco_potencial | `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx:74-114` |
| CHAT-04 | Mensagens longas: limite de bloco do RSA sem maxLength nem multiline no campo de texto | medio | P2 | risco_potencial | `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:197, 458-464` |
| CLOSE-01 | Duas implementações divergentes de "fechar serviço" e leaveChannel sem efeito | medio | P2 | confirmado | `app/(app)/(pages)/(services)/(open)/status/[serviceId].tsx:69-106 vs close/index.tsx:47-84` |
| D2-02 | catch acede a error.response.status sem guarda: em erro de rede o tratamento de erro rebenta antes de mostrar o diálogo | medio (auditor propôs *alto*) ✅verificado | P0 | confirmado | `app/(app)/(tabs)/list/index.tsx:115 e app/(app)/(tabs)/home/index.tsx:241` |
| D2-03 | Conceder a permissão de localização na Home não faz absolutamente nada — os dados geocodificados são deitados fora | medio (auditor propôs *alto*) ✅verificado | P1 | confirmado | `app/(app)/(tabs)/home/index.tsx:110-135 (linha 116)` |
| D2-04 | UserHeader comentado na Home: sem morada visível, sem login para convidados e centro de notificações inacessível | medio (auditor propôs *alto*) ✅verificado | P1 | confirmado | `app/(app)/(tabs)/home/index.tsx:270-289 (bloco comentado) e components/app/UserHeader.tsx:27` |
| D2-05 | Falha da API apaga a grelha de categorias em cache e a Home fica em branco sem mensagem nem retry | medio (auditor propôs *alto*) ✅verificado | P1 | confirmado | `app/(app)/(tabs)/home/index.tsx:169-181 (linha 174) + contexts/ServiceContext.tsx:314-325` |
| D2-06 | Autocomplete escreve um OBJETO no value do TextInput ao selecionar uma sugestão | medio | P1 | confirmado | `components/Autocomplete.tsx:99-104 (linha 102)` |
| D2-07 | Pesquisa não é insensível a acentos — 'canalizacao' não encontra 'Canalização' | medio | P2 | confirmado | `app/(app)/(tabs)/list/index.tsx:193-199 e 382-391; components/Autocomplete.tsx:66` |
| D2-08 | Pesquisar descarta silenciosamente o filtro de categoria selecionado (e esconde os chips) | medio | P2 | confirmado | `app/(app)/(tabs)/list/index.tsx:193-200, 277 e 382-391` |
| D2-09 | Barra de confiança (TrustBadge) fica parcialmente escondida atrás da barra de separadores em iPhones sem home indicator | medio | P2 | risco_potencial | `app/(app)/(tabs)/home/index.tsx:268 e 512-516; components/TabBar.tsx:30` |
| D2-10 | Cada tecla na pesquisa re-renderiza a Home inteira (16 cartões com imagem) e recria a data da FlatList da Lista | medio | P2 | confirmado | `app/(app)/(tabs)/home/index.tsx:345 e 436-476; app/(app)/(tabs)/list/index.tsx:234 e 382-391` |
| D2-11 | Dependência de terceiros (images.weserv.nl) no caminho crítico de todas as imagens da Home | medio | P2 | risco_potencial | `utils/imageProxy.ts:8-18, usado em app/(app)/(tabs)/home/index.tsx:61, components/app/ServiceCard.tsx:44 e app/(app)/(tabs)/list/index.tsx:188` |
| D2-12 | Rotas órfãs dentro do separador Home: /home/services e /home/schedules | medio | P2 | confirmado | `app/(app)/(tabs)/home/services/index.tsx (todo) e app/(app)/(tabs)/home/schedules/index.tsx (todo)` |
| D2-13 | Banner de consentimento RGPD tapa a barra de separadores e ignora a safe area | medio | P2 | confirmado | `components/ConsentBanner.tsx:52-67 e app/_layout.tsx:339` |
| DEL-01 | Eliminar conta: confirmação reutiliza a copy de 'guardar alterações', não avisa sobre serviços ativos e não dá confirmação de sucesso | medio | P1 | confirmado | `app/(app)/(modals)/(profile)/delete-account/index.tsx:49-93` |
| DS-03 | Os 8 cartões de categoria da Home usam a fonte "Outfit-SemiBold", que não existe no projeto — caem para a fonte do sistema | medio | P1 | confirmado | `components/app/ServiceCard.tsx:114` |
| DS-04 | Cinco paletas de skeleton diferentes (incluindo blocos pretos) e três cores de spinner para o mesmo estado de carregamento | medio | P2 | confirmado | `app/(app)/(pages)/(services)/history/[serviceId].tsx:129-235 e app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:1155-1765 (bg-[#111215]); app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:265-271 (bg-[#EFEAE2]); app/(app)/(tabs)/home/index.tsx:407,422 (bg-[#eae4e4ff]); app/(app)/(tabs)/list/index.tsx:359-372 e app/(app)/(tabs)/history/index.tsx:174-190 (bg-gray_light)` |
| DS-05 | Duas escalas tipográficas paralelas (CustomText 706 usos vs ThemedText 40) com valores incompatíveis, mais overrides de fontSize em linha | medio | P2 | confirmado | `components/CustomText.tsx:52-100 vs components/ThemedText.tsx:51-97; ThemedText usado em 35 ficheiros, ex. app/(auth)/signin/index.tsx, app/(app)/(tabs)/profile/index.tsx, components/app/BackHeader.tsx:5` |
| ETA-01 | ETA inventado no cliente e mensagem "Está quase a chegar" mostrada precisamente quando não se sabe onde o técnico está | medio | P2 | confirmado | `app/(app)/(pages)/(services)/(open)/progress/[serviceId].tsx:130-134, 313-315` |
| GUEST-01 | Duas fontes de verdade para o serviço escolhido (guestSession vs serviceToRequest), com a stale a ganhar | medio | P2 | risco_potencial | `app/(app)/(modals)/(services)/(request)/address/guest/index.tsx:216` |
| I18N-01 | Chave de tradução em falta: botão mostra literalmente "general.cancel" no fluxo de recusa de extras | medio | P2 | confirmado | `app/(app)/(bottom-sheets)/(services)/extra-request/[extraId].tsx:230` |
| INFO-03 | Cada visualização de um serviço dispara um POST extra ao endpoint de procura de técnicos só para calcular o 'Desde' | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:52-75` |
| MSG-01 | Contador de mensagens não lidas não é mostrado em lado nenhum (único consumidor está comentado) | medio | P2 | confirmado | `components/modals/services/ServiceInProgress.tsx:137 (não montado) + contexts/ServiceContext.tsx:452-462` |
| NOTIF-02 | Sino de notificações visível a convidados; o pedido não tem catch e a lista vazia é enganadora | medio | P1 | confirmado | `components/app/UserHeader.tsx:99-120 e app/(app)/(modals)/notifications/index.tsx:42-59` |
| NOTIF-03 | Deep link de notificação nunca abre sem sessão iniciada — e dispara tardiamente se o utilizador entrar mais tarde | medio | P1 | confirmado | `contexts/NotificationsContext.tsx:76-81` |
| NOTIF-04 | Não existe forma de desativar notificações dentro da app, apesar de a rota de opt-out estar declarada | medio | P1 | confirmado | `constants/ApiRoutes.ts:58 (NOTIFICATION_OPT_OUT, nunca usada) e components/app/Profile/Settings.tsx:29-33` |
| NOTIF-05 | Permissão de push pedida no primeiro arranque, antes de qualquer contexto, e nunca reavaliada depois de negada | medio | P1 | confirmado | `contexts/NotificationsContext.tsx:40-41 e 142-172; app/_layout.tsx:333` |
| NOTIF-06 | As notificações listadas não são tocáveis e o contador de não lidas não é limpo ao consultar a lista | medio | P2 | risco_potencial | `app/(app)/(modals)/notifications/index.tsx:42-59 e 170-203; components/app/UserHeader.tsx:99-120` |
| PAY-02 | Apagar método de pagamento sem salvaguardas: o predefinido não é substituído e não se verifica se há serviço ativo a usá-lo | medio | P2 | risco_potencial | `app/(app)/(modals)/(profile)/edit-payment-method/[id].tsx:41-82` |
| PAY-10 | Modal do número MB Way grava sem validar: número inválido segue para o pedido de cobrança | medio | P1 | confirmado | `components/modals/mbway/mbway-phone-number/index.tsx:134-143` |
| PAY-11 | Adicionar cartão submete sem validação de formulário e envia o número com espaços | medio | P1 | confirmado | `app/(app)/(bottom-sheets)/new-payment-method/index.tsx:81-118 e 396-404` |
| PAY-12 | Recusa no MB Way perde tudo: sem rascunho e a voltar para a escolha de técnico | medio | P1 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/mb-way/denied.tsx:12-23 + checkout/[serviceId].tsx:787-796` |
| PAY-13 | Descontos aplicados pelo backend não aparecem: total inferior ao subtotal com a linha "Descontos" a mostrar "—" | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:1729-1750` |
| PAY-14 | Ecrãs de espera mandam "verificar novamente" um pagamento, mas o botão não existe | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx:287-301 (botão comentado) e card/waiting.tsx:276-301` |
| PAY-15 | checkout_abandoned disparado durante o próprio pagamento 3DS/MB Way: métrica de abandono inflacionada | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:349-361` |
| PAY-16 | App morta a meio do pagamento não tem qualquer caminho de recuperação | medio | P2 | risco_potencial | `contexts/ServiceContext.tsx:111 (checkoutDraft em memória) + app/(app)/_layout.tsx:22-31` |
| PAY-17 | Validação de cupão não é compatível com o modo convidado nem com o mesmo critério de "agendado" do cálculo de preço | medio | P2 | risco_potencial | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:464-500` |
| PERF-07 | Promessas sem catch em pedidos disparados a cada regresso ao primeiro plano (unhandled rejections offline) | medio | P1 | confirmado | `contexts/ServiceContext.tsx:240-248, 250-288, 290-293` |
| PERF-08 | `error.response.status` sem optional chaining rebenta dentro do próprio catch quando não há resposta | medio | P1 | confirmado | `app/(app)/(tabs)/home/index.tsx:241` |
| PERF-09 | ServiceContext re-renderiza toda a app a cada mudança de estado (value inline, sem memoização) | medio | P1 | confirmado | `contexts/ServiceContext.tsx:619-666` |
| PERF-10 | Rajada de 5+ pedidos à API em cada regresso ao primeiro plano e em cada foco de separador | medio | P1 | confirmado | `app/(app)/_layout.tsx:22-31` |
| PERF-11 | Sem deteção de rede na app: nada de NetInfo global, retry, fila offline ou estado "sem ligação" | medio | P2 | confirmado | `contexts/ApiContext.tsx:17-36` |
| PERF-12 | Pesquisa sem debounce: cada tecla filtra a lista e re-renderiza o ecrã inteiro | medio | P2 | confirmado | `components/Autocomplete.tsx:52-73` |
| PERF-13 | 18 famílias de Poppins (2,9 MB) carregadas no arranque para 6 efetivamente usadas | medio | P2 | confirmado | `app/_layout.tsx:95-114` |
| PERF-14 | Todas as imagens remotas dependem de um proxy público de terceiros sem fallback | medio | P2 | confirmado | `utils/imageProxy.ts:9-18` |
| PERF-15 | Sem deteção de queda do WebSocket enquanto a app está em primeiro plano — o estado do serviço fica congelado | medio | P2 | confirmado | `hooks/echo.ts:60-93` |
| PRIV-01 | Perfil completo do utilizador (nome, email, telefone, NIF, data de nascimento, morada) guardado em AsyncStorage sem cifra | medio | P2 | confirmado | `contexts/SessionContext.tsx:59` |
| PRIV-02 | Todas as imagens remotas, incluindo avatares de clientes e técnicos com URLs assinados, passam por um proxy público de terceiros | medio | P2 | confirmado | `utils/imageProxy.ts:17` |
| PROF-02 | Não há forma de alterar a morada a partir do Perfil, apesar de a copy do menu a prometer | medio | P1 | confirmado | `app/(app)/(tabs)/profile/index.tsx:287-293 e app/(app)/(modals)/(profile)/edit-profile/index.tsx (ecrã completo)` |
| PROG-01 | Ecrã de acompanhamento não lê o parâmetro de rota nem tem guarda de contexto vazio | medio | P2 | confirmado | `app/(app)/(pages)/(services)/(open)/progress/[serviceId].tsx:104-134` |
| SEC-05 | Grupo (app) sem guarda de sessão e JSON.parse de parâmetros de rota sem proteção — deep link consegue crashar a app | medio | P2 | confirmado | `app/(app)/(modals)/(profile)/edit-payment-method/[id].tsx:22` |
| SEC-06 | Token do projeto Mixpanel em texto claro num ficheiro versionado (AGENTS.md) | medio | P2 | confirmado | `AGENTS.md:9` |
| SEC-07 | console.log do erro de axios no login pode expor a palavra-passe em texto claro nos logs do dispositivo | medio | P2 | risco_potencial | `app/(auth)/signin/index.tsx:156` |
| SEC-08 | Deep link de retorno do 3DS escrito com dois pontos duplicados (piquet.customer:://) — o ramo de sucesso pode nunca corresponder | medio | P2 | risco_potencial | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:627,645,656` |
| SEC-09 | Websocket em claro é provavelmente bloqueado pelo ATS do iOS e pela política de cleartext do Android em release | medio | P2 | risco_potencial | `ios/Piquet/Info.plist:50-56 vs hooks/echo.ts:24-28` |
| SET-01 | Mudar o idioma nas Definições não é comunicado ao backend — emails e notificações continuam no idioma antigo | medio | P1 | confirmado | `components/app/Profile/Settings.tsx:102 e contexts/SessionContext.tsx:84-102` |
| START-01 | Ecrã de introdução do serviço urgente é código morto e o seu único botão aponta para uma rota inexistente | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/start/index.tsx:122` |
| SUP-02 | Tickets de suporte enviados para um endpoint público hardcoded de outro domínio, fora da instância api | medio | P2 | confirmado | `app/(app)/(modals)/support-ticket/index.tsx:25, 77, 106-118` |
| VENDOR-02 | Ao entrar em select-vendor sem contexto, o serviço é reconstruído só com o id — nome e duração desaparecem do checkout | medio | P2 | risco_potencial | `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:63-70` |
| WAIT-02 | Cliente já pagou e pode sair do ecrã de espera sem qualquer confirmação; nenhum ecrã de timeout/recusa diz o que acontece ao dinheiro | medio (auditor propôs *alto*) ✅verificado | P0 | confirmado | `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:209-236 e 521-530` |
| WAIT-03 | Serviço cancelado é mostrado ao cliente como 'Tempo esgotado' | medio | P2 | confirmado | `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:307-309 e 318-322` |
| ZONE-01 | Lista de espera de zona promete aviso ao cliente mas só regista o contacto no Mixpanel | medio | P2 | confirmado | `app/(app)/(modals)/blocked-by-zone/index.tsx:49-65` |
| AUTH-21 | Colar um número de telemóvel contorna o `maxLength` e envia um número malformado (+351351...) | baixo | P3 | confirmado | `app/(auth)/signin/index.tsx:72-86 e 229-246` |
| AUTH-22 | Retoma de sessão de convidado implementada mas nunca usada — a funcionalidade não existe para o utilizador | baixo | P3 | confirmado | `contexts/GuestSessionContext.tsx:76,83-86,189-191` |
| AUTH-23 | `getOpenService` sem tratamento de erro gera unhandled rejection sempre que o pedido falha | baixo | P3 | confirmado | `contexts/ServiceContext.tsx:240-248 chamado de app/(app)/_layout.tsx:24` |
| CAMP-01 | campaignLogId sobrevive ao fim de sessão e o temporizador de 48 h não sobrevive ao fecho da app | baixo | P3 | confirmado | `contexts/CampaignContext.tsx:14, 30-41` |
| CHAT-05 | Bolhas de mensagem ocupam a largura total, anulando a distinção visual entre cliente e técnico | baixo | P3 | risco_potencial | `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:30-31, 50-51` |
| D2-14 | Separador Histórico aparece desativado (opacidade 50%) para convidados mas continua clicável | baixo | P3 | confirmado | `components/TabBar.tsx:136-145 (linha 140)` |
| D2-15 | Cartão 'Agendamentos' na Home mostrado a convidados sempre com 0 serviços | baixo | P3 | confirmado | `app/(app)/(tabs)/home/index.tsx:379 e app/(app)/(tabs)/home/schedules/index.tsx:54-83` |
| D2-16 | Contraste insuficiente nos separadores não selecionados (4.34:1) e etiquetas sem tamanho definido | baixo | P3 | confirmado | `components/TabBar.tsx:120, 144 e app/(app)/(tabs)/_layout.tsx:56, 70, 98, 130` |
| D2-17 | Ordenação alfabética não usa localeCompare — nomes acentuados vão para o fim da lista | baixo | P3 | confirmado | `utils/index.ts:42-50, usado em app/(app)/(tabs)/home/index.tsx:440,460 e app/(app)/(tabs)/list/index.tsx:281,384,390` |
| D2-18 | Botão de retroceder no ecrã raiz de um separador (Serviços) com fallback que faz dismissAll + replace | baixo | P3 | risco_potencial | `app/(app)/(tabs)/list/index.tsx:204-212 e components/app/BackHeader.tsx:31-49` |
| DS-06 | Seis primitivas de toque diferentes para o mesmo tipo de botão, com feedback visual inconsistente ou inexistente | baixo | P2 | confirmado | `components/CustomTouchableOpacity.tsx (119 usos), components/TouchOpacity.tsx (23), TouchableOpacity direto (61), TouchableWithoutFeedback (10), TouchableHighlight (3), components/FilterButton.tsx (wrapper morto)` |
| DS-07 | Elevação e raios sem sistema: 8 valores de shadowOpacity, 6 de elevation e 20 raios distintos | baixo | P2 | confirmado | `transversal — 62 blocos de sombra em app/ e components/; ex. app/(app)/(bottom-sheets)/(services)/rate/[serviceId].tsx:128 (0.27), app/(app)/(tabs)/cart/index.tsx:282 (0.4), components/ConsentBanner.tsx:66 (elevation 1000), app/(app)/(modals)/(services)/(schedule)/schedule/schedule-service.tsx:715 (0.5)` |
| DS-08 | components/Checkbox.tsx importa Colors do módulo interno do React Native — as cores que usa são undefined | baixo | P3 | confirmado | `components/Checkbox.tsx:4, 30, 33` |
| DS-09 | Prop `classes` passada a CustomTouchableOpacity é silenciosamente ignorada (a prop declarada é `className`) | baixo | P3 | confirmado | `components/CustomTouchableOpacity.tsx:22,158; chamadores: components/HomeSection.tsx:28, components/ConsentBanner.tsx:27,45, app/(auth)/signin/index.tsx:514,522,530, app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:79,466` |
| DS-10 | CustomTouchableOpacity: um `style` passado pelo chamador substitui todo o estilo derivado de type/size | baixo | P3 | risco_potencial | `components/CustomTouchableOpacity.tsx:143-161; chamador afetado: components/app/ServiceCard.tsx:48-58` |
| LOG-01 | Payload completo do serviço (com dados pessoais do cliente) impresso em consola em produção | baixo | P3 | confirmado | `contexts/ServiceContext.tsx:246` |
| NOTIF-07 | Resposta de arranque a frio pode ser processada duas vezes, duplicando a navegação | baixo | P2 | risco_potencial | `contexts/NotificationsContext.tsx:59-65` |
| PAY-03 | Ecrã de Pagamentos: cabeçalho diz 'Perfil' e o botão de adicionar cartão aparece duplicado quando não há métodos | baixo | P2 | confirmado | `app/(app)/(pages)/(payments)/payments.tsx:25 e components/app/Profile/Payments.tsx:102-142` |
| PAY-18 | Mensagem de erro do pagamento anterior fica visível durante a nova tentativa | baixo | P3 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:775-780, 1813-1818` |
| PAY-19 | guest_token propagado em query string no pedido de dados de faturação | baixo | P3 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:378-382` |
| PERF-16 | Listas sem otimizações do FlatList e com renderItem recriado a cada render | baixo | P2 | confirmado | `app/(app)/(tabs)/list/index.tsx:380-407` |
| PERF-17 | setInterval do OTP no checkout sem limpeza no unmount | baixo | P3 | confirmado | `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:871-882` |
| PERF-18 | O splash animado depende de um onLayout que, se não disparar, deixa a app presa no GIF | baixo | P3 | risco_potencial | `app/_layout.tsx:117-128, 267-275` |
| PERF-19 | Cesto: N pedidos paralelos de técnicos, um por item, sem limite ao tamanho do cesto | baixo | P3 | confirmado | `app/(app)/(modals)/(services)/(request)/cart-technicians/index.tsx:74-113` |
| PROF-03 | Código morto no separador Perfil e separador visual desenhado a mais no último item | baixo | P3 | confirmado | `app/(app)/(tabs)/profile/index.tsx:3, 46-83, 86-109, 123-151 e components/app/Profile/MyProfile.tsx:80` |
| PROF-04 | Escolha de avatar sem tratamento de permissão negada nem limite de tamanho | baixo | P2 | risco_potencial | `app/(app)/(modals)/(profile)/edit-profile/index.tsx:38-53 e 86-101` |
| VENDOR-03 | Cartões de técnico e de tipo de serviço não têm proteção contra duplo toque | baixo | P3 | risco_potencial | `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:321-323 e select-service-type/[operationAreaId].tsx:298` |


---

# F. Auditoria de UX/UI

Ver **`UX_UI_AUDIT.md`**.

# G. Auditoria de copys

Ver **`COPY_AUDIT.md`** (45 problemas de texto).

# H. Performance, estabilidade e segurança

Consolidado nas secções E.1/E.2 (domínios D8 e D9). Destaques:

- **Arranque:** splash com temporizador **fixo de 3650 ms**, depois de carregar 18 famílias
  Poppins (~2,9 MB); nenhum pedido à API durante esse tempo.
- **Websockets:** `useEcho` **não é singleton** — abre uma ligação por componente que o
  chama (6 sítios). Durante um serviço ativo há 2-3 ligações em paralelo.
- **Re-renders:** o efeito de subscrição do canal depende do objeto `openService`, que é
  substituído a cada atualização de GPS → leave+rejoin do canal e re-render de todos os
  consumidores do contexto.
- **Segurança confirmada:** tickets de suporte legíveis sem autenticação (✅ testado);
  websocket sem TLS (✅ código).
- **Privacidade:** PII (nome, email, telefone, morada) em `AsyncStorage` **não encriptado**,
  enquanto o token está corretamente em SecureStore.
- **Observabilidade:** Sentry integralmente comentado — **zero** captura de erros em produção.

# I. Testes automatizados recomendados

Ver **`AUTOMATED_TEST_PLAN.md`** (73 testes propostos, 20 em P0).

# J. Plano de melhoria · K. Top 20 ações

Ver **`PRIORITIZED_IMPROVEMENTS.md`**.

---

## Nota final

Esta auditoria **não alterou uma única linha de código, design ou copy**, conforme pedido.
O repositório foi deixado limpo. Nenhuma ação destrutiva foi executada em produção — o
único pedido feito contra sistemas reais foi um `GET` de leitura para provar a
vulnerabilidade SEC-01, sem expor no relatório o conteúdo obtido.
