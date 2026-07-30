# Pendências do backend (app cliente)

Alterações necessárias no backend de produção (`app.piquetapp.com`) para
completar funcionalidades já preparadas na app cliente (branch
`feat/build-15-features`). Ordenadas por prioridade.

---

## 1. Anular a ordem MB Way quando o serviço é cancelado ⚠️ (envolve dinheiro)

**Problema observado:** quando o cliente cancela o serviço na app durante a
espera do pagamento MB Way, o pedido de pagamento continua vivo na app
MB WAY do cliente até expirar (~4 min). Nesse intervalo, o cliente pode
autorizar o pagamento de um serviço **já cancelado** e ser cobrado.

**Fluxo atual:**
1. App chama `POST /api/v1/customer/services/{id}/cancel`.
2. Backend cancela o serviço na BD — **mas não comunica com a Paylands**.
3. A ordem MB Way fica órfã no telemóvel do cliente.

**Correção pedida (duas partes, ambas necessárias):**

**a) No handler do cancel** — se o serviço tem pagamento MB Way pendente,
chamar a API da Paylands para anular/expirar a ordem antes de confirmar o
cancelamento. Se a Paylands não suportar anulação pré-autorização para
MB Way, marcar a ordem como órfã na BD (para a parte b).

**b) Rede de segurança no webhook (obrigatória)** — quando chegar uma
confirmação de pagamento (webhook Paylands) para um serviço com estado
`Canceled`:
- disparar **refund automático imediato** na Paylands;
- registar o evento (log/auditoria);
- notificar o cliente (push/SMS) de que o valor será devolvido.

Isto cobre a corrida "cliente autoriza no MB WAY um segundo depois de
cancelar na app", que nenhuma anulação elimina a 100%.

**Nota:** a app já trata a corrida inversa — se o cancel chega depois do
pagamento, o backend devolve `409` com `metadata.code = "already_paid"` e a
app segue o fluxo de pago. Esse comportamento deve manter-se.

---

## 2. Número de avaliações por técnico na pesquisa de vendors

**Objetivo:** a seleção de técnico na app deve mostrar "★ 4.9 (312
avaliações)". A app já está preparada (desde o commit `62a7200`) — mostra a
contagem automaticamente se o payload a trouxer; hoje o campo não existe.

**Endpoints a alterar (payload de cada vendor):**
- `POST /api/v1/common/services/guest/vendors` (convidados)
- `POST /api/v1/customer/services` (autenticados — resposta com `vendors`)
- endpoint equivalente do fluxo agendado, se for outro

**Campo novo por vendor:**
```json
{
  "id": 42,
  "name": "…",
  "rating": 4.9,
  "rating_count": 312
}
```

`rating_count` = número de serviços concluídos desse vendor com
`rating_by_customer` preenchido (o mesmo universo usado para calcular o
`rating` médio, para os números serem coerentes entre si).

A app aceita `rating_count`, `ratings_count` ou `reviews_count` — usar
`rating_count` de preferência. Sem o campo, a app mostra só "★ 4.9" (nunca
inventa contagens).

---

## 3. Remover a data de nascimento do registo e da BD (minimização RGPD)

A app deixou de mostrar a data de nascimento (Editar Perfil) porque o dado
não tem qualquer uso no produto — nenhuma funcionalidade o consome. Pedir
e guardar dados pessoais sem finalidade viola o princípio da minimização
do RGPD e aumenta o risco em caso de fuga/pedidos de apagamento.

Pedido ao backend:
- tornar `date_birthday` opcional no registo e no update de perfil
  (a app ainda envia o valor existente por compatibilidade);
- depois, remover o campo do fluxo de registo e, a prazo, da BD;
- se for preciso garantir maioridade, substituir por declaração nos
  termos ("declaro ter mais de 18 anos"), não pela data exata.

---

## 4. Alteração do telemóvel deve exigir re-verificação por OTP 🔒

Hoje o cliente pode alterar o número de telemóvel no Editar Perfil sem
provar que controla o número novo. O telemóvel é o contacto que os
técnicos usam e o número que pré-preenche o MB Way — trocar sem
verificação permite desviar contactos (e potencialmente pagamentos MB Way)
para um número de terceiros.

Fluxo pedido:
1. Cliente altera o número na app.
2. Backend envia OTP por SMS para o número **novo**.
3. A alteração só é persistida depois do OTP validado (endpoint de
   confirmação); até lá mantém-se o número antigo.

A app adapta-se assim que o backend expuser o fluxo (reutilizamos a UI de
OTP que já existe no checkout de convidados).

---

## 5. Pedidos multi-serviço (cesto) — combinar num só checkout

A app ganhou um cesto: o cliente junta vários tipos de serviço e reserva-os.
Como o backend só processa **um serviço por pedido**, hoje o cesto coordena
reservas sequenciais (um checkout por serviço). Para a experiência ideal:

- endpoint de pesquisa de técnicos que aceite **vários** `service_type_id`
  e devolva os técnicos que cobrem todos (a app já faz esta interseção do
  lado do cliente, mas com 3× mais tráfego);
- a prazo: pedido composto (N serviços + 1 pagamento) com agendamento de
  blocos consecutivos quando o técnico é o mesmo.

---

## 6. Guardar o comentário da avaliação do cliente

A app passou a enviar `comment` (texto livre, ≤1000 chars) no
`PUT /customer/services/{id}/rate`, junto com o `rate`. Pedido:
- aceitar e persistir o campo (ex.: coluna `rating_comment` no serviço);
- expô-lo nos endpoints de leitura para o backoffice/inbox de qualidade.

Até lá o comentário não se perde: segue também no evento Mixpanel
`service_rated` (propriedade `comment`).

---

## 7. Enriquecer o serviço aberto (vista geral / acompanhamento)

Os ecrãs de serviço em curso mostram só o que o payload traz. Para
igualar o design da build 15, o serviço aberto (`openService`) devia
incluir:
- **método de pagamento** usado (ex.: "MB Way", "VISA ****1234") — hoje
  a vista geral mostra só o valor, sem o método;
- **nota média do técnico** no `vendor` (ex.: 4.7) — hoje mostramos só o
  nome + "Técnico Verificado";
- (opcional) **ETA do técnico** em minutos/segundos — a app estima-o a
  partir da distância GPS (~22 km/h urbano), o que é uma aproximação; um
  ETA real do backend (rota + trânsito) seria mais fiável.

---

## 8. Miniaturas de imagens demasiado grandes (performance) 🐢 — para o Rodrigo

Medição real: cada imagem de tipo de serviço servida em
`/document/{id}/conversions/...-webp.webp` tem **1254×1254 px (~78 KB)**,
mas é apresentada na app a **50×50 px** (lista de tipos) e a categoria
a ~180 px de altura. Uma categoria como Canalização (26 tipos) obriga a
descarregar **~2 MB** só de miniaturas na primeira abertura.

Pedido: gerar uma **conversão pequena** (ex.: 120×120 px, `~3-5 KB`) para
as miniaturas e expô-la no payload (ex.: `image_thumb`), mantendo a
imagem grande para onde faça sentido. Reduz o tráfego em ~95% e a
primeira carga passa a ser quase instantânea.

Do lado da app: `expo-image` com cache de disco + prefetch, e **stopgap
ativo** — as miniaturas passam por um proxy público de redimensionamento
(images.weserv.nl) que corta ~97% do tamanho (78 KB → 2,4 KB, medido).
Quando o backend expuser a conversão pequena (`image_thumb`), remove-se o
proxy (util `utils/imageProxy.ts`) e aponta-se à conversão nativa — deixa
de depender de um serviço terceiro.

---

## 9. Tempo extra / peças e materiais durante o serviço ⚠️ (contrato novo, envolve dinheiro)

**Contexto:** a app do técnico (`app-vendor`) já tem esta funcionalidade
**pronta e comitada** (`components/services/ServiceExtras.tsx`) — durante um
serviço, o técnico pode pedir mais tempo (presets 15/30/45/60 min) ou uma
peça/material (descrição + valor), e o pedido só entra no valor a receber
depois de o cliente aprovar. A app cliente (`app-costumer`) agora já está
preparada para **receber** esses pedidos (real-time + ecrã de aprovar/
recusar + histórico no ecrã do serviço), mas o contrato de API abaixo é
**uma proposta da app, não confirmado com o backend** — precisa de validação
antes de ir a produção.

**O que a app cliente já assume (a confirmar/ajustar):**

1. **Listar extras do serviço**
   `GET /api/v1/customer/services/{id}/extras`
   Resposta esperada (mesma forma que o `app-vendor` já consome):
   ```json
   { "data": { "extras": [
     { "id": 1, "type": "time", "description": null, "minutes": 30,
       "amount": 1250, "status": "pending", "rejection_reason": null }
   ] } }
   ```
   `type`: `"time"` ou `"part"` · `amount` em cêntimos · `status`:
   `"pending" | "approved" | "rejected" | "withdrawn"`.

2. **Responder a um pedido**
   `POST /api/v1/customer/services/{id}/extras/{extraId}`
   Body: `{ "status": "approved" }` ou
   `{ "status": "rejected", "rejection_reason": "texto opcional" }`.
   Resposta esperada: `{ "data": { "extra": { ...atualizado } } }`.

3. **Eventos em tempo real** no canal privado `common.services.{serviceId}`
   (já usado para chegada do técnico, conclusão, etc. — ver
   `contexts/ServiceContext.tsx`):
   - `.ServiceExtraRequestedEvent` — disparado quando o técnico pede tempo/
     peça. Payload esperado: `{ "extra": { ...mesma forma do GET } }`. A app
     abre automaticamente o ecrã de aprovar/recusar ao receber este evento,
     onde quer que o cliente esteja.
   - `.ServiceExtraWithdrawnEvent` — disparado se o técnico retirar um
     pedido ainda pendente. Payload esperado: `{ "extra": { "id": 1 } }`.

**Questão em aberto — cobrança do valor aprovado:** hoje o cliente só paga
**uma vez**, no checkout, antes do serviço começar
(`POST /customer/services/open/credit-card` ou `/mbway`). **Não existe
nenhum mecanismo de pré-autorização, captura incremental ou segundo
pagamento** — nem na app, nem (tanto quanto foi possível confirmar) no
backend. Um extra aprovado, tal como já documentado no comentário do
`ServiceExtras.tsx` do `app-vendor`, "só entra no valor a receber" — ou
seja, por agora a app cliente trata o total de extras aprovados como um
**valor adicional a acertar** (mostrado ao cliente, não cobrado
automaticamente), e **não tenta cobrar nada sozinha**. Isto precisa de uma
decisão de produto/backend antes de avançar para produção real:
- (a) o valor fica a descoberto e é acertado fora da app (ex.: fatura,
  transferência, o técnico cobra em cash) — não requer nova infraestrutura
  de pagamento, mas é pior experiência; ou
- (b) constrói-se cobrança incremental real (nova rota de captura, ligada
  ao mesmo método de pagamento usado no checkout) — requer desenho e
  implementação novos dos dois lados, ainda por fazer.

Recomenda-se decidir isto **antes** de o backend implementar os pontos 1-3,
para o contrato já sair desenhado com a cobrança em mente.

---

*Documento gerado a 23/07/2026 a partir do trabalho na branch
`feat/build-15-features` da app cliente. Item 9 acrescentado depois, na
mesma branch.*
