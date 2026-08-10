# Auditoria de layout — app cliente Piquet

**Data:** 10 de agosto de 2026 · **Build:** 2026.7.21 · **Dispositivo:** iPhone 17 Pro Max, iOS 26.4
**Âmbito:** layout e hierarquia visual. Não é auditoria de código, segurança ou performance.

---

## Sobre a confiança desta avaliação

O André pediu uma avaliação "100% segura". **Não a consigo dar, e é importante dizer porquê.**

Esta app tem 57 ecrãs. Consegui alcançar e ver **17** no simulador. Os restantes 40
dependem de estados que não consigo produzir aqui: um serviço em curso, um pagamento
real, um técnico a caminho, uma conta por confirmar. Sobre esses posso ler o código —
mas ler código não é ver o ecrã, e **já errei nesta sessão exatamente por causa disso**:
redesenhei o ecrã de escolha de técnico do fluxo imediato convencido de que era o único,
quando o fluxo Agendar usava outro componente. Só descobri quando o André disse que não
via as alterações.

Por isso cada achado abaixo está marcado:

- 👁️ **Vi** — observado num screenshot do simulador. Alta confiança.
- 📄 **Li** — deduzido do código, não confirmado visualmente. Tratar como hipótese.

Não há aqui nenhum achado que eu não consiga apontar a um screenshot ou a uma linha de
código concreta.

---

## Ecrãs verificados visualmente (17)

Home · Lista de Serviços · Cesto · Histórico · Perfil · Definições · Pagamentos ·
Editar Perfil · Ajuda e Suporte · Alterar Morada · Agendamentos (vazio) · Categoria ·
Ficha do serviço · Modal "Quando queres" · Escolher profissional (imediato, vazio) ·
Escolher profissional (agendado, com dados) · Escolher dia e hora

## Ecrãs NÃO verificados (40) — a maior lacuna desta auditoria

Checkout · MB Way (espera/confirmado/negado) · Cartão (espera/confirmado/negado) ·
Serviço em curso (overview, progresso, estado, chat) · Técnico chegou · Cancelar ·
Fechar serviço · Avaliar · Pedido de extras · À espera de aceitação · Onboarding ·
Registo · Recuperar palavra-passe · Confirmar email · SMS · Zona não servida ·
Completar perfil · Eliminar conta · Editar método de pagamento · Dados de faturação ·
404 · e outros.

**O checkout e os ecrãs de pagamento são a lacuna mais séria** — é onde o dinheiro
muda de mãos e é onde não consegui ver nada.

---

# 🔴 Crítico

## C1 · 👁️ Promessa errada ao cliente na janela de agendamento — **erro meu, introduzido nesta sessão**

Implementei uma "janela de chegada" que mostra `14:00 – 14:30` na lista de agendamentos
e na ficha do serviço ativo. Justifiquei-a assim: *"o backend obriga a
`scheduled_time_end`, logo todo o agendamento tem sempre um intervalo real."*

**Está errado.** O ecrã de escolha de hora só deixa escolher o **início**
(`schedule-service.tsx`), e o fim é calculado como `início + TIME_INTERVAL_MINUTES`,
onde `TIME_INTERVAL_MINUTES = 30`. O `scheduled_time_end` é o **tamanho da marcação**,
não uma janela de tolerância de chegada.

Consequência: o cliente escolhe "14:00", a app confirma "14:00", e depois mostra-lhe
"14:00 – 14:30" — a app enfraquece sozinha uma promessa que o negócio tinha feito, e
convida o técnico a chegar às 14:29 sem estar atrasado.

**Correção:** voltar a mostrar só a hora escolhida. Uma janela de chegada a sério é uma
decisão de negócio (definir a tolerância, comunicá-la ao técnico), não uma leitura de um
campo que já existe.

## C2 · 👁️ Histórico preso no esqueleto de carregamento

Abri o Histórico e ficou nos cartões cinzentos indefinidamente — nunca resolveu para
lista nem para estado de erro. Não é um flash de carregamento: é o ecrã inteiro parado.

O utilizador que abre o Histórico não distingue "a carregar" de "avariado". A regra que
já apliquei noutros ecrãs desta app aplica-se aqui: **um carregamento que falha tem de
virar mensagem, não ficar em esqueleto para sempre.**

Nota: não consegui determinar se é falha de rede, de sessão, ou consequência de eu ter
entrado por deep link em vez de tocar no separador. Precisa de ser reproduzido pelo
caminho normal antes de se atribuir causa.

---

# 🟠 Alto

## A1 · 👁️ Botão principal com estilo diferente em "Alterar Morada"

Em toda a app o botão primário é **âmbar com texto escuro**. Neste ecrã é **preto com
texto âmbar**. É o mesmo tipo de ação (confirmar e guardar) com duas linguagens visuais
diferentes, o que obriga o utilizador a reaprender o que é o botão principal.

Corrigir para âmbar. Se o preto for intencional para diferenciar "alterar" de "criar",
então tem de ser sistemático — e não é: "Guardar alterações" no Editar Perfil é âmbar.

## A2 · 👁️ Campo de email vazio e bloqueado no Editar Perfil

O campo Email aparece com cadeado e **completamente vazio**. Um campo bloqueado que não
mostra o valor não protege nada — só faz parecer que a app perdeu o email da conta.

Ou mostra o email a cinzento com o cadeado (comunica "é este, e não se altera aqui"),
ou desaparece e passa a uma linha de texto. O estado atual é o pior dos dois.

## A3 · 👁️ Serviços sem imagem na Lista de Serviços

"Abertura de Portão de Garagem" e "Curto-circuito" mostram quadrados creme vazios onde os
outros têm fotografia. Numa lista onde a imagem é o principal apoio ao reconhecimento, os
que não a têm parecem produtos por acabar.

Isto é curadoria de conteúdo, não layout — mas o layout pode proteger-se: um ícone da
categoria como recurso é melhor do que um retângulo vazio.

## A4 · 👁️ Fotografias de técnicos inconsistentes

No ecrã de escolha, um dos técnicos tem um **logótipo com texto** em vez de retrato, e a
54 px é completamente ilegível. Outro tem barras brancas laterais. Como o retrato é o
primeiro sinal de confiança do ecrã, esta inconsistência trabalha contra o objetivo.

Nenhum layout resolve isto — é preciso uma regra de aceitação de foto no onboarding do
técnico (rosto, enquadramento, sem texto).

## A5 · 👁️ Título não corresponde ao conteúdo em Agendamentos

Cabeçalho diz **"Todos os serviços"**; o conteúdo diz **"Ainda não tens agendamentos"**.
São duas coisas diferentes. O título tem de dizer "Agendamentos".

## A6 · 👁️ Botão "voltar" em ecrãs de separador

A Lista de Serviços e o Histórico são **separadores** e têm seta de voltar no cabeçalho.
Separadores são destinos de topo — não há "para trás". Tocar ali produz um resultado que
o utilizador não pediu.

---

# 🟡 Médio

## M1 · 👁️ Notificações sem estado nem ação

As oito notificações visíveis são todas de marketing, nenhuma sobre serviços. Não há
distinção lida/não lida, não há agrupamento útil (só "Anteriores") e nada parece tocável.

Um centro de notificações que não leva a lado nenhum é uma lista de texto. Cada
notificação devia abrir o que anuncia — e as de serviço (técnico a caminho, extras
pedidos) deviam existir e vir primeiro.

## M2 · 👁️ Estado desativado do "Continuar" lê-se como avariado

No ecrã de escolha de dia e hora, o "Continuar" desativado é âmbar muito pálido com texto
pálido sobre creme. Não se percebe se está desligado ou se falhou a carregar.

Um contorno cinzento com texto cinzento comunica "bloqueado" muito melhor do que uma
versão desbotada do botão ativo. (Controlos desativados estão isentos de WCAG, por isso
isto é legibilidade, não conformidade.)

## M3 · 👁️ Horários todos com o mesmo aspeto

Todos os horários têm contorno âmbar e fundo branco. Não consigo distinguir disponível de
indisponível, nem ver qual está selecionado sem tocar. Com 17 slots no ecrã, o custo de
explorar é alto.

Precisa de três estados visualmente distintos: disponível, selecionado (preenchido) e
esgotado (cinzento, sem contorno).

## M4 · 👁️ Cesto e Pagamentos com enorme vazio vertical

Ambos centram o conteúdo e deixam 40% do ecrã em branco. É o mesmo problema que corrigi
no banner de confiança: o conteúdo flutua no meio em vez de ocupar o espaço.

No Cesto, o vazio é uma oportunidade desperdiçada — podia mostrar serviços sugeridos ou
os últimos pedidos, transformando um beco sem saída num ponto de partida.

## M5 · 📄 Registo em "você" no ecrã de Pagamentos

"Adicione um cartão para pagar os **seus** serviços" — a app trata por tu em todo o lado
("Do que precisas?", "O teu cesto está vazio"). Este ecrã escapou.

Vi este; marco como 📄 porque não varri os restantes 40 ecrãs à procura de mais
ocorrências, e é provável que existam.

## M6 · 👁️ Chips de filtro cortados sem pista de rolagem

Na Lista de Serviços, os chips de categoria saem pela direita a meio da palavra
("ELETRIC..."). Funciona como pista de que há mais, mas é acidental. Um gradiente de
desvanecimento na margem torna-o intencional.

---

# 🟢 Baixo

## B1 · 👁️ Definições sem agrupamento nomeado
Quatro cartões soltos sem títulos de secção. Com este número ainda se lê, mas não escala.

## B2 · 👁️ Validação inconsistente em Alterar Morada
"Nome da rua" mostra contorno verde sem visto; os outros mostram visto sem contorno.
Dois vocabulários para o mesmo estado.

## B3 · 👁️ Versão da app isolada no fundo das Definições
"Versão 2026.7.21" solta no creme. Devia estar dentro do cartão "Sobre", onde se procura.

---

# O que eu faria primeiro

| # | Achado | Porquê primeiro |
|---|--------|-----------------|
| 1 | **C1** janela de chegada | É uma promessa errada, em produção, e fui eu que a introduzi |
| 2 | **C2** histórico preso | Ecrã principal que pode estar avariado para toda a gente |
| 3 | **A2** email vazio | Parece perda de dados da conta |
| 4 | **A1** botão preto | Uma linha, e devolve consistência ao sistema |
| 5 | **A5 + A6** títulos e setas | Correções triviais de navegação |
| 6 | **M3** estados dos horários | Fricção real num ecrã do funil de compra |

---

# O que esta auditoria não cobre e devia

**Ver o checkout e os ecrãs de pagamento.** São 8 ecrãs, é onde o dinheiro muda de mãos,
e não vi nenhum. Para os alcançar é preciso um método de pagamento de teste na conta.

**Ver o serviço em curso.** Sete ecrãs (a caminho, chegou, em progresso, chat, extras,
fechar, avaliar) que são a experiência principal depois da compra. Precisam de um serviço
real a decorrer, com a app do técnico do outro lado.

**Testar com texto aumentado.** Corrigi o `CustomText` para escalar `lineHeight` numa vaga
anterior, mas não voltei a testar os ecrãs novos a 200%.

**Testar em ecrã pequeno.** Tudo o que vi foi num iPhone 17 Pro Max. Num SE, os cartões de
técnico com selo, preço, riscado e poupança são candidatos sérios a partir.
