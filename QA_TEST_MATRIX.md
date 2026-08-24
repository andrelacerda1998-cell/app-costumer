# Matriz de testes — App Cliente Piquet

Plano de testes derivado da auditoria de 2026-08-03. Cobre os caminhos principais **e**
alternativos de cada área. O estado reflete o que foi efetivamente observado:

- **Aprovado** — executado e correto.
- **Falhou** — executado, defeito reproduzido.
- **Bloqueado** — não foi possível executar (ver motivo).
- **Não testável** — exige backend/dispositivo/conta que não estavam disponíveis nesta auditoria.
- **Análise estática** — verificado por leitura de código, sem execução (a maioria: ver limitações no relatório principal).

> Ambiente: iPhone 17 Pro Max · iOS 26.4 (simulador) · build de desenvolvimento · Metro :8082 ·
> backend de **produção** (`app.piquetapp.com`) · sessão de **convidado**.

---

## A. Testes EXECUTADOS ao vivo (evidência em simulador)

| ID | Área | Fluxo | Cenário | Resultado esperado | Resultado observado | Estado | Sev. | Prio. |
|---|---|---|---|---|---|---|---|---|
| E-01 | Arranque | Cold start | Abrir a app de raiz | Home em <3 s | Splash âmbar fixo ~3,65 s antes de qualquer conteúdo | Falhou | Médio | P1 |
| E-02 | Navegação | Deep link inválido | `piquet.customer:///rota/que/nao/existe` | Ecrã 404 da marca, em PT | Ecrã cru do Expo Router, **em inglês**, com link **Sitemap** (expõe estrutura de rotas) | Falhou | Alto | P1 |
| E-03 | Serviço | Deep link p/ serviço inexistente | `.../overview/999999` | "Não encontrámos este serviço" + saída | **"A carregar…" infinito**, sem timeout nem erro | Falhou | Alto | P1 |
| E-04 | Rede | API inalcançável — Home | Aviso de falta de ligação | Home **idêntica ao normal**, categorias da cache, zero aviso | Falhou | Alto | P1 |
| E-05 | Rede | API inalcançável — categoria | Erro claro + "Tentar novamente" | **Duas mensagens contraditórias**: "Não há serviços nesta área" **e** "Ocorreu um erro" | Falhou | Alto | P1 |
| E-06 | A11y | Texto XXXL — Home | Layout adapta-se | "Agendamentos" quebra 1 letra/linha; **grelha de categorias sai do ecrã**; pesquisa cortada | Falhou | **Crítico** | P0 |
| E-07 | A11y | Texto XXXL — Perfil | Rótulos legíveis | Todos truncados: "O meu p…", "Pagam…", "Dados d…" | Falhou | Alto | P1 |
| E-08 | Segurança | Enumeração de tickets | Acesso negado sem auth | **Ticket lido da internet pública sem credenciais** (`?ids=TK-…`) | Falhou | **Crítico** | P0 |
| E-09 | Navegação | Barra de separadores | Rótulos visíveis e legíveis | Rótulos cortados em baixo (safe area ignorada); 4 dos 5 sem rótulo | Falhou | Médio | P1 |
| E-10 | Home | Modo convidado | Conteúdo relevante | "Agendamentos · 0 serviços" em destaque a quem nunca reservou | Falhou | Baixo | P2 |
| E-11 | Arranque | App instalada + Metro :8081 | App carrega | Presa no splash (binário aponta :8082) — **só afeta dev** | Falhou | Baixo | P3 |
| E-12 | Tema | Tema escuro | — | App é light-only (suporte comentado) — decisão de design, não defeito | N/A | — | — |

---

## B. Cenários por tipo de utilizador e estado

| ID | Área | Fluxo | Cenário | Resultado esperado | Estado | Achado |
|---|---|---|---|---|---|---|
| U-01 | Auth | Novo utilizador | Onboarding → registo → 1.ª reserva | Fluxo completo sem bloqueios | Análise estática | AUTH-* |
| U-02 | Auth | Utilizador registado | Login email/password com password errada | Mensagem "Email ou palavra-passe incorretos" | **Falhou** (análise) | AUTH-03 |
| U-03 | Auth | Sessão expirada | Reabrir app após expirar o token | Refresh silencioso | **Falhou** (análise) | AUTH-01 |
| U-04 | Auth | Perfil incompleto | Reservar sem perfil completo | Pedido de dados no momento certo | Análise estática | — |
| U-05 | Auth | Convidado | Navegar e reservar sem conta | Fluxo guest completo | Análise estática | AUTH-02 |
| U-06 | Auth | Login por OTP → eliminar conta | Conseguir eliminar a conta | **Bloqueado**: exige palavra-passe que nunca definiu | **Falhou** (análise) | AUTH-07 |
| U-07 | Rede | Sem internet | Qualquer ecrã | Aviso claro de falta de ligação | **Falhou** (executado) | E-04/E-05 |
| U-08 | Rede | Internet lenta | Timeout e retry | Feedback + repetição | Análise estática | PERF-* |
| U-09 | API | Erro 500 | Mensagem útil | Diálogo de erro | Análise estática | D2-02 |
| U-10 | Input | Dados inválidos | Validação de campos | Erro por campo | Análise estática | PROF-* |
| U-11 | Input | Cliques rápidos / duplo toque | Pagar 2× rapidamente | Bloqueio de duplo pagamento | **Risco** (análise) | PAY-02 |
| U-12 | Sessão | Abandonar e voltar ao fluxo | Rascunho preservado | Rascunho reidratado (implementado) | Análise estática | — |
| U-13 | Sistema | App em segundo plano | Voltar a 1.º plano | Estado sincronizado | Análise estática | PERF-* |
| U-14 | Sistema | App morta durante pagamento | Reconciliação do pagamento | Polling reconcilia | Análise estática | PAY-03 |
| U-15 | Permissões | Localização negada | Alternativa manual | Continua a funcionar | Análise estática | D2-03 |
| U-16 | Permissões | Notificações negadas | App funcional | Sem bloqueio | Análise estática | NOTIF-* |
| U-17 | A11y | Texto aumentado | Layout adapta | **Falhou** (executado) | E-06/E-07 |
| U-18 | Ecrã | Ecrã pequeno (SE) | Sem cortes | **Não testável** (só iPhone 17 Pro Max) | — | — |
| U-19 | Input | Teclado aberto | Campos visíveis | Análise estática (KeyboardAwareScrollView presente) | — |
| U-20 | Tempo real | Perda de rede durante serviço | Reconexão + eventos | **Risco alto** (análise) | RT-01 |

---

## C. Cobertura por fluxo

| Fluxo | Ecrãs | Executado | Análise estática | Não testável |
|---|---|---|---|---|
| Splash / onboarding | 3 | ✅ parcial | ✅ | — |
| Registo / login / OTP | 6 | — | ✅ | conta de teste |
| Recuperar palavra-passe | 2 | — | ✅ | email real |
| Home / descoberta / pesquisa | 5 | ✅ | ✅ | — |
| Pedido imediato (funil) | 8 | ✅ parcial | ✅ | conta + pagamento |
| Agendamento | 3 | — | ✅ | conta |
| Cesto / checkout / pagamento | 11 | — | ✅ | **cartão real / MB Way** |
| Serviço em curso / chat / mapa | 10 | — | ✅ | serviço ativo real |
| Avaliação e histórico | 4 | — | ✅ | serviço concluído |
| Perfil / conta / definições | 12 | ✅ parcial | ✅ | conta |
| Notificações push | 2 | — | ✅ | **dispositivo físico** |
| Suporte | 1 | ✅ (segurança) | ✅ | — |

**Total:** 57 ecrãs · 12 executados ao vivo · 57 cobertos por análise estática.
