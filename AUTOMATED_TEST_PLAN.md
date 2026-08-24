# Plano de testes automatizados — App Cliente Piquet

## Situação atual

**A app não tem um único teste automatizado.** `find . -iname "*.test.*" -o -iname "*.spec.*"`
(fora de `node_modules`) devolve **zero** resultados. Não há Jest configurado para a app,
nem Detox/Maestro, nem testes de API.

Isto, numa app que **movimenta dinheiro real** (cartão + MB Way), é o maior risco
estrutural do projeto: não existe rede de segurança para detetar regressões em duplo
pagamento, reconciliação 3DS ou cálculo de valores.

## Ferramentas recomendadas

| Camada | Ferramenta | Porquê |
|---|---|---|
| Unitário / lógica pura | **Jest** + ts-jest | já há infra mínima; começar por `utils/money`, timers, reducers |
| Componentes | **@testing-library/react-native** | testar comportamento visível, não implementação |
| Integração / contexts | Jest + `msw` (mock de rede) | testar ApiContext, refresh, ServiceContext sem backend real |
| E2E | **Maestro** (mais simples que Detox para Expo) | fluxos críticos ponta a ponta em simulador |
| API (contratos) | Jest + supertest contra staging | garantir que o backend não parte a app |
| Acessibilidade | `@testing-library/react-native` + `jest-axe`-like asserts + **teste manual com texto XXXL** | o defeito E-06 passaria despercebido a qualquer teste que não escale o texto |
| Visual | Maestro screenshots ou Percy | detetar quebras de layout |

## Prioridade 0 — antes de mais nada (20 testes)

Estes cobrem dinheiro, sessão e segurança. Sem eles, qualquer alteração no checkout é
uma aposta.

### T01 · Provar que uma sessão sobrevive à expiração do access token entre arranques da app (regressão de AUTH-01)
- **Cenário:** Utilizador autenticado reabre a app depois de o access token ter expirado
- **Pré-condições:** Ambiente de staging com TTL de JWT configurável; proxy de rede (Proxyman/Charles) ou logs no interceptor.
- **Passos:** 1. Iniciar sessão no simulador. 2. Encurtar artificialmente o TTL do JWT no backend de staging (ou substituir manualmente o valor guardado no SecureStore por um token com `exp` no passado). 3. Fechar a app por completo. 4. Reabrir e observar: (a) tráfego de rede — tem de haver um POST /auth/refresh; (b) o ecrã final — home autenticada, e não o estado de convidado.
- **Resultado esperado:** Um único POST /auth/refresh bem-sucedido, /auth/me a 200 e o utilizador continua autenticado. Nenhuma chamada a /auth/logout.
- **Ferramenta:** Teste manual no simulador iOS com inspeção de rede; automatizável depois como teste de integração do SessionContext com axios-mock-adapter
- **Ficheiros:** `contexts/SessionContext.tsx`, `contexts/ApiContext.tsx`

### T02 · Garantir que nenhum caminho de falha de login é mudo (regressão de AUTH-03)
- **Cenário:** Login por email com cada classe de erro
- **Pré-condições:** Instalar infraestrutura de testes (a app tem zero testes automatizados hoje): jest + jest-expo + @testing-library/react-native.
- **Passos:** Com axios-mock-adapter (ou msw), montar o ecrã de signin e simular, um a um: 401, 422, 429, 500, timeout de rede e erro sem `response`. Após cada submissão, verificar que existe um nó de texto de erro visível e que o botão volta a estar ativo.
- **Resultado esperado:** Em todos os seis casos aparece uma mensagem específica e o botão fica reativado; nenhum caso termina sem feedback.
- **Ferramenta:** jest + @testing-library/react-native
- **Ficheiros:** `app/(auth)/signin/index.tsx`

### T03 · Provar que a lista de serviços recupera de uma falha de rede sem reiniciar a app
- **Cenário:** Separador Serviços com o primeiro pedido falhado
- **Pré-condições:** App instalada, sessão iniciada, backend acessível para a fase 2
- **Passos:** 1. Ativar modo avião antes de abrir a app. 2. Abrir a app e tocar no separador Serviços. 3. Verificar a mensagem apresentada. 4. Desativar o modo avião. 5. Trocar para a Home e voltar a Serviços. 6. Puxar a lista para baixo.
- **Resultado esperado:** No passo 3 aparece uma mensagem de erro de LIGAÇÃO (não 'não há serviços na sua zona') com botão 'Tentar novamente'; no passo 5 ou 6 a lista carrega. Hoje falha nos três pontos.
- **Ferramenta:** Manual no simulador iOS/Android com toggle de rede (ou Charles/Proxyman a devolver erro em POST /search-operation-areas)
- **Ficheiros:** `app/(app)/(tabs)/list/index.tsx`

### T04 · Garantir que os catches de erro não rebentam quando não existe resposta HTTP
- **Cenário:** Teste unitário do tratamento de erro
- **Pré-condições:** Infraestrutura de testes a instalar (a app não tem nenhum teste automatizado)
- **Passos:** 1. Instalar jest + @testing-library/react-native + jest-expo. 2. Escrever um teste que monte o ecrã Serviços com um mock de `api.post` que rejeita com `new Error('Network Error')` (sem propriedade `response`). 3. Afirmar que o diálogo de erro foi chamado e que não houve exceção não capturada.
- **Resultado esperado:** O openDialog é chamado com errors.title; nenhuma exceção escapa. Hoje o teste falha com TypeError em error.response.status.
- **Ferramenta:** jest + @testing-library/react-native (jest-expo preset)
- **Ficheiros:** `app/(app)/(tabs)/list/index.tsx`, `app/(app)/(tabs)/home/index.tsx`, `contexts/ServiceContext.tsx`, `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx`

### T05 · Garantir que o cliente nunca fica preso no ecrã de espera com o botão de cancelar inutilizável
- **Cenário:** Contagem decrescente chega a 0 com o serviço ainda PENDING no backend
- **Pré-condições:** Serviço criado e pago; backend com a janela de aceitação real (mock a devolver status PENDING depois do fim da contagem local)
- **Passos:** 1. Renderizar <WaitAccept> com um service cujo updated_at é anterior à janela local. 2. Deixar o Timer atingir 0. 3. Fazer o mock de GET_SERVICE_DETAILS devolver status PENDING. 4. Inspecionar o botão 'Cancelar'.
- **Resultado esperado:** O botão 'Cancelar' continua ativo e o ecrã mostra um estado explícito de continuação da procura; nunca um 0:00 com tudo desativado.
- **Ferramenta:** Jest + React Native Testing Library (com axios mockado e timers falsos)
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx`, `components/Timer.tsx`

### T06 · Bloquear a regressão da janela de aceitação
- **Cenário:** Coerência entre a constante de espera e a copy apresentada
- **Pré-condições:** Nenhuma
- **Passos:** 1. Teste unitário que importa TIME_TO_WAIT_FOR_VENDOR e SCHEDULED_TIME_TO_WAIT_FOR_VENDOR. 2. Extrai o número da string services.urgent_intro.step_countdown_desc (pt_PT e en_US). 3. Compara os valores em segundos.
- **Resultado esperado:** O número prometido na copy é igual à janela usada pelo código nos dois idiomas.
- **Ferramenta:** Jest (teste puro, sem render)
- **Ficheiros:** `components/Timer.tsx`, `translation/resources/pt_PT.ts`, `translation/resources/en_US.ts`

### T07 · Impedir para sempre o duplo pagamento por duplo-toque ou por retoma após timeout
- **Cenário:** Testes unitários do handler de pagamento do checkout: (a) dois toques em "Confirmar e pagar" em rápida sucessão; (b) toque durante o intervalo de 1 s posterior ao sucesso do MB Way; (c) toque novo após um erro de timeout da API.
- **Pré-condições:** —
- **Passos:** Extrair handleOpenService/handleOpenServiceWithMbWay para um hook testável (useCheckoutPayment) que receba a instância axios por injeção. Montar com @testing-library/react-native, mockar POST_OPEN_SERVICE / POST_OPEN_SERVICE_MBWAY com jest.fn() de resolução atrasada e disparar fireEvent.press duas vezes seguidas; avançar timers com jest.useFakeTimers para cobrir a janela de 1000 ms.
- **Resultado esperado:** O mock do POST é chamado exatamente 1 vez em todos os cenários; no cenário (c) a segunda chamada leva a mesma chave de idempotência da primeira.
- **Ferramenta:** Jest + @testing-library/react-native (a instalar — o projeto não tem qualquer teste)
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`

### T08 · Garantir que o ecrã de espera do MB Way resolve sempre, independentemente do estado global
- **Cenário:** verifyStatus/ecrã mb-way/waiting com openService e/ou servicePendingAcceptance preenchidos (o caso do PAY-01).
- **Pré-condições:** —
- **Passos:** Testar o ServiceProvider isoladamente: com servicePendingAcceptance != null, chamar verifyStatus('123') e avançar timers 10 s; depois montar o ecrã mb-way/waiting com o provider nesse estado e verificar que há chamadas ao GET payment-status e que, com resposta 200, ocorre navegação para mb-way/confirmed (mock do router do expo-router).
- **Resultado esperado:** O polling arranca sempre que existe serviceId; ao fim de 24 tentativas sem desfecho, onTimeout é chamado e o ecrã mostra a mensagem de timeout.
- **Ferramenta:** Jest + @testing-library/react-native com jest.useFakeTimers e mock de expo-router
- **Ficheiros:** `contexts/ServiceContext.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx`

### T09 · Provar (ou desmentir) o bloqueio de navegação pelo guard beforeRemove após 3DS bem sucedido — PAY-06
- **Cenário:** Pagamento com cartão real em ambiente de teste, com 3DS aprovado, e inspeção da stack de navegação.
- **Pré-condições:** —
- **Passos:** Correr a app no simulador iOS e num Android físico; instrumentar temporariamente o listener beforeRemove com um console.log antes do e.preventDefault(); pagar com um cartão de teste 3DS e aprovar. Confirmar (i) se o log de preventDefault aparece, (ii) se o checkout continua na stack (carregar em back a partir do wait-accept), (iii) repetir para 3DS recusado e para o retorno ambíguo (fechar o browser a meio).
- **Resultado esperado:** Nenhum preventDefault nas navegações de desfecho; ao chegar ao wait-accept/denied/waiting o checkout já não está na stack e o back não o devolve.
- **Ferramenta:** Execução manual no simulador/dispositivo + logs (ou Maestro, se for adotado E2E)
- **Ficheiros:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx`

### T10 · Provar a perda de eventos causada pelo leave+rejoin do canal (RT-01) e validar a correção
- **Cenário:** Serviço aceite, técnico a enviar atualizações de localização; evento crítico emitido durante a janela de re-subscrição
- **Pré-condições:** —
- **Passos:** 1. Instrumentar temporariamente contexts/ServiceContext.tsx para registar cada subscribe/leave com timestamp. 2. Emitir no canal common.services.{id} uma sequência de 20 .UpdateLocationEvent com 2s de intervalo. 3. Ao 10.º ping, emitir .ServiceArrivedEvent no mesmo instante. 4. Contar quantos pares leave/subscribe ocorreram e se o ecrã /vendor-arrived abriu. 5. Aplicar a correção (deps por id) e repetir.
- **Resultado esperado:** Antes: ~20 ciclos de leave/subscribe e o ServiceArrivedEvent perdido em pelo menos uma das repetições. Depois: 1 subscribe no total e o evento sempre entregue.
- **Ferramenta:** Cliente WebSocket/Reverb (tinker ou script de broadcast no backend) + logs Metro no simulador iOS
- **Ficheiros:** `contexts/ServiceContext.tsx`, `hooks/echo.ts`

### T11 · Provar o achado NOTIF-01 — que o token de push continua associado à conta anterior depois do logout
- **Cenário:** Troca de conta no mesmo dispositivo físico
- **Pré-condições:** Dois dispositivos ou duas contas reais; acesso ao backend para inspecionar a tabela de devices e para disparar uma notificação dirigida a uma conta específica
- **Passos:** 1. Sessão com a conta A num dispositivo físico, aceitar notificações e confirmar no backend a linha (expoPushToken, A). 2. Terminar sessão pelo Perfil. 3. Inspecionar de novo a tabela de devices. 4. Sessão com a conta B no mesmo dispositivo. 5. Disparar uma notificação dirigida à conta A.
- **Resultado esperado:** Após o passo 2 o registo do device deixa de estar associado a A; no passo 5 nada chega ao dispositivo. Enquanto a correção não existir, o teste falha nos dois pontos — é exatamente isso que se quer demonstrar antes de corrigir.
- **Ferramenta:** Teste manual em dispositivo físico (o expo-notifications não obtém token em simulador — ver o guard Device.isDevice em NotificationsContext.tsx:152) com verificação na base de dados
- **Ficheiros:** `contexts/NotificationsContext.tsx`, `contexts/SessionContext.tsx`

### T12 · Blindar as validações de nome e NIF, que já produziram um bloqueio total no ecrã de faturação
- **Cenário:** Testes unitários das regras de validação de formulário
- **Pré-condições:** Introduzir Jest com jest-expo no projeto (não existem testes automatizados na app; há apenas a pasta components/__tests__)
- **Passos:** 1. Extrair as regras de nome de invoice-data/index.tsx:209-220 e edit-profile/index.tsx:280-291 para um `validateFullName` em utils/. 2. Escrever casos: 'André Lacerda' (válido), 'André Lacerda Silva' (válido — hoje falha), 'Maria João de Vasconcelos' (válido), "Sofia D'Almeida" (válido), 'Ana Vila-Nova' (válido), 'André' (inválido), '   ' (inválido), 'André 123' (inválido), string com 51 caracteres (inválido). 3. Fazer o mesmo para validateNIF com NIFs válidos e inválidos de cada prefixo.
- **Resultado esperado:** Todos os casos passam. O caso 'André Lacerda Silva' é o teste de regressão que impede o regresso do `|| length > 2`.
- **Ferramenta:** Jest + jest-expo (testes puros, sem render)
- **Ficheiros:** `app/(app)/(modals)/(payments)/invoice-data/index.tsx`, `app/(app)/(modals)/(profile)/edit-profile/index.tsx`, `utils/index.ts`

### T13 · Provar o achado PROF-01 — que uma falha ao guardar o perfil não produz feedback e pode rebentar no catch
- **Cenário:** Guardar perfil com o servidor a falhar
- **Pré-condições:** Ambiente onde se possa forçar respostas do backend (mock do axios ou proxy) e app a correr
- **Passos:** 1. Abrir Editar Perfil, mudar o nome. 2. Forçar a resposta de /auth/profile a ser um erro de rede sem `response` (modo avião a meio do pedido) e guardar. 3. Repetir forçando um 422 com body `{errors:{nif:['...']}}`. 4. Repetir forçando um 500 sem chave `errors`.
- **Resultado esperado:** Nos três casos, um diálogo de erro visível. Hoje: no caso 2 lança TypeError na linha 132; no caso 3 nada aparece (campo nif sem UI); no caso 4 `Object.keys(undefined)` lança. Após a correção descrita em PROF-01, os três mostram diálogo.
- **Ferramenta:** Teste manual com mock do axios, ou teste de componente com React Native Testing Library + mock do ApiContext
- **Ficheiros:** `app/(app)/(modals)/(profile)/edit-profile/index.tsx`

### T14 · Impedir que voltem a entrar pares de cor abaixo de AA — transformar a auditoria de contraste em teste automático
- **Cenário:** Teste unitário que calcula o rácio de contraste WCAG 2.1 de todas as combinações token-de-texto × token-de-fundo efetivamente usadas na app, e falha se alguma combinação declarada como "texto sobre fundo claro" ficar abaixo de 4,5:1
- **Pré-condições:** Jest já está configurado no projeto (existe components/__tests__/ThemedText-test.tsx e um snapshot), pelo que não é preciso instalar nada.
- **Passos:** 1. Criar utils/contrast.ts com sRGB→luminância relativa e ratio(a,b) (fórmula WCAG 2.1, ~20 linhas). 2. Criar __tests__/contrast.test.ts com uma tabela explícita de pares permitidos, ex.: [gray_medium, background], [gray_medium, support_secondary], [secondary, primary], [primary, secondary], [success, support_secondary], [error, support_secondary], [gray_light, support_secondary]. 3. Para cada par, expect(ratio).toBeGreaterThanOrEqual(4.5), com uma allowlist explícita e comentada para pares que sejam legitimamente só decorativos (bordas, divisórias). 4. Ligar ao CI.
- **Resultado esperado:** Com os tokens atuais o teste falha imediatamente em gray_medium/branco (3,69), gray_medium/creme (3,45), gray_light/branco (1,92), primary/branco (1,70), success/branco (3,77) — confirmando A11Y-01, A11Y-02 e A11Y-09. Depois de aplicadas as correções propostas, passa a verde e impede regressões.
- **Ferramenta:** Jest (já instalado) + utils/contrast.ts novo
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/constants/Colors.ts`, `/Users/andrelacerda/dev/app-costumer/constants/DesignTokens.ts`, `/Users/andrelacerda/dev/app-costumer/components/CustomText.tsx`

### T15 · Medir o tempo real até ao primeiro conteúdo e provar o custo do temporizador fixo
- **Cenário:** Cold start em dispositivo real de gama média (Android) e iPhone, com e sem cache de fontes
- **Pré-condições:** Build de produção instalada; app morta (kill); sessão guardada
- **Passos:** 1. Instrumentar app/_layout.tsx com `console.time('boot')` no topo do módulo e `console.timeEnd('boot')` no primeiro render da Home. 2. Registar também o instante em que `fontsLoaded` fica true e o instante em que `showAnimatedSplash` passa a false. 3. Repetir 5 vezes por dispositivo e tirar a mediana. 4. Repetir com o setTimeout de 3650 ms reduzido a 0 para isolar o custo das fontes.
- **Resultado esperado:** Baseline documentada; espera-se ver ~3,65 s de espera pura mais o tempo de fontes. Serve de referência para validar a correção de PERF-01 e PERF-13.
- **Ferramenta:** instrumentação manual + Flashlight/adb para Android
- **Ficheiros:** `app/_layout.tsx`

### T16 · Verificar o logout espúrio por token expirado (PERF-03)
- **Cenário:** Sessão com JWT expirado ao regressar ao primeiro plano
- **Pré-condições:** Conhecer o TTL do access token; conta de teste com email ou telefone não verificados (para o efeito de app/(app)/_layout.tsx:27 disparar)
- **Passos:** 1. Autenticar-se. 2. Enviar a app para background durante mais do que o TTL do token. 3. Trazer para o primeiro plano. 4. Observar se o utilizador continua autenticado e se aparece o diálogo de sessão terminada.
- **Resultado esperado:** Hoje espera-se o diálogo de sessão terminada e ecrã de login, porque /auth/me usa axios cru sem refresh. Depois da correção, o token deve ser renovado silenciosamente e o utilizador continuar na Home.
- **Ferramenta:** manual + proxy para observar /auth/me e /auth/refresh
- **Ficheiros:** `contexts/SessionContext.tsx`, `contexts/ApiContext.tsx`

### T17 · Confirmar o beco sem saída do MB WAY quando já existe serviço aberto/pendente (PERF-02)
- **Cenário:** Pagamento MB WAY com servicePendingAcceptance já preenchido
- **Pré-condições:** Um pedido anterior ainda em estado pendente de aceitação
- **Passos:** 1. Criar um pedido e deixá-lo pendente (não aceite). 2. Iniciar novo pedido e pagar por MB WAY. 3. No ecrã mb-way/waiting, esperar mais de 4 minutos sem autorizar o pagamento. 4. Verificar se aparece a mensagem de timeout e o botão 'Ir para a página inicial'.
- **Resultado esperado:** Hoje: o contador chega a 0:00 e nada acontece — não há polling nem timeout, e a única ação é cancelar. Depois da correção: mensagem de timeout e saída disponível.
- **Ferramenta:** manual + log em contexts/ServiceContext.tsx:533
- **Ficheiros:** `contexts/ServiceContext.tsx`, `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx`

### T18 · Provar ou desmentir a enumeração de tickets de suporte de terceiros (SEC-01) antes de qualquer correção
- **Cenário:** Um atacante sem credenciais lê mensagens de suporte de outros clientes
- **Pré-condições:** Existirem pelo menos dois tickets criados a partir da app (ids atribuídos por sequência a partir de TK-1101). Executar a partir de uma máquina sem sessão no dashboard.
- **Passos:** 1. Criar um ticket pela app e anotar o id devolvido (ex. TK-1187).
2. Executar: curl -s 'https://piquet-dashboard.vercel.app/api/tickets?ids=TK-1180,TK-1181,TK-1182,TK-1183,TK-1184,TK-1185,TK-1186' | jq .
3. Inspecionar os campos subject e reply_preview de cada ticket devolvido.
- **Resultado esperado:** O teste PASSA (defeito confirmado) se forem devolvidos assunto ou reply_preview de tickets que não foram criados por esta instalação. Após a correção proposta, o mesmo pedido deve devolver lista vazia ou 401/403.
- **Ferramenta:** curl + jq (manual, uma vez); depois teste automatizado no repositório do dashboard com Vitest a bater no route handler
- **Ficheiros:** `/Users/andrelacerda/Developer/Dashboard Piquet/src/app/api/tickets/route.ts`, `/Users/andrelacerda/dev/app-costumer/app/(app)/(modals)/support-ticket/index.tsx`

### T19 · Determinar se o canal de tempo real está efetivamente em claro, ou bloqueado pelas políticas de rede em release (SEC-02, SEC-09)
- **Cenário:** Serviço em curso com troca de mensagens no chat, em build de release
- **Pré-condições:** Build de release instalada em dispositivo físico iOS e Android; um serviço aceite e em curso; acesso ao ponto de acesso Wi-Fi para captura.
- **Passos:** 1. iOS: abrir a Consola do macOS com o dispositivo ligado, filtrar por 'App Transport Security' e 'cfnetwork' enquanto se abre o chat.
2. Android: adb logcat | grep -iE 'cleartext|NetworkSecurityConfig|pusher|websocket'.
3. Nas duas plataformas: enviar uma mensagem a partir da app do técnico e cronometrar quantos segundos leva a aparecer na app do cliente sem sair e voltar a entrar no ecrã.
4. Em paralelo, com Wireshark no gateway, filtrar tcp.port == 8080 e verificar se o payload é legível.
- **Resultado esperado:** Duas conclusões possíveis, ambas acionáveis: (a) se houver bloqueio de ATS/cleartext nos logs e a mensagem só aparecer após refetch, o tempo real está partido em release — sobe para P0 funcional; (b) se o tráfego na 8080 for legível em claro no Wireshark, confirma-se a exposição de morada, telefone e mensagens. Depois da correção, deve ver-se handshake TLS na porta configurada e nenhum payload legível.
- **Ferramenta:** Consola macOS / adb logcat + Wireshark, com dispositivos físicos
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/hooks/echo.ts`, `/Users/andrelacerda/dev/app-costumer/ios/Piquet/Info.plist`

### T20 · Verificar que nenhum dado pessoal chega aos logs do dispositivo numa build de produção (SEC-03, SEC-07)
- **Cenário:** Percurso completo: login por SMS, abrir serviço, foreground/background, avaliar, tentativa de login falhada com password
- **Pré-condições:** Build de release (yarn build-local:android:production) num dispositivo físico com adb.
- **Passos:** 1. adb logcat -c && adb logcat > /tmp/piquet.log em paralelo com o percurso.
2. Executar: login por SMS → criar serviço → mandar a app para background e trazer de volta (dispara getOpenService) → avaliar um serviço com comentário → sair e tentar login por email/password com password errada.
3. Analisar: grep -inE '@|\+351|nif|last4|password|latitude' /tmp/piquet.log
- **Resultado esperado:** Zero ocorrências. Hoje espera-se encontrar, no mínimo, o payload do serviço aberto com email/telefone/morada (ServiceContext.tsx:246). Este é o teste de aceitação da correção do transform-remove-console.
- **Ferramenta:** adb logcat + grep; automatizável depois como verificação no CI de release
- **Ficheiros:** `/Users/andrelacerda/dev/app-costumer/contexts/ServiceContext.tsx`, `/Users/andrelacerda/dev/app-costumer/babel.config.js`, `/Users/andrelacerda/dev/app-costumer/app/(auth)/signin/index.tsx`


## Prioridade 1 — antes do próximo lançamento (38 testes)

| Objetivo | Cenário | Ferramenta |
|---|---|---|
| Provar o single-flight do refresh de token (regressão de AUTH-04) | Vários pedidos em paralelo com o token já expirado | jest + axios-mock-adapter |
| Verificar o re-registo do token de push após logout→login (regressão de AUTH-05) | Troca de conta sem fechar a app | Teste manual em dispositivo físico + ver |
| Medir o tempo até conteúdo útil no arranque (regressão de AUTH-06) | Arranque a frio com sessão guardada | Gravação de ecrã + cronometragem manual; |
| Confirmar que existe caminho de eliminação de conta para utilizadores sem palavra-passe (AUTH-07) | Conta criada por OTP de telemóvel | Teste manual no simulador/dispositivo (r |
| Garantir que o logout não deixa dados do utilizador anterior (regressão de AUTH-08) | Troca de conta no mesmo dispositivo | Teste manual + teste unitário jest da fu |
| Verificar o comportamento offline dos handlers de erro (regressão de AUTH-09) | Ecrãs principais sem ligação à rede | Teste manual com logs; complementar com  |
| Validar o percurso de convidado até conta registada de ponta a ponta (AUTH-14, AUTH-22) | Convidado conclui checkout com OTP | Teste manual no simulador iOS; candidato |
| Provar o percurso completo da permissão de localização, incluindo negação permanente | Banner de geolocalização na Home | Manual em dispositivo físico iOS e Andro |
| Confirmar a inacessibilidade do centro de notificações e mapear o que se perdeu com o UserHeader | Auditoria de alcançabilidade de rotas | grep + navegação manual + envio de push  |
| Impedir o CTA de pagamento inerte | Checkout aberto sem service_type ou sem vendor no contexto | Jest + React Native Testing Library |
| Garantir que o cesto de convidado sobrevive ao passo da morada | Convidado com 3 itens no cesto e sem morada escolhe 'Imediato' | Maestro (E2E no simulador) ou RNTL com o |
| Distinguir falha técnica de zona sem cobertura | POST de procura de técnicos falha por rede e por 5xx | Jest + React Native Testing Library |
| Alinhar o preço 'Desde' com os técnicos efetivamente apresentados | Backend devolve 6 técnicos em que o mais barato está na 5.ª posição | Jest + React Native Testing Library |
| Fixar as unidades monetárias do funil (cêntimos vs euros) | Todos os pontos onde o funil imediato formata dinheiro | Jest (snapshot de string, sem render pes |
| Confirmar o roteamento correto entre convidado e autenticado | Sessão iniciada mas userData ainda não hidratado | Jest + React Native Testing Library com  |
| Validar o funil imediato completo no simulador, incluindo saída e reentrada | Percurso end-to-end de convidado até ao ecrã de espera, com background/foreground pelo meio | Maestro (E2E) no simulador iOS/Android |
| Blindar a apresentação de valores (a armadilha histórica dos cêntimos) | Testes de snapshot/asserção sobre o bloco de totais do checkout e sobre o cesto, com dados representativos do backend. | Jest + @testing-library/react-native |
| Cobrir o ciclo de vida do rascunho de checkout e do agendamento em memória (PAY-05 e PAY-08) | Sequências de reservas encadeadas na mesma sessão. | Maestro (fluxos YAML, integra bem com Ex |
| Garantir que nenhum formulário de dinheiro submete dados inválidos (PAY-09, PAY-10, PAY-11) | Formulários: NIF no checkout, número MB Way, novo cartão. | Jest + @testing-library/react-native |
| Validar a recuperação de pagamentos interrompidos por morte da app (PAY-16) | App morta durante a espera de pagamento, com o pagamento a assentar depois. | Execução manual no simulador + inspeção  |
| Determinar o limite real de tamanho de mensagem no chat (CHAT-04) e o comportamento na falha | Envio de mensagens de tamanho crescente com a chave pública real do backend | Simulador iOS + app-vendor (ou inspeção  |
| Confirmar se a folha de avaliação fica inerte por rating_by_customer ausente (RATE-01) | Conclusão de serviço pelos dois caminhos existentes (status e close) | Charles/mitmproxy ou log temporário em A |
| Reproduzir a perda de páginas no histórico (HIST-01) e o detalhe vazio em cascata (HIST-02) | Conta com mais de uma página de histórico | Simulador iOS + `npx uri-scheme open` pa |
| Validar o desfecho de um extra aprovado que exige 3DS ou cartão (EXTRA-01) | Cliente na Home, técnico pede extra com custo, cartão de teste que força 3D Secure | app-vendor (para emitir o pedido) + cart |
| Verificar o comportamento em perda e retoma de rede durante um serviço em curso | Serviço aceite, app em primeiro plano, rede a cair e a voltar; e app em segundo plano durante eventos | Simulador iOS (Network Link Conditioner) |
| Determinar se o backend marca as notificações como lidas ao servir o GET — decide o desenho da correção do con | Verificação do contrato do endpoint de notificações | curl ou Postman contra app.piquetapp.com |
| Provar o achado SUP-01 — fuga do histórico de suporte entre contas no mesmo dispositivo | Troca de conta com histórico de tickets local | Teste manual; complementar com um teste  |
| Cobrir o caminho de convidado nos ecrãs de notificações, hoje sem qualquer tratamento (NOTIF-02 e NOTIF-03) | Modo convidado a interagir com notificações | Teste manual em dispositivo físico com a |
| Provar (ou desmentir) A11Y-05 — se o texto ampliado do sistema parte os ecrãs | Passagem manual pelos 6 ecrãs do funil principal com a escala de texto no máximo, nas duas plataformas | iOS Simulator + Android Emulator (manual |
| Quantificar o défice de acessibilidade e criar uma linha de base mensurável | Varrimento automático dos ecrãs principais com as ferramentas nativas de auditoria de acessibilidade | Xcode Accessibility Inspector + Android  |
| Congelar o design system contra nova erosão (hexes soltos, fontes inexistentes, imports errados) | Regras de lint no CI que tornam impossível reintroduzir os defeitos DS-02, DS-03 e DS-08 | ESLint + Jest |
| Provar que os primeiros pedidos autenticados após cold start saem sem cabeçalho Authorization (PERF-04) | Cold start com sessão válida em SecureStore | log no interceptor + Charles Proxy |
| Contar as ligações WebSocket simultâneas durante um serviço ativo (PERF-05) | Serviço aceite, navegação pelos ecrãs de serviço aberto | logs do hooks/echo.ts + logs do Laravel  |
| Provar a re-subscrição do canal a cada ping de GPS (PERF-06) | Técnico a caminho, ecrã de acompanhamento aberto | logs + emissão manual de eventos no back |
| Validar o comportamento offline em todos os ecrãs principais (PERF-07, PERF-08, PERF-11) | Percurso completo sem rede e com rede a voltar a meio | Network Link Conditioner + consola do Me |
| Confirmar que nada sai para o Mixpanel antes do consentimento e que nenhuma PII sai depois dele (RGPD-01, RGPD | Instalação limpa, login, e só depois resposta ao banner de consentimento | mitmproxy (ou Charles) com dispositivo f |
| Garantir que o build de produção sai sempre com analytics e crash reporting ativos (ANL-01, OBS-01) | Verificação de configuração no momento da build, não em runtime | Node script no CI / hook de prebuild do  |
| Medir a dupla contagem de eventos de conversão antes e depois da consolidação do plano (ANL-02) | Uma única reserva concluída de ponta a ponta, com e sem 3DS | Mixpanel Live View (manual, uma passagem |

## Prioridade 2 — próximo ciclo (14 testes)

| Objetivo | Cenário | Ferramenta |
|---|---|---|
| Verificar que o consentimento RGPD bloqueia toda a comunicação com o Mixpanel (regressão de AUTH-15) | Utilizador recusa o consentimento e inicia sessão | Proxyman/Charles + teste manual; complem |
| Confirmar que o link de recuperação de palavra-passe abre a app (AUTH-12) | Recuperação de palavra-passe de ponta a ponta a partir do email | Teste manual em dispositivo físico |
| Provar que a pesquisa encontra serviços escritos sem acentos e respeita a categoria selecionada | Pesquisa no separador Serviços | Manual + teste unitário do helper normal |
| Detetar a sobreposição do TrustBadge/ConsentBanner com a barra de separadores em ecrãs sem home indicator | Rodapé da Home em vários tamanhos de ecrã | Simulador iOS via MCP Claude_Code_iOS_Si |
| Medir o custo de re-render da Home ao escrever na pesquisa | Perfil de performance | React DevTools Profiler (ou console.coun |
| Verificar o comportamento da app quando as imagens proxiadas falham | Indisponibilidade do proxy de imagens de terceiros | Proxyman/Charles com regra de bloqueio,  |
| Contar as ligações WebSocket simultâneas abertas pela app (RT-02) | Navegação por toda a stack de serviço em curso | Logs do servidor Reverb + Charles/mitmpr |
| Guarda automática contra chaves de tradução em falta (I18N-01) | Verificação estática em CI sobre todo o repositório | Script Node em CI (sem dependências além |
| Fechar a incerteza do achado PAY-02 — o que acontece ao apagar o método predefinido e ao apagar um cartão com  | Eliminação de métodos de pagamento em estados de fronteira | Teste manual em ambiente de staging com  |
| Impedir que voltem a existir chaves de tradução em falta ou divergentes entre pt_PT e en_US | Verificação automática de paridade de traduções | Jest (teste puro sobre translation/resou |
| Validar em segurança as alterações a CustomTouchableOpacity e TouchOpacity (DS-06, DS-09, DS-10), que tocam em | Testes de snapshot dos componentes-base e dos cartões que mais dependem deles, executados antes e depois da refactorização da orde | Jest + @testing-library/react-native (sn |
| Verificar A11Y-07 — comportamento com "Reduzir movimento" e com o overlay de processamento ativo | Percurso manual com reduce motion ligado e com leitor de ecrã, durante um pedido de serviço e um pagamento MB WAY | iOS Simulator / dispositivo Android, man |
| Medir re-renders e jank na pesquisa e no scroll (PERF-09, PERF-12, PERF-16) | Escrita rápida na pesquisa da Home e scroll no separador Lista | React DevTools Profiler + monitor de per |
| Confirmar a robustez dos ecrãs perante deep links hostis ou malformados (SEC-05) | Abertura da app por URL externo com parâmetros inválidos, sem sessão iniciada | adb shell am start / xcrun simctl openur |

## Prioridade 3 — futuro (1 testes)

| Objetivo | Cenário | Ferramenta |
|---|---|---|
| Verificação visual do chat: bolhas, teclado e scroll (CHAT-05) | Conversa com mensagens curtas e longas, em iOS e Android | Simulador iOS + emulador Android |

---

## Sequência de adoção sugerida

1. **Semana 1** — configurar Jest + testing-library; escrever os testes P0 de `utils/money`
   e do lock de duplo-submit do checkout (puro, rápido, alto valor).
2. **Semana 2** — `msw` + testes de integração do `ApiContext` (refresh, 401, single-flight)
   e do `ServiceContext` (subscrição de canal, extras).
3. **Semana 3** — Maestro com 3 fluxos E2E: reservar como convidado, pagar com cartão
   (sandbox), aprovar um extra.
4. **Contínuo** — adicionar um teste de regressão sempre que se corrige um bug desta
   auditoria (começar pelos P0).

## Regra de ouro

Não escrever testes que confirmem detalhes internos (ex.: "o estado X mudou para Y").
Testar **comportamento visível**: o botão ficou desativado, o valor apresentado é
"40,00 €", o cliente foi para o ecrã de espera, a segunda tentativa não criou segundo
pagamento.
