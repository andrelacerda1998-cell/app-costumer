import ActivityKit
import SwiftUI
import WidgetKit

/// A cara da Live Activity no ecrã bloqueado e na Dynamic Island.
///
/// MOSTRA A HORA DE FIM, NÃO UMA CONTAGEM.
///
/// Havia aqui um `Text(timerInterval:)` a contar para trás. Parecia a escolha
/// óbvia — o iOS tica-o sozinho, sem a app acordar — mas acima de uma hora o
/// sistema deixa de ticar os segundos e escreve "59:--", que se lê como um
/// contador avariado. E mesmo abaixo da hora, um número a descer é uma pergunta
/// ("quanto falta?") quando o que a pessoa quer saber é um facto ("a que horas
/// acaba?"). A hora de fim responde à segunda, não muda, e não precisa de
/// atualização nenhuma.
///
/// Este ficheiro pertence AO TARGET DA WIDGET EXTENSION (não à app). Precisa
/// também do PiquetServiceAttributes.swift no mesmo target — ver o BUILD doc.
@available(iOS 16.2, *)
struct PiquetServiceLiveActivity: Widget {
    /// Âmbar da marca (#FAB35B).
    private static let amber = Color(red: 0.98, green: 0.70, blue: 0.36)
    /// Escuro da marca (#1B1B1B).
    private static let ink = Color(red: 0.106, green: 0.106, blue: 0.106)

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PiquetServiceAttributes.self) { context in
            // --- Ecrã bloqueado / banner ---
            HStack(spacing: 14) {
                wordmarkBadge

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.serviceType)
                        .font(.headline).lineLimit(1).minimumScaleFactor(0.85)
                    Text(context.attributes.technicianName)
                        .font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                }
                // Prioridade ao texto: sem isto o SwiftUI reparte a largura em
                // partes iguais e o nome do servico saia cortado
                // ("Desentupiment...") mesmo com espaco livre a direita.
                .layoutPriority(1)

                Spacer(minLength: 6)

                VStack(alignment: .trailing, spacing: 1) {
                    Text("Termina às")
                        .font(.caption2).foregroundStyle(.secondary)
                        .lineLimit(1).minimumScaleFactor(0.8)
                    Text(endsAtClock(context))
                        .font(.title3).monospacedDigit().bold()
                        .lineLimit(1).minimumScaleFactor(0.7)
                }
                // Largura FIXA e nao dimensionamento automatico: sem ela esta
                // coluna reclamava toda a largura disponivel e o titulo era
                // esmagado ate desaparecer do cartao.
                .frame(width: 96, alignment: .trailing)
            }
            .padding(16)
            .activityBackgroundTint(Color.black.opacity(0.85))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        wordmarkGlyph(height: 12)
                        Text(context.attributes.serviceType)
                            .font(.caption).lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(endsAtClock(context))
                        .font(.caption).monospacedDigit().bold().lineLimit(1)
                        .frame(minWidth: 56, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.technicianName)
                        .font(.caption2).foregroundStyle(.secondary)
                }
            } compactLeading: {
                wordmarkGlyph(height: 11)
            } compactTrailing: {
                // "13h14" cabe onde "1:28:--" nao cabia, e nao muda ao segundo.
                Text(endsAtClock(context))
                    .monospacedDigit().lineLimit(1).minimumScaleFactor(0.8)
                    .frame(maxWidth: 58)
            } minimal: {
                wordmarkGlyph(height: 10)
            }
        }
    }

    /// O logotipo em circulo ambar — a mesma marca do icone da app.
    private var wordmarkBadge: some View {
        ZStack {
            Circle().fill(Self.amber).frame(width: 44, height: 44)
            Image("PiquetWordmark")
                .renderingMode(.template)
                .resizable().scaledToFit()
                .foregroundColor(Self.ink)
                // O logotipo e 3,9x mais largo do que alto: dentro de um
                // circulo de 44 tem de caber pela LARGURA, senao as pontas
                // ("P" e "T") saem fora.
                .frame(width: 32)
        }
    }

    /// O logotipo sozinho, para os espacos apertados da Dynamic Island.
    private func wordmarkGlyph(height: CGFloat) -> some View {
        Image("PiquetWordmark")
            .renderingMode(.template)
            .resizable().scaledToFit()
            .frame(height: height)
            .foregroundColor(Self.amber)
    }

    private func endDate(_ context: ActivityViewContext<PiquetServiceAttributes>) -> Date {
        Date(timeIntervalSince1970: context.state.endAtEpoch)
    }

    /// "13h14" — o formato que se diz em voz alta em Portugal.
    ///
    /// Nao se usa o DateFormatter da regiao: o template "Hm" daria "13:14", e
    /// os dois pontos leem-se como um contador (era exactamente o que este
    /// cartao tinha antes). O "h" no meio diz, sem margem para duvida, que
    /// aquilo e uma hora do dia.
    private func endsAtClock(_ context: ActivityViewContext<PiquetServiceAttributes>) -> String {
        let cal = Calendar.current
        let parts = cal.dateComponents([.hour, .minute], from: endDate(context))
        return String(format: "%02dh%02d", parts.hour ?? 0, parts.minute ?? 0)
    }
}
