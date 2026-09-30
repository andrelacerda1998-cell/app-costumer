# Regras de tradução da Piquet para ALEMÃO

A Piquet é um mercado português de serviços ao domicílio. A app é usada **em
Portugal**, por clientes que podem não falar português. O país não muda: as
moradas, o NIF e os códigos postais continuam a ser portugueses.

## Voz — a decisão mais importante

O português da Piquet trata por **tu** ("Precisas de ajuda?", "Sabes onde está
o teu técnico"). Em francês e espanhol isso passou a *tu* / *tú*.

**Em alemão usa-se "du", não "Sie".**

Não é automático e merece explicação: o alemão de serviços tradicional usaria
*Sie*. Mas a Piquet é uma app de consumo, o registo dela é informal em todos os
outros idiomas, e apps do mesmo tipo no mercado alemão (entrega, transporte,
serviços ao domicílio) tratam por *du*. Trocar para *Sie* só em alemão faria da
app uma pessoa diferente consoante o idioma.

Consequências a respeitar em todo o lado:
- **du / dich / dir / dein**, nunca *Sie / Ihnen / Ihr*
- imperativo na 2.ª pessoa do singular: *"Gib deine Adresse ein"*, não
  *"Geben Sie Ihre Adresse ein"*
- **"du" minúsculo** no meio da frase (ortografia pós-1996; maiúsculo só em
  cartas formais)

Frases curtas e directas. Dizer o que acontece a seguir, não descrever o
sistema. Nada de "Bitte" a mais nem de exclamações.

## Termos fixos

| português | alemão | porquê |
|---|---|---|
| técnico / profissional | Fachkraft (ou "Profi" onde o espaço aperta) | *Techniker* soa a técnico de equipamento |
| serviço (a **intervenção**) | Auftrag | o trabalho concreto que foi pedido |
| serviço (o **item de catálogo**) | Leistung | *"Aufträge ansehen"* num botão que abre o catálogo lê-se como "ver as minhas encomendas" |
| cancelar | stornieren | **nunca** *abbrechen*: o botão de dispensar de um diálogo alemão chama-se sempre `Abbrechen`, e *"Anfrage abbrechen?"* ao lado dele confunde |
| zona / área | Zone | "zona" é conceito do negócio Piquet (as zonas de serviço do backoffice), não geografia vaga |
| chuveiro | Duschkopf | *Brause* é a palavra do instalador; o cliente diz Duschkopf |
| sanita | WC | mais curto que *Toilette* e cabe nos títulos |
| pedido | Anfrage | |
| agendamento / marcação | Termin | |
| cesto | Warenkorb | |
| morada | Adresse | |
| saldo | Guthaben | |
| cupão | Gutscheincode | |
| avaliação (estrelas) | Bewertung | |
| entrar / iniciar sessão | anmelden | |
| terminar sessão | abmelden | |
| Piquet | Piquet | nunca traduzir |

## Regras duras

1. **Os marcadores `{{...}}` ficam iguais**, na forma exacta: `{{count}}`,
   `{{address}}`, `{{hours}}`. Traduzir o texto à volta, nunca o marcador.
   Um marcador alterado parte o ecrã.
2. **Não inventar chaves nem apagar nenhuma.** A saída tem exactamente as
   mesmas chaves da entrada.
3. **Manter a pontuação de interface**: reticências de espera ("A carregar...")
   ficam reticências.
4. **Textos terminados em `_one` / `_other`** são plurais do i18next: traduzir
   cada um com a forma correcta.
5. **Não traduzir**: NIF, MB Way, Apple Pay, Google Pay, Piquet, e placeholders
   de exemplo como `Password12345@` ou `+351 919919919`.
6. **Coisas portuguesas ficam portuguesas**: o formato do código postal
   (`1234-567`), o NIF (explicar entre parênteses na primeira ocorrência —
   *"NIF (portugiesische Steuernummer)"*), "Distrito" como divisão
   administrativa portuguesa.
7. **Chaves `*_a11y`** são para leitores de ecrã: frase completa e natural,
   não uma etiqueta telegráfica.
8. **Substantivos com maiúscula**, como manda o alemão. Erro comum em
   tradução automática: deixar minúsculas por arrastamento do inglês.
9. **Comprimento**: o alemão é tipicamente 10–30% mais longo que o português.
   Em títulos de botão e cartão, preferir a forma curta — *"Jetzt anfragen"*
   e não *"Jetzt eine Anfrage stellen"*. Um botão truncado é pior que uma
   palavra menos elegante. (Aconteceu hoje com o francês.)
10. **Convenções fixadas** (decididas pelo André, 29/09):
    - **percentagem sem espaço**: `25%`, não `25 %`. A norma Duden pede o
      espaço, mas quebra a linha entre o número e o sinal num selo estreito.
    - **milhares com ponto**: `+5.000`, à alemã.
    - **assinatura dos emails**: `"Viele Grüße, dein Piquet-Team"`. Com
      tratamento por *du*, `"das Team"` é frio e destoa.
    - **placeholders de email**: `email@beispiel.com`, não `exemplo.com`.
      A regra 5 protege `Password12345@` e o `+351 919919919`; um domínio de
      exemplo é outra coisa e deve soar nativo.
    - **NIF**: a glosa *"Portugiesische Steuernummer"* vive no **placeholder**,
      onde há espaço. As etiquetas ficam só `NIF` (32 caracteres quebravam
      em duas linhas) e as mensagens de erro não a repetem.

11. **A coerência de termo não vale uma palavra errada.** `Toilettenpapierhalter`
    ficou assim mesmo havendo 38 `WC` no catálogo: `WC-Papierhalter` existe mas
    soa a catálogo de armazém, e é pela outra que o cliente procura.

12. **Compostos**: o alemão junta palavras. *"Terminvereinbarung"* em vez de
    *"Vereinbarung eines Termins"* — mas não criar monstros de 30 letras num
    espaço apertado.
