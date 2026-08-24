# Auditoria de UX/UI — App Cliente Piquet

## 1. Avaliação geral

A app tem uma **identidade visual forte e coerente** (creme + âmbar, cartões com sombra
suave, tipografia Poppins) e os ecrãs recentemente redesenhados — checkout, cesto,
avaliação, histórico, perfil — estão genuinamente bem resolvidos. O problema não é o
"caminho feliz": é **tudo o que acontece quando algo corre mal**, e a **acessibilidade**.

### O que está bem feito (a preservar)

- **Estados vazios da pesquisa** (`(tabs)/list/index.tsx:480-576`) — ricos, com CTA e o
  cartão "a tua pesquisa não ficou esquecida". Acima da média do mercado.
- **Ecrã de espera do MB Way** — badge circular, contagem ao vivo, passos numerados.
- **Ecrã de agendamento** (`schedule/schedule-service.tsx`) — é o **único** ecrã com
  acessibilidade a sério (slots de 44pt, `accessibilityRole/Label/State`). É o modelo a
  replicar no resto da app.
- **Cache de categorias** — a grelha da Home aparece instantânea no arranque.
- **Checkout** — lock anti-duplo-submit, watchdog, rascunho reidratável. Trabalho sólido.

### Os três problemas estruturais

**1. A app não tem uma linguagem de erro.** Não existe um único `RefreshControl` em toda a
app (confirmado por grep). Quando um pedido falha, o ecrã fica vazio — e, no pior caso,
diz ao cliente que **a zona dele não é servida**, quando o que falhou foi a rede. Isto não
gera só fricção: gera desinstalações e tickets de suporte.

**2. A acessibilidade não foi considerada.** O texto secundário da app inteira
(`gray_medium`, 138 usos) falha o contraste mínimo AA. Com o texto do sistema no máximo,
a Home fica **inutilizável** (a grelha de categorias sai do ecrã). Para um serviço ao
domicílio — cuja base de clientes inclui população idosa — isto exclui exatamente quem
mais precisa.

**3. Falta fechar o ciclo de confiança à volta do dinheiro.** O cliente paga *antes* de
ter técnico confirmado. Se o técnico recusa ou não responde a tempo, a mensagem é
"Lamentamos… Tente outro" — **sem uma palavra sobre o valor já pago**. É o momento de
maior ansiedade do funil e a app fica muda.

---

## 2. Problemas por ecrã e fluxo

### AUTH-02 · Não existe guard de autenticação: ecrãs autenticados ficam montados e a dar 401 depois de a sessão cair
**Ecrã:** `app/(app)/_layout.tsx:33-93` · **Severidade:** medio · **Prioridade:** P0

- **O que muda:** 1) Em `app/(app)/_layout.tsx`, acrescentar um efeito que reage à transição sessão→sem-sessão (já existe `prevSessionRef` na linha 13 para limpar a guest session): quando `prevSessionRef.current && !session`, fazer `router.dismissAll()` seguido de `router.replace('/(app)/(tabs)/home')`, para que nenhum ecrã autenticado fique montado. 2) Criar uma lista explícita de rotas que exigem sessão (histórico, pagamentos, dados de faturação, editar perfil, tickets) e, nessas, renderizar o mesmo bloco de convite já usado em profile/index.tsx:153-277 — idealmente extraído para `components/app/GuestGate.tsx` e reutilizado. 3) Em history/index.tsx:66, não disparar `getHistoryServices` quando não há sessão.
- **Porquê:** `app/(app)/_layout.tsx` não tem qualquer `<Redirect>` nem verificação de `session` (só o layout de (auth) redireciona, e apenas no sentido inverso). Quando `refreshToken()` falha, ApiContext.tsx:111 chama `signOut()`, mostra um diálogo e mais nada: o ecrã autenticado continua montado, os polls e os pedidos continuam a disparar sem token. B) app/(app)/(tabs)/history/index.tsx:66-70 chama `getHistor
- **Esforço:** medio · **Risco:** medio

### AUTH-12 · O ecrã de redefinição de palavra-passe pode ser inalcançável: não há Universal Links (iOS) nem App Links (Android) configurados
**Ecrã:** `app/(reset-password)/[token].tsx:25 e app.config.ts:24-70` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** 1) Acordar com o backend o URL exato do email (recomendo https://piquetapp.com/reset-password/{token}?email={email}). 2) Acrescentar em app.config.ts `ios.associatedDomains: ['applinks:piquetapp.com']` e `android.intentFilters` com `autoVerify: true` para o mesmo host/caminho, e publicar `apple-app-site-association` e `assetlinks.json` no domínio. 3) Em [token].tsx, se `email` vier vazio, pedir o email ao utilizador num campo em vez de submeter um pedido que vai falhar com 404/422. Teste que prova: enviar o email real e abrir o link num dispositivo físico com a app instalada.
- **Porquê:** O ecrã lê `const { email, token } = useLocalSearchParams()` (linha 25), ou seja, precisa de AMBOS os parâmetros. Em app.config.ts não existe `ios.associatedDomains` nem `android.intentFilters` — apenas o `scheme` personalizado (`piquet.customer`). Se o email do backend enviar um link https://piquetapp.com/..., ele abre no browser e nunca chega à app; se o link não incluir `email=`, o POST para AUT
- **Esforço:** medio · **Risco:** baixo

### AUTH-16 · Completar perfil: dois efeitos chamam `closeFlow()` no mesmo commit e o ecrã fica em spinner infinito sem dados de utilizador
**Ecrã:** `app/(app)/(modals)/complete-profile/index.tsx:65-101 e 144-148` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Unificar num único efeito com dependência `[userData, appStateStatus, isLoadingUserData]` que calcula o passo em falta e, se não houver nenhum, fecha — e proteger o fecho com `const closedRef = useRef(false)` verificado dentro de `closeFlow()`. Para o caso B, quando `!isLoadingUserData && !userData`, fechar o fluxo (ou redirecionar para o login) em vez de deixar o spinner. Teste que prova: percorrer o fluxo completo no simulador e contar os ecrãs recuados.
- **Porquê:** A) O efeito das linhas 65-69 (`[userData]`) chama `handleNextStep`, que termina em `closeFlow()`; o efeito das linhas 71-77 (`[appStateStatus, isLoadingUserData, userData]`) chama `handleGoBack`, que também termina em `closeFlow()`. Ambos correm no mesmo commit quando `userData` fica completo, pelo que `router.back()` é invocado duas vezes seguidas — provável pop de dois ecrãs. `syncCompletedProfi
- **Esforço:** pequeno · **Risco:** baixo

### AUTH-17 · Registo só é considerado bem-sucedido com HTTP 200; um 201 deixa o ecrã morto, sem sessão e sem erro
**Ecrã:** `app/(auth)/signup/index.tsx:106-115` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Remover a verificação de status por completo — se o axios não lançou, a resposta é 2xx. Ler diretamente `const { access_token } = response?.data?.data ?? {}` e, se `access_token` for indefinido, mostrar `setSignUpError(t('errors.occurred_an_error'))` em vez de terminar em silêncio. Assim nenhum caminho fica mudo.
- **Porquê:** `if (responseStatus === 200)` é a única condição para ler o `access_token` e chamar `setSession`. Com 201 (ou 202), o `catch` não corre, `signUpError` fica a null e `setIsSigningUp(false)` reativa o botão: o utilizador criou a conta no backend mas fica no ecrã de registo sem qualquer indicação — e um segundo toque devolve um 422 de email duplicado. Não posso confirmar o código que o backend devolv
- **Esforço:** pequeno · **Risco:** baixo

### D2-01 · Falha de rede deixa o separador Serviços permanentemente vazio e culpa a zona do utilizador
**Ecrã:** `app/(app)/(tabs)/list/index.tsx:70-72, 102-128, 550-575` · **Severidade:** alto · **Prioridade:** P0

- **O que muda:** 1) Introduzir estado `loadError: boolean` em list/index.tsx, posto a true no catch de handleSearch (linha 114) e limpo no then. 2) Adicionar um terceiro ramo ao ListEmptyComponent (linha 480): se `loadError`, mostrar título 'errors.connection.title' + subtítulo 'errors.connection.subtitle' + botão 'Tentar novamente' que chama `handleSelectOperationArea({id:-1, ...})`. 3) Adicionar `refreshControl={<RefreshControl refreshing={loadingSearchedServiceTypes} onRefresh={() => handleSearch(selectedOperationAreas.includes(-1) ? [] : selectedOperationAreas)} />}` à FlatList da linha 380. 4) Trocar o useEffect da linha 70-72 por useFocusEffect com guarda `if (!searchedServiceTypes \|\| loadError)` par
- **Porquê:** O ecrã mostra o estado vazio genérico com o título 'Nenhum serviço encontrado' e o subtítulo 'Assim que houver serviços disponíveis na tua zona, aparecem aqui' (pt_PT.ts:715) — atribui a falha de rede à cobertura geográfica. O pedido só é feito no mount (useEffect com deps []) e os separadores mantêm-se montados, por isso voltar ao separador NÃO refaz o pedido. Não existe RefreshControl em nenhum 
- **Esforço:** medio · **Risco:** baixo

### D2-04 · UserHeader comentado na Home: sem morada visível, sem login para convidados e centro de notificações inacessível
**Ecrã:** `app/(app)/(tabs)/home/index.tsx:270-289 (bloco comentado) e components/app/UserHeader.tsx:27` · **Severidade:** medio · **Prioridade:** P1

- **O que muda:** Decisão de produto explícita, e depois: (1) repor um cabeçalho compacto na Home com, no mínimo, a morada de serviço (tocável → /(app)/(modals)/(address)/update para autenticado, /(app)/(modals)/(services)/(request)/address/guest para convidado) e o sino de notificações; ou (2) se o cabeçalho não volta, mover as entradas órfãs: acrescentar uma linha 'Notificações' à lista do separador Conta (app/(app)/(tabs)/profile/index.tsx, junto às linhas 292-327) e um seletor de morada no topo da Home. Em qualquer dos casos, apagar o bloco comentado 270-289 em vez de o deixar como código morto. Se o inbox for para descontinuar, remover a rota e o _layout.
- **Porquê:** O bloco que renderiza <UserHeader /> está inteiramente comentado (home/index.tsx:270-289), pelo que a Home começa diretamente nos banners de aviso. Consequências verificadas por grep em toda a base de código: (a) a morada de serviço não é visível nem editável a partir da Home; (b) convidados não têm CTA de login na Home (só chegando ao separador Conta); (c) `/(app)/(modals)/notifications` tem UMA 
- **Esforço:** medio · **Risco:** medio

### D2-12 · Rotas órfãs dentro do separador Home: /home/services e /home/schedules
**Ecrã:** `app/(app)/(tabs)/home/services/index.tsx (todo) e app/(app)/(tabs)/home/schedules/index.tsx (todo)` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** 1) Mover home/schedules/index.tsx para components/app/Home/SchedulesCard.tsx e atualizar o import em home/index.tsx:36 — deixa de existir a rota fantasma. 2) Decidir sobre home/services: se o 'Ver todos' volta, descomentar home/index.tsx:386-395; se não, apagar o ficheiro e a Stack.Screen correspondente em home/_layout.tsx:22-27 juntamente com o bloco comentado. Nota: o ecrã home/services usa `operationAreas === null` como condição de loading (linha 46), o que nunca é verdade depois da cache local — mais um sinal de que está desatualizado.
- **Porquê:** (a) home/services/index.tsx é um ecrã completo (com BackHeader, skeletons e estado vazio) mas o único link para ele está comentado (home/index.tsx:386-395) — é código morto que continua a ser incluído no bundle e está registado no Stack (home/_layout.tsx:22-27). (b) home/schedules/index.tsx exporta o componente `Schedules`, que é importado e renderizado como FILHO da Home (home/index.tsx:36 e 379)
- **Esforço:** pequeno · **Risco:** baixo

### D2-14 · Separador Histórico aparece desativado (opacidade 50%) para convidados mas continua clicável
**Ecrã:** `components/TabBar.tsx:136-145 (linha 140)` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Escolher um comportamento e ser coerente. Recomendado (melhor para conversão): remover a opacidade e, em app/(app)/(tabs)/history/index.tsx, mostrar a convidados um estado vazio com 'Inicie sessão para ver o seu histórico' + botão para /(auth)/signin. Alternativa: manter a opacidade e acrescentar `disabled={route.name === 'history/index' && !session}` e `accessibilityState={{ disabled: true }}` no TouchableOpacity da linha 129.
- **Porquê:** `opacity: route.name === 'history/index' && !session ? 0.5 : 1` altera apenas a aparência; o `onPress` continua ligado e navega para o histórico, que para um convidado será uma lista vazia. O sinal visual ('desativado') contradiz o comportamento ('navega'). Também não há `accessibilityState.disabled`, pelo que leitores de ecrã anunciam um separador normal.
- **Esforço:** pequeno · **Risco:** baixo

### D2-16 · Contraste insuficiente nos separadores não selecionados (4.34:1) e etiquetas sem tamanho definido
**Ecrã:** `components/TabBar.tsx:120, 144 e app/(app)/(tabs)/_layout.tsx:56, 70, 98, 130` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Escurecer a cor do estado não selecionado sobre âmbar para pelo menos #3F3F3F (>=5.4:1) — sugere-se acrescentar um token dedicado `tab_inactive` a constants/Colors.ts em vez de reutilizar gray_strong noutro contexto. Substituir os <Text> das etiquetas por <CustomText size="extraSmall" numberOfLines={1}> e remover as larguras fixas w-16/w-20 (deixar o flex:1 do item tratar da largura). Prova por execução: correr num iPhone SE com 'Texto maior' no máximo.
- **Porquê:** #525252 sobre #FABB5B dá cerca de 4.34:1 — abaixo do mínimo AA para texto normal (o estado selecionado, #1B1B1B, está bem com ~9.8:1). Além disso as etiquetas usam <Text> nativo sem `fontSize`, sem `numberOfLines` e sem `allowFontScaling={false}`, dentro de contentores de altura fixa (`h-6`/`h-7`) e largura fixa (`w-16`/`w-20`) — em ecrãs de 320 px cada separador tem ~64 px de largura enquanto o c
- **Esforço:** pequeno · **Risco:** baixo

### D2-18 · Botão de retroceder no ecrã raiz de um separador (Serviços) com fallback que faz dismissAll + replace
**Ecrã:** `app/(app)/(tabs)/list/index.tsx:204-212 e components/app/BackHeader.tsx:31-49` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Em list/index.tsx substituir o BackHeader por um cabeçalho simples só com o título (o mesmo componente aceita `middleItem` sem seta se se extrair uma prop `showBack={false}`), ou definir `onBack={() => router.navigate('/(app)/(tabs)/home')}` para tornar o destino determinístico. Blindar também o fallback de BackHeader.tsx:39 com try/catch à volta de `router.dismissAll()`. Prova por execução: arrancar a app com o deep link do separador Serviços e tocar na seta.
- **Porquê:** O separador Serviços tem um BackHeader com seta. Quando `router.canGoBack()` é falso, o fallback executa `router.dismissAll()` seguido de `router.replace('/(app)/(tabs)/home')` (BackHeader.tsx:39-40) — `dismissAll` fora de um contexto de modais pode lançar erro no expo-router 4.x. Quando é verdadeiro, a seta faz o utilizador saltar para o separador anterior, o que num separador raiz é comportament
- **Esforço:** pequeno · **Risco:** baixo

### WAIT-02 · Cliente já pagou e pode sair do ecrã de espera sem qualquer confirmação; nenhum ecrã de timeout/recusa diz o que acontece ao dinheiro
**Ecrã:** `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx:209-236 e 521-530` · **Severidade:** medio · **Prioridade:** P0

- **O que muda:** 1) Em onClose(), no caso 'pending', abrir o DialogContext com duas opções ('Continuar à espera' / 'Cancelar o pedido') em vez de sair em silêncio; o caminho de cancelar reutiliza handleCancelService. 2) Acrescentar às strings services.wait_accept.timeout.subtitle e .refused.subtitle uma frase explícita sobre o valor (ex.: 'Não foi cobrado nada — a autorização é libertada automaticamente.' ou o que corresponder ao contrato real com a Payshop) e validar essa frase com quem gere os pagamentos antes de a escrever. 3) Envolver getPendingService() e getOpenService() (ServiceContext.tsx:290 e :240) em try/catch para o cartão de recuperação não depender de uma promise sem tratamento.
- **Porquê:** onClose() no caso 'pending' faz router.dismissAll() + router.replace('/(app)/(tabs)/home') sem diálogo nenhum (linhas 210-215); o hardwareBackPress está ligado diretamente a esse onClose (linha 96). Os ecrãs de 'timeout' (521-530) e 'refused' (457-466) usam as strings services.wait_accept.timeout/refused que só dizem 'Lamentamos... Tente outro' — não há uma única palavra sobre o pagamento, apesar 
- **Esforço:** medio · **Risco:** baixo

### INFO-01 · O 'Desde X €' do detalhe é o mínimo de TODOS os técnicos, mas o ecrã seguinte só mostra 3 — a promessa de preço pode não existir na lista
**Ecrã:** `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:66-82 vs select-vendor/[serviceId].tsx:96` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** Alinhar os dois: em select-vendor, ordenar por `rate` ascendente antes do slice(0,3) — assim o mínimo global é sempre o 1.º cartão e o 'Desde' passa a ser verdadeiro por construção. Se a ordem atual dos 3 for uma decisão deliberada de curadoria, então fazer o inverso: em info.tsx calcular o mínimo apenas sobre os 3 primeiros (`list.slice(0,3)`) usando exatamente a mesma função de ordenação, extraída para um utilitário partilhado (ex.: utils/vendors.ts::pickTopVendors) usado pelos dois ecrãs e por cart-technicians.
- **Porquê:** info.tsx calcula minVendorRate como Math.min de TODOS os rates devolvidos pelo endpoint (linhas 69-72), sem qualquer corte. select-vendor faz `const vendorsSlice = _vendors.slice(0, 3)` (linha 96) sobre uma lista ordenada apenas pela chave numérica do objeto devolvido (convertDataIntoArray, linhas 56-60) — não por preço. Se o técnico mais barato estiver na 4.ª posição ou além, o cliente vê 'Desde 
- **Esforço:** pequeno · **Risco:** medio

### INFO-03 · Cada visualização de um serviço dispara um POST extra ao endpoint de procura de técnicos só para calcular o 'Desde'
**Ecrã:** `app/(app)/(modals)/(services)/(request)/select-service-type/info.tsx:52-75` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Criar um hook único (ex.: hooks/useVendorsForService.ts) com uma cache em memória com TTL curto (30-60s) por chave `${serviceTypeId}:${lat}:${lng}:${mode}`, e usá-lo nos três ecrãs. info.tsx passa a ler do cache; select-vendor reaproveita a mesma entrada se ainda for fresca e só refaz o pedido no botão 'Tentar novamente'. Ganha-se a chamada poupada e, de borda, o alinhamento de preço do INFO-01.
- **Porquê:** info.tsx dispara api.post(CUSTOMER_REQUEST_SERVICE \| GUEST_SEARCH_VENDORS) no mount (linha 65) apenas para extrair Math.min dos rates; select-vendor/[serviceId].tsx:85 repete exatamente o mesmo POST com o mesmo payload poucos segundos depois. Em cart-technicians (linha 95) o mesmo endpoint é ainda chamado N vezes em paralelo, uma por item do cesto. O resultado de info.tsx é descartado no unmount 
- **Esforço:** medio · **Risco:** medio

### START-01 · Ecrã de introdução do serviço urgente é código morto e o seu único botão aponta para uma rota inexistente
**Ecrã:** `app/(app)/(modals)/(services)/(request)/start/index.tsx:122` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Decidir e executar uma de duas: (a) apagar start/index.tsx, remover a <Stack.Screen name="start/index"/> do _layout e as strings services.urgent_intro de pt_PT/en_US; ou (b) se o ecrã voltar a fazer parte do funil, corrigir a linha 122 para router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/' + operationAreaId) e alinhar step_countdown_desc com a janela real definida em WAIT-01. Recomendo (a) — o funil atual não precisa de um interstitial extra.
- **Porquê:** router.navigate('/(app)/(urgent-service)/service-selection') — o grupo de rotas (urgent-service) NÃO existe em app/ (confirmado por varrimento do diretório). Além disso a copy do ecrã, services.urgent_intro.step_countdown_desc (pt_PT.ts:747), promete 'O profissional terá 20 segundos para aceitar o teu pedido' — um terceiro número, diferente dos 60s do código e dos '20 minutos' das outras strings.
- **Esforço:** pequeno · **Risco:** baixo

### VENDOR-02 · Ao entrar em select-vendor sem contexto, o serviço é reconstruído só com o id — nome e duração desaparecem do checkout
**Ecrã:** `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:63-70` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Quando serviceToRequest não tem service_type completo, reidratar a partir de fontes já disponíveis antes de continuar: 1.º guestSession.selected_service_type (guarda o objeto inteiro, GuestSessionContext.tsx:137-148), 2.º saveService do ServiceContext, 3.º um GET ao catálogo pelo id. Só depois preencher setServiceToRequest. Como rede de segurança, o checkout deve mostrar um esqueleto/erro em vez de um cartão com nome vazio.
- **Porquê:** O guard reconstrói `setServiceToRequest(prev => ({ ...prev, service_type: { id: Number(serviceId) } }))` (linhas 64-69): só o id sobrevive. O checkout mostra depois `serviceToRequest?.service_type?.name` (linha 1159) vazio no cartão 'O seu pedido', e durationLabel (linhas 999-1006) devolve null porque service_type.time não existe. Não consegui provar a frequência real sem executar a app — daí risc
- **Esforço:** medio · **Risco:** baixo

### GUEST-01 · Duas fontes de verdade para o serviço escolhido (guestSession vs serviceToRequest), com a stale a ganhar
**Ecrã:** `app/(app)/(modals)/(services)/(request)/address/guest/index.tsx:216` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Duas alterações pequenas e complementares: (1) inverter a precedência na linha 216 para `serviceToRequest?.service_type?.id ?? guestSession?.selected_service_type_id` — o estado vivo ganha ao persistido; (2) fazer com que TODOS os pontos que abrem select-service-type/info chamem também setSelectedServiceType(id, serviceType) — home/index.tsx:258-265, list/index.tsx:99 e history/[serviceId].tsx:293 — idealmente extraindo um helper openServiceDetail(serviceType) que escreve nos dois contextos, tal como openServiceType já faz em select-service-type/[operationAreaId].tsx:123-132.
- **Porquê:** onSubmit calcula `guestSession?.selected_service_type_id \|\| serviceToRequest?.service_type?.id` — a fonte STALE tem prioridade — e faz router.replace para select-vendor/A. Na prática o ecrã seguinte acaba por procurar técnicos de B (usa serviceToRequest, select-vendor:78), portanto o utilizador não vê o erro; mas assim que serviceToRequest se perder (ver VENDOR-02), o guard de select-vendor pass
- **Esforço:** pequeno · **Risco:** baixo

### VENDOR-03 · Cartões de técnico e de tipo de serviço não têm proteção contra duplo toque
**Ecrã:** `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx:321-323 e select-service-type/[operationAreaId].tsx:298` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Adicionar um `navigatingRef = useRef(false)` em select-vendor (reposto a false no useFocusEffect de regresso) e sair cedo em selectVendorAndProceed se já estiver true — exatamente o padrão de submittingRef do checkout. Aplicar o mesmo em openServiceType. Em alternativa mais geral, dar a CustomTouchableOpacity/TouchOpacity um debounce opcional (ex.: prop `once` com janela de 700ms) e usá-lo em todos os CTAs de avanço do funil.
- **Porquê:** selectVendorAndProceed → openService faz setSelectedProfessional + setServiceToRequest + setGuestSessionSelectedVendor + router.navigate sem qualquer lock (nem o padrão submittingRef que o checkout usa corretamente). TouchOpacity e CustomTouchableOpacity são wrappers finos do TouchableOpacity, sem debounce (components/TouchOpacity.tsx, components/CustomTouchableOpacity.tsx). Dois toques em cartões
- **Esforço:** pequeno · **Risco:** baixo

### PAY-01 · Segunda reserva MB Way da sessão nunca confirma: o ecrã de espera não faz polling se já existir serviço aberto/pendente
**Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx:84-86 + contexts/ServiceContext.tsx:532-533` · **Severidade:** critico · **Prioridade:** P0

- **O que muda:** 1) Remover o guard de estado do verifyStatus (ServiceContext.tsx:533): passar a `if (!serviceId) return;`. O polling deste endpoint é sempre sobre um serviceId explícito passado pelo ecrã de pagamento — o estado global não é critério válido para o suprimir. 2) Fazer verifyStatus devolver um booleano (arrancou / não arrancou) e, no mb-way/waiting.tsx:84-86, se não arrancou, cair para um polling local idêntico ao do card/waiting.tsx (que já é autónomo e não depende do contexto) em vez de ficar mudo. 3) Limpar `servicePendingAcceptance` ao sair do ecrã mb-way/confirmed (ou passar o MB Way a terminar no wait-accept, tal como o cartão, uniformizando os dois fluxos). 4) A prazo, unificar: o card/w
- **Porquê:** verifyStatus() devolve imediatamente sem criar o intervalo (`if (!serviceId \|\| openService \|\| servicePendingAcceptance) return;`). Não há polling, não há onTimeout, o `timedOut` nunca fica true. O cliente autoriza e paga no banco e fica preso no contador regressivo até 0:00 sem qualquer desfecho — nem confirmação, nem erro, nem botão de recuperação (o "Já realizei o pagamento" está comentado, 
- **Esforço:** pequeno · **Risco:** medio

### PAY-02 · Janela real de duplo pagamento MB Way: overlay fechado e lock libertado 1 segundo antes de navegar
**Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:836-867` · **Severidade:** critico · **Prioridade:** P0

- **O que muda:** No .then do MB Way: NÃO chamar setOpeningService(false) nem libertar submittingRef até a navegação estar feita. Concretamente: (a) remover a linha 842; (b) no .finally, libertar o lock apenas em caso de erro — usar uma flag local `let succeeded = false` marcada no .then e no .finally fazer `if (!succeeded) { submittingRef.current = false; setOpeningService(false); }`; (c) mover a limpeza de estado para dentro do callback do setTimeout, ou eliminar de vez o setTimeout depois de resolvido o PAY-06. Aplicar o mesmo raciocínio ao caminho do cartão, que hoje já mantém o lock durante o 3DS (correto).
- **Porquê:** No .then (linha 842) faz-se `setOpeningService(false)` e só depois se agenda `setTimeout(..., 1000)` para navegar; o `.finally` (linhas 863-867) põe `submittingRef.current = false` e repete `setOpeningService(false)`. Durante ~1000 ms o ProcessingOverlay já não está visível (ProcessingOverlay.tsx:72 devolve null quando visible=false, deixando de bloquear os toques), `isCtaDisabled` volta a false e
- **Esforço:** pequeno · **Risco:** medio

### PAY-05 · Rascunho de checkout não é limpo depois de um pagamento com cartão confirmado pelo ecrã de espera: voucher já usado é reaplicado na reserva seguinte
**Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/card/waiting.tsx:47-55 vs app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:515-529` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** Centralizar: criar `clearCheckoutState()` no ServiceContext (limpa checkoutDraft + item do cesto) e chamá-la em TODAS as transições para um estado pago — card/waiting.tsx:47-55 (goToConfirmed), ServiceContext.tsx:522-526 (handlePaymentConfirmed, que serve o MB Way) e [serviceId].tsx:515-529 (goToWaitAccept). Em complemento, dar validade ao rascunho: guardar um `createdAt` no CheckoutDraft (ServiceContext.tsx:21-29) e descartá-lo na reidratação se tiver mais de ~30 minutos.
- **Porquê:** `setCheckoutDraft(null)` só existe em goToWaitAccept ([serviceId].tsx:518) e no signout (ServiceContext.tsx:153). O caminho 3DS-ambíguo → card/waiting → goToConfirmed nunca limpa o rascunho, e o caminho MB Way com sucesso ([serviceId].tsx:836-856) também não. Resultado: ao reabrir o checkout do mesmo service_type, a reidratação (linhas 282-317) repõe `voucher`, `voucherCode` e `customerNIF`; o use
- **Esforço:** pequeno · **Risco:** baixo

### PAY-06 · O guard beforeRemove pode bloquear a saída do checkout depois de um pagamento com cartão bem sucedido
**Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:336-347 (guard) vs 515-529, 645-677 (navegações)` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** Introduzir um `allowLeaveRef` (ref booleano). Pôr `allowLeaveRef.current = true` imediatamente antes de qualquer navegação programática (goToWaitAccept, os dois router.dismissTo do open3dsBrowser e o router.dismissTo do ramo MB Way) e alterar o listener para `if (allowLeaveRef.current \|\| !openingService) { ...track/return } else { e.preventDefault(); }`. Com isso pode eliminar-se o setTimeout de 1s do MB Way, fechando também o PAY-02. Provar com execução: instrumentar o listener com um log e verificar no simulador se o preventDefault é ou não atingido nas 4 navegações.
- **Porquê:** O listener `beforeRemove` faz `e.preventDefault()` sempre que `openingService === true` (linhas 337-344). Todas as navegações do fluxo de cartão acontecem exatamente nesse estado: goToWaitAccept (dismissAll + navigate), o dismissTo para card/denied e o dismissTo para card/waiting correm DENTRO do `await open3dsBrowser(...)`, ou seja, antes do `.finally` que repõe openingService=false (linha 783). 
- **Esforço:** pequeno · **Risco:** medio

### PAY-14 · Ecrãs de espera mandam "verificar novamente" um pagamento, mas o botão não existe
**Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting.tsx:287-301 (botão comentado) e card/waiting.tsx:276-301` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Repor o botão nos dois ecrãs (no card/waiting basta uma variante de checkOnce() com cooldown, seguindo o modelo do handleAlreadyPaid) e mostrá-lo em destaque quando `timedOut === true` — é o caminho de recuperação para um pagamento que assentou tarde. Se a decisão de produto for mesmo não o ter, reescrever as duas mensagens de timeout e remover handleAlreadyPaid/forceVerifyStatus.
- **Porquê:** A mensagem de timeout diz "Pode verificar novamente, cancelar a solicitação ou voltar ao início" (pt_PT.ts, mb_way_waiting.timeout_message e card_waiting.timeout_message), mas o botão "Já realizei o pagamento" está inteiramente comentado no mb-way/waiting.tsx (linhas 287-301) e nunca existiu no card/waiting.tsx. Ficam apenas "Cancelar a solicitação" e "Ir para a página inicial". Pior: o handleAlre
- **Esforço:** pequeno · **Risco:** baixo

### PAY-18 · Mensagem de erro do pagamento anterior fica visível durante a nova tentativa
**Ecrã:** `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx:775-780, 1813-1818` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Chamar `setOpenServiceError(null)` no início de handleOpenService e de handleOpenServiceWithMbWay (junto do setOpeningService(true)), e também sempre que o cliente muda de método de pagamento.
- **Porquê:** `openServiceError` só é escrito nos catch e nunca reposto a null: fica visível durante a nova submissão e, se esta correr bem mas a navegação demorar (setTimeout de 1 s do MB Way), o cliente vê simultaneamente "Ocorreu um erro" e o overlay de sucesso. O mesmo acontece com o watchdog dos 45 s (linhas 366-374), que escreve a mensagem genérica sem a limpar depois.
- **Esforço:** pequeno · **Risco:** baixo

### RT-02 · useEcho não é singleton: cada ecrã abre a sua própria ligação WebSocket e os leaveChannel são no-ops
**Ecrã:** `hooks/echo.ts:11-104 (6 call sites)` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** Converter em EchoProvider: mover o corpo atual de hooks/echo.ts para um `contexts/EchoContext.tsx` montado uma única vez em app/_layout.tsx, e transformar `useEcho()` num `useContext(EchoContext)`. Os 6 call sites ficam inalterados na sintaxe. Depois disto, os `leaveChannel` de status/close passam a ter efeito real (e devem ser removidos ou substituídos por `setOpenService(null)`, que já dispara a cleanup correta via RT-01).
- **Porquê:** `useEcho` cria dentro do próprio useEffect um `new Pusher(...)` + `new Echo(...)` por cada componente que o chama. Há 6 call sites (contexts/ServiceContext.tsx, chat, status, close, cancel, wait-accept), pelo que se podem manter 3-4 ligações simultâneas com autenticações independentes. Consequência funcional direta: em status/[serviceId].tsx:80 e close/index.tsx:58 o `echo.leaveChannel(`common.ser
- **Esforço:** medio · **Risco:** medio

### CHAT-02 · Envio falhado deixa a bolha da mensagem no ecrã — o cliente julga que enviou
**Ecrã:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:181-209` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** Dar identidade e estado às mensagens locais: acrescentar `localId: string` e `status: 'sending' \| 'sent' \| 'failed'` à interface `Message` (linha 21). No `.then` marcar 'sent'; no `.catch` marcar 'failed' em vez de restaurar o texto. Em `CustomerMessage` (linhas 28-46) renderizar um ícone de erro + toque para reenviar quando `status === 'failed'`, e opacidade reduzida quando 'sending'.
- **Porquê:** `buildMessages(...)` (linha 190) insere a bolha otimista ANTES do POST. No `.catch` (linhas 202-207) só se restaura o texto na caixa de escrita — a bolha continua na conversa, indistinguível de uma mensagem entregue. O cliente vê a mensagem no histórico E o mesmo texto de volta na caixa: ou reenvia duplicando, ou assume que o técnico recebeu. Num marketplace onde a mensagem pode ser 'não estou em 
- **Esforço:** medio · **Risco:** baixo

### HIST-02 · Detalhe do histórico só lê da lista em memória — ecrã vazio com "Invalid Date" fora do caminho feliz
**Ecrã:** `app/(app)/(pages)/(services)/history/[serviceId].tsx:45-54, 251` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** No efeito das linhas 45-54: se não encontrar em `historyServices`, chamar `api.get(API_ROUTES.GET_SERVICE_DETAILS(String(serviceId)))` e alimentar o estado local com `response.data.data.service`; manter `isLoading` verdadeiro durante o pedido (mover o `setIsLoading(false)` para o `.finally`). Blindar `renderDate` com uma verificação `Number.isNaN(parsedDate.getTime())` que devolva string vazia, como já é feito em `renderShortDate` de history/index.tsx:101.
- **Porquê:** O efeito das linhas 45-54 procura exclusivamente em `historyServices` e, se não encontrar, deixa `service` a null — sem qualquer pedido à API e sem estado de erro. O ecrã renderiza a casca completa: avatar genérico, nome vazio, morada vazia, ' km' sem valor, e na linha 251 `renderDate(service?.created_at as string)` recebe undefined → `new Date(undefined)` → o utilizador vê literalmente 'Invalid D
- **Esforço:** pequeno · **Risco:** baixo

### PROG-01 · Ecrã de acompanhamento não lê o parâmetro de rota nem tem guarda de contexto vazio
**Ecrã:** `app/(app)/(pages)/(services)/(open)/progress/[serviceId].tsx:104-134` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Replicar o bloco de guarda de overview/[serviceId].tsx:40-62 no topo do Progress (ActivityIndicator + t('general.loading') + cabeçalho com back seguro). Ler `useLocalSearchParams` e, se houver `serviceId` sem `openService`, chamar `GET_SERVICE_DETAILS` para hidratar o contexto em vez de mostrar um mapa vazio.
- **Porquê:** O componente nunca chama `useLocalSearchParams` (o `[serviceId]` da rota é ignorado) e não tem qualquer guarda para `openService` a null. Com o contexto vazio: `parseFloat(String(undefined))` → NaN nas quatro coordenadas, mapa cinzento sem marcadores nem rota, cartão do técnico e nome ausentes, 'Estado do serviço' com nome de serviço vazio, e nem sequer a faixa de ETA aparece (depende de `vendorNa
- **Esforço:** pequeno · **Risco:** baixo

### I18N-01 · Chave de tradução em falta: botão mostra literalmente "general.cancel" no fluxo de recusa de extras
**Ecrã:** `app/(app)/(bottom-sheets)/(services)/extra-request/[extraId].tsx:230` · **Severidade:** medio · **Prioridade:** P2

- **O que muda:** Acrescentar `"cancel": "Cancelar"` ao bloco `general` de pt_PT.ts e `"cancel": "Cancel"` ao de en_US.ts. Adicionalmente, ligar no arranque um script de CI que faça exatamente esta verificação (extrair todos os `t('...')` literais e validar contra os recursos) — é barato e teria apanhado isto.
- **Porquê:** `t("general.cancel")` não existe em translation/resources/pt_PT.ts nem em en_US.ts (validei por parsing de todo o ficheiro de recursos contra todas as chaves usadas nos 14 ficheiros deste domínio — é a única em falta). O i18next, sem `parseMissingKeyHandler` configurado e com `fallbackLng: 'pt_PT'` (translation/index.ts), devolve a própria chave: o utilizador vê o texto cru 'general.cancel' num ec
- **Esforço:** pequeno · **Risco:** baixo

### CHAT-05 · Bolhas de mensagem ocupam a largura total, anulando a distinção visual entre cliente e técnico
**Ecrã:** `app/(app)/(pages)/(services)/(open)/(chat)/service/[serviceId].tsx:30-31, 50-51` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Remover `w-full` das linhas 31 e 51 e aplicar `style={{ maxWidth: '78%' }}` ao contentor exterior de cada bolha; reduzir o padding de `p-6` para `px-4 py-3`. Verificar com uma mensagem de uma palavra e outra de 300 caracteres.
- **Porquê:** O contentor exterior usa `self-end`/`self-start` (largura automática) mas a bolha interior tem `w-full` (linhas 31 e 51), o que no Yoga resolve a percentagem contra a largura disponível do pai e tende a produzir bolhas de largura total. Se assim for, `self-end` e `self-start` deixam de ter efeito visual e a conversa perde a leitura imediata de quem falou — restando apenas a cor de fundo. Não há `m
- **Esforço:** pequeno · **Risco:** baixo

### NOTIF-03 · Deep link de notificação nunca abre sem sessão iniciada — e dispara tardiamente se o utilizador entrar mais tarde
**Ecrã:** `contexts/NotificationsContext.tsx:76-81` · **Severidade:** medio · **Prioridade:** P1

- **O que muda:** 1. Separar navegação de telemetria: navegar sempre que `pendingResponse` existir (os ecrãs de select-vendor/select-service-type são acessíveis a convidados), e só condicionar a sessão as chamadas CAMPAIGN_LOG_OPEN/CLICK. 2. Acrescentar um TTL ao pendingResponse (ex.: descartar se tiver mais de 60s) para nunca navegar 'do nada' numa sessão futura. 3. Limpar sempre o pendingResponse depois de tratado, mesmo quando se decide não navegar.
- **Porquê:** O efeito da linha 76 só processa a resposta quando `pendingResponse && session`. Sem sessão, a resposta fica guardada em estado e nada acontece: a app abre no Início e o toque na notificação parece não ter efeito. O `pendingResponse` também nunca é limpo neste caminho, pelo que quando o utilizador iniciar sessão (possivelmente muito depois, noutra sessão de utilização) a navegação dispara subitame
- **Esforço:** pequeno · **Risco:** medio

### PROF-02 · Não há forma de alterar a morada a partir do Perfil, apesar de a copy do menu a prometer
**Ecrã:** `app/(app)/(tabs)/profile/index.tsx:287-293 e app/(app)/(modals)/(profile)/edit-profile/index.tsx (ecrã completo)` · **Severidade:** medio · **Prioridade:** P1

- **O que muda:** Opção preferida: acrescentar ao menuRows de profile/index.tsx (entre 'profile' e 'payments') uma linha 'Morada' com ícone 'location-outline', subtítulo derivado de `formatAddressLabel(userData?.address)` (o helper já existe em hooks/useAddressLabel) ou 'Por definir', e onPress para '/(app)/(modals)/(address)/update'. Alternativa mais barata: acrescentar dentro do Editar Perfil uma linha tocável de morada que navegue para o mesmo modal, reaproveitando a chave profile.edit.change_address já traduzida. Em qualquer dos casos, alinhar o subtítulo 'Dados pessoais e morada' com o que passa a existir.
- **Porquê:** O ecrã Editar Perfil só tem avatar, nome, telefone, email (só leitura) e redefinir palavra-passe — nenhuma referência a morada. Um grep por `'(address)/update'` mostra que só se chega lá pelo cabeçalho do Início (UserHeader.tsx:34), pela lista (list/index.tsx:86), pelos serviços do Início (home/services/index.tsx:25) e pelo fluxo de pedido — nunca a partir do Perfil. A chave de tradução `profile.e
- **Esforço:** pequeno · **Risco:** baixo

### DEL-01 · Eliminar conta: confirmação reutiliza a copy de 'guardar alterações', não avisa sobre serviços ativos e não dá confirmação de sucesso
**Ecrã:** `app/(app)/(modals)/(profile)/delete-account/index.tsx:49-93` · **Severidade:** medio · **Prioridade:** P1

- **O que muda:** 1. Criar chaves próprias `delete_account.confirm_button` ('Apagar conta definitivamente') e `delete_account.cancel_button` ('Manter a minha conta') em pt_PT e en_US e usá-las nas linhas 53-54. 2. Alargar delete_account.warning.description para cobrir serviços ativos e pagamentos pendentes, alinhado com o que o backend faz de facto. 3. Confirmar antes de sair: openDialog de sucesso com CheckMark e closeAfterMSeconds antes do replace para o login. 4. Se o backend recusar a eliminação por haver serviço ativo, tratar essa resposta de forma específica (mensagem explicando qual o serviço) em vez de cair no diálogo genérico de erro (linhas 79-84). 5. Remover os estados e o bloco de avatar mortos (l
- **Porquê:** O diálogo (linhas 50-54) usa `successButtonText: t('profile.edit.save.confirm')` e `cancelButtonText: t('profile.edit.save.cancel')` — as mesmas chaves do 'Guardar alterações' do perfil, que em pt_PT.ts:810-811 são 'Sim' e 'Não'. Num ecrã destrutivo, botões genéricos herdados de um ecrã de gravação são um risco de clique acidental. O aviso (delete_account.warning.description, pt_PT.ts:969) enumera
- **Esforço:** pequeno · **Risco:** baixo

### PAY-03 · Ecrã de Pagamentos: cabeçalho diz 'Perfil' e o botão de adicionar cartão aparece duplicado quando não há métodos
**Ecrã:** `app/(app)/(pages)/(payments)/payments.tsx:25 e components/app/Profile/Payments.tsx:102-142` · **Severidade:** baixo · **Prioridade:** P2

- **O que muda:** 1. Em payments.tsx:25 trocar para `t('profile.payments.title')`. 2. Em Payments.tsx, remover o CTA do ListEmptyComponent (linhas 116-127) e manter apenas o do rodapé — ou, em alternativa, esconder o rodapé quando a lista está vazia. A primeira opção é mais simples e mantém a posição do botão estável entre estados.
- **Porquê:** O cabeçalho usa `t('profile.my_profile.title')` (payments.tsx:25), que em pt_PT.ts:843 é 'Perfil' — quando existe `profile.payments.title` = 'Pagamentos' (pt_PT.ts:871) definido e não utilizado. Quanto ao botão: o ListEmptyComponent inclui o seu próprio CTA (Payments.tsx:117-126) e existe um segundo CTA permanente no rodapé (linhas 133-142), pelo que no estado vazio ambos são renderizados.
- **Esforço:** pequeno · **Risco:** baixo

### PROF-03 · Código morto no separador Perfil e separador visual desenhado a mais no último item
**Ecrã:** `app/(app)/(tabs)/profile/index.tsx:3, 46-83, 86-109, 123-151 e components/app/Profile/MyProfile.tsx:80` · **Severidade:** baixo · **Prioridade:** P3

- **O que muda:** Decidir primeiro o destino do MyProfile: se a linha de morada voltar ao Perfil (ver PROF-02), reaproveitá-lo e corrigir a linha 80 para `i < arr.length - 1`; caso contrário, apagar o ficheiro e o import. Em qualquer dos casos, remover de profile/index.tsx o array `sections`, o `handleNavigation`, o bloco comentado de useForm e os imports órfãos. Isto reduz o ruído para quem vier a seguir e evita que alguém reative por engano um caminho de navegação obsoleto.
- **Porquê:** profile/index.tsx importa `MyProfile` (linha 3) e nunca o renderiza; mantém o array `sections` (linhas 46-83) e o `handleNavigation` (linhas 123-151) da versão anterior por abas, ambos sem qualquer consumidor, além de um bloco de useForm comentado (linhas 86-109) e vários imports não utilizados (DatePicker, ThemedText, TouchOpacity, useApi, BackHeader, MenuArrow, GearIcon, ProfileIcon, CreditCardI
- **Esforço:** pequeno · **Risco:** baixo

### NOTIF-07 · Resposta de arranque a frio pode ser processada duas vezes, duplicando a navegação
**Ecrã:** `contexts/NotificationsContext.tsx:59-65` · **Severidade:** baixo · **Prioridade:** P2

- **O que muda:** Guardar o identificador da última resposta já processada num useRef e ignorar respostas com o mesmo `response.notification.request.identifier`; é uma proteção de três linhas que fecha o caso independentemente do comportamento da biblioteca. Em alternativa, substituir as duas vias pelo hook `Notifications.useLastNotificationResponse()`, que já desduplica.
- **Porquê:** O arranque a frio é tratado por duas vias em simultâneo: `getLastNotificationResponseAsync()` (linhas 59-61) e o `addNotificationResponseReceivedListener` (linhas 63-65), ambos a fazer setPendingResponse. Se ambas dispararem — comportamento que varia entre versões do expo-notifications e entre plataformas — o efeito das linhas 76-81 corre duas vezes e faz dois `router.push` para o mesmo destino. N
- **Esforço:** pequeno · **Risco:** baixo

### A11Y-01 · gray_medium #858585 — cor de todo o texto secundário da app — falha WCAG AA (3,69:1 sobre branco, 3,45:1 sobre o creme)
**Ecrã:** `constants/Colors.ts:13 (definição); 193 ocorrências em 52 ficheiros, ex. components/app/Services/vendor-card-selector/index.tsx:88,112,121; components/app/Services/technician-trust-footer/index.tsx:42; app/(app)/(tabs)/cart/index.tsx:207,260; components/services/OpenService.tsx:33` · **Severidade:** critico · **Prioridade:** P0

- **O que muda:** Correção de uma linha com impacto global: em constants/Colors.ts:13 e 30, mudar gray_medium de "#858585" para "#6B6B6B" (4,83:1 sobre branco, 4,52:1 sobre #FAF7F2 — passa AA em ambos os fundos) ou, se se quiser margem, "#666666" (5,74:1 / 5,37:1). Espelhar em tailwind.config.js:20. Alternativa mais conservadora visualmente: manter #858585 apenas para texto ≥18px e trocar os 193 usos a 12–14px por gray_strong #525252 (7,81:1) — mas isso é 52 ficheiros de edição contra 2 linhas. Recomendo a mudança do token. Depois, adicionar um teste de regressão de contraste (ver testes recomendados).
- **Porquê:** #858585 sobre #FFFFFF = 3,69:1. Sobre o creme #FAF7F2 = 3,45:1. Sobre o campo de pesquisa #FBFBFA da Home = 3,56:1. Sobre o tint âmbar a 15–16% (#FEF4E5, usado no TechnicianTrustFooter e no resumo do Cesto) = 3,39:1. Todos falham AA; nenhum caso de uso é texto grande, logo a exceção AA-large (3:1) não se aplica.
- **Esforço:** pequeno · **Risco:** baixo

### A11Y-02 · Preço e etiqueta de poupança em âmbar sobre fundo claro: 1,70:1 e 1,53:1 — informação comercial crítica quase ilegível
**Ecrã:** `app/(app)/(tabs)/list/index.tsx:434-438; components/app/Services/service-card-selector/index.tsx:92-99; components/app/Services/schedule-vendor-card/index.tsx:133-139` · **Severidade:** critico · **Prioridade:** P0

- **O que muda:** Regra a fixar no design system: **primary #FABB5B nunca é cor de texto sobre fundo claro** — só sobre secondary #1B1B1B (10,11:1, uso legítimo em OpenService, Dialog e nos ecrãs MB WAY). Concretamente: (a) list/index.tsx:437 e service-card-selector/index.tsx:94 → trocar color="primary" por color="secondary" com boldness="bold" (17,22:1) — o preço fica mais legível e mais destacado; (b) service-card-selector/index.tsx:85,94 no ramo diffBackground → usar color="secondary" (10,11:1 sobre âmbar) em vez de support_secondary; (c) schedule-vendor-card/index.tsx:137 → manter o chip com fundo rgba(250,187,91,0.2) mas pôr o texto a secondary (#1B1B1B → 14,2:1) e, se se quiser manter ênfase âmbar, escu
- **Porquê:** list/index.tsx:437 — #FABB5B sobre #FFFFFF = 1,70:1 a 12px bold. service-card-selector/index.tsx:94 — o mesmo a 14px bold; e no ramo diffBackground (linha 94) o preço passa a support_secondary (#FFFFFF) sobre bg-[#FABB5B] = 1,70:1 também, ou seja **os dois ramos do ternário falham**. schedule-vendor-card/index.tsx:137 — #FABB5B sobre o tint âmbar a 20% (equivalente a #FEF1DE sobre branco) = **1,53
- **Esforço:** pequeno · **Risco:** baixo

### A11Y-03 · App essencialmente inutilizável com leitor de ecrã: 216 controlos tácteis para 21 props de acessibilidade; 70 TextInput sem accessibilityLabel
**Ecrã:** `transversal — components/app/BackHeader.tsx:31-49; components/app/UserHeader.tsx:59,70,100; components/CustomTouchableOpacity.tsx:140-162; components/CustomTextInput.tsx:152; components/TouchOpacity.tsx:27` · **Severidade:** alto · **Prioridade:** P0

- **O que muda:** Faseado, começando pela base (o retorno é imediato porque 119 botões passam por um único componente): Fase 1 (1 dia): em CustomTouchableOpacity.tsx:140, acrescentar por omissão `accessibilityRole="button"`, `accessibilityLabel={props.accessibilityLabel ?? text}` e `accessibilityState={{ disabled: !!disabled }}` — a prop `text` já contém a etiqueta traduzida em 42 dos botões primários. Mesma coisa em TouchOpacity.tsx:27 (role "button" quando há onPress). Em CustomTextInput.tsx:152, adicionar `accessibilityLabel={props.accessibilityLabel ?? placeholder}` como rede de segurança. Fase 2 (2 dias): botões só-de-ícone — BackHeader.tsx:31 (`accessibilityRole="button"` + `accessibilityLabel={t('gener
- **Porquê:** Contagem exata sobre app/ e components/: 216 elementos tácteis (119 CustomTouchableOpacity, 61 TouchableOpacity, 23 TouchOpacity, 10 TouchableWithoutFeedback, 3 TouchableHighlight) contra 21 ocorrências totais de accessibilityLabel/Role/State/Hint/accessible — e 14 dessas 21 estão em apenas 2 ficheiros (schedule-service.tsx e TabBar.tsx). Os componentes-base CustomTouchableOpacity e TouchOpacity n
- **Esforço:** medio · **Risco:** baixo

### A11Y-04 · Botão de voltar mede 40×20pt em 40 ecrãs; só existem 2 hitSlop em toda a app
**Ecrã:** `components/app/BackHeader.tsx:44-48 (usado em 40 ecrãs); components/app/UserHeader.tsx:100; components/warnings/GeolocationPermissionBanner.tsx:76,85; components/app/Profile/Settings.tsx:100-109; components/FilterTabs.tsx:34-48` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** 1. Criar `components/IconButton.tsx`: TouchableOpacity com `style={{minWidth:44, minHeight:44, alignItems:'center', justifyContent:'center'}}`, `hitSlop={{top:8,bottom:8,left:8,right:8}}`, `accessibilityRole="button"` e prop `accessibilityLabel` obrigatória. Uma peça, resolve o padrão todo. 2. BackHeader.tsx:44 — substituir TouchableWithoutFeedback + `<View className="w-10">` por `<IconButton accessibilityLabel={t('general.back')}>` mantendo o ícone 20×20 lá dentro. Corrige 40 ecrãs de uma vez e passa a haver feedback ao toque. 3. UserHeader.tsx:100 — trocar `className="w-6 h-6"` por IconButton com o ícone 24×24 centrado (cuidado: o badge está posicionado com `absolute -top-3 -right-2` relat
- **Porquê:** BackHeader.tsx:44 — o TouchableWithoutFeedback envolve `<View className="w-10">` (40pt de largura) contendo `<View className="w-5 h-5">` (20×20). Como não há altura definida no wrapper, a área efetiva é **40×20pt**, ~40% da área mínima, sem hitSlop. Presente em 40 ecrãs. Além disso é um TouchableWithoutFeedback: não dá qualquer feedback visual ao toque. UserHeader.tsx:100 — sino de notificações: `
- **Esforço:** medio · **Risco:** medio

### DS-01 · Três fontes de tokens de cor em paralelo, já divergentes — incluindo dois amarelos de marca diferentes
**Ecrã:** `constants/Colors.ts:19-35 vs tailwind.config.js:9-33 vs constants/DesignTokens.ts:4-29` · **Severidade:** alto · **Prioridade:** P1

- **O que muda:** Decidir e executar num único PR: 1. Corrigir já o bug latente: tailwind.config.js:12 success "#23E69E" → "#059669" (e alinhar error/link). Custo zero, evita um bug futuro garantido. 2. Fazer o tailwind.config.js importar de constants/Colors.ts em vez de duplicar literais: `const { Colors } = require('./constants/Colors')` e `colors: { ...Colors }`. Passa a ser impossível divergirem. 3. Sobre DesignTokens.ts, escolher explicitamente: (a) se o design novo é o futuro, promovê-lo a paleta global e migrar Colors.ts para ele (grande, mas acaba com a duplicação); (b) se não é, reverter history/index.tsx e FilterTabs.tsx para Colors.ts e apagar DesignTokens.ts. O estado atual — dois amarelos de marc
- **Porquê:** Existem três definições simultâneas: • constants/Colors.ts — primary #FABB5B, secondary #1B1B1B, success #059669, error #ED4949. • tailwind.config.js — os mesmos nomes mas **success = #23E69E** (verde-menta completamente diferente de #059669; 1,63:1 sobre branco, falharia tudo). Não é usado hoje (não há nenhuma classe bg-success/text-success no código), mas está armado: a primeira pessoa que escre
- **Esforço:** medio · **Risco:** medio

---

## 3. Fricção e pontos de abandono no funil

| Ponto do funil | Fricção observada | Solução concreta | Impacto |
|---|---|---|---|
| Home (entrada) | Bloco "Agendamentos · 0 serviços" ocupa o topo para quem nunca reservou | Esconder para convidados sem histórico; dar esse espaço às categorias | Mais toques na ação principal |
| Home → categoria | Prova social ("★ 4.8 · +5000 serviços") está no rodapé, abaixo da dobra | Subir para junto do título "Tipo de Serviços" | Confiança antes da escolha |
| Zona não coberta | Cliente descobre tarde, depois de investir passos | Validar zona **antes** de escolher serviço, na Home | Menos frustração e abandono |
| Escolha de técnico | Pouca informação para decidir | Mostrar dados reais quando o backend os fornecer (nunca inventar) | Decisão mais rápida |
| Pagamento → espera | Paga antes de ter técnico garantido | Explicitar na copy o que acontece ao dinheiro se ninguém aceitar | Reduz ansiedade e tickets |
| Espera (60 s) | Contagem de 60 s mas copies prometem "20 minutos" | Alinhar número real e copy | Fim de expectativa traída |
| Falha de rede | Ecrã vazio ou mensagem errada | Estado de erro + "Tentar novamente" em todos os ecrãs de lista | Recuperação sem matar a app |

---

## 4. Design system — consolidação recomendada

| Área | Problema | Ação |
|---|---|---|
| Cor | `gray_medium` e `gray_light` falham AA | Escurecer `gray_medium` → ~#6B6B6B; `gray_light` só para bordas/ícones |
| Cor | Texto branco sobre âmbar = 1,70:1 | Usar sempre `secondary` #1B1B1B sobre âmbar (já é o padrão dominante) |
| Cor | Preço em âmbar sobre branco = 1,70:1 | Preço em `secondary`, âmbar só como fundo/realce |
| Espaço | Alturas fixas (`h-24`) quebram com texto grande | `minHeight` + `paddingVertical` |
| Componentes | Vários padrões de cartão/botão coexistem | Consolidar nos componentes `Custom*` já existentes |
| Tokens | Hexes soltos espalhados | Migrar para `Colors.ts` / `DesignTokens.ts` |
| Feedback | Sem `RefreshControl` em lado nenhum | Adicionar puxar-para-atualizar em todas as listas |
| A11y | Só 1 ecrã tem labels acessíveis | Replicar o padrão de `schedule-service.tsx` |
