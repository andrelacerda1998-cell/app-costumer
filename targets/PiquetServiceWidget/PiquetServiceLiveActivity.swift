import ActivityKit
import SwiftUI
import WidgetKit

/// A cara da Live Activity no ecrã bloqueado e na Dynamic Island.
///
/// A contagem decrescente é feita com Text(timerInterval:) — o iOS tica-a
/// sozinho no ecrã bloqueado, sem a app acordar e sem pushes. Só se envia um
/// endAtEpoch e o sistema conta até lá. É isto que torna o "quanto falta"
/// possível com a app fechada.
///
/// Este ficheiro pertence AO TARGET DA WIDGET EXTENSION (não à app). Precisa
/// também do PiquetServiceAttributes.swift no mesmo target — ver o BUILD doc.
@available(iOS 16.2, *)
struct PiquetServiceLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PiquetServiceAttributes.self) { context in
            // --- Ecrã bloqueado / banner ---
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(Color(red: 0.98, green: 0.73, blue: 0.35)).frame(width: 44, height: 44)
                    Image(systemName: "wrench.and.screwdriver.fill")
                        .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                }
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
                    // timerInterval (e nao style: .timer) para sair "1:27:04" em vez
                    // de "1 hour, 27 minutes" — o formato por extenso quebrava em
                    // varias linhas e transbordava para fora do cartao.
                    // showsHours mantem a hora visivel em servicos longos.
                    Text(timerInterval: Date()...endDate(context), countsDown: true, showsHours: true)
                        .font(.title3).monospacedDigit().bold()
                        .lineLimit(1).minimumScaleFactor(0.7)
                        .multilineTextAlignment(.trailing)
                        .frame(minWidth: 74, alignment: .trailing)
                    // Acima de uma hora o iOS deixa de ticar os segundos e
                    // escreve "1:28:--". Nao ha como o desligar, por isso damos
                    // por baixo a hora de fim: um facto concreto, correto para
                    // toda a duracao e que nao precisa de atualizacao nenhuma
                    // (o widget so e redesenhado quando o estado muda).
                    Text(endsAtLabel(context))
                        .font(.caption2).foregroundStyle(.secondary)
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
                .fixedSize(horizontal: true, vertical: false)
            }
            .padding(16)
            .activityBackgroundTint(Color.black.opacity(0.85))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.attributes.serviceType, systemImage: "wrench.and.screwdriver.fill")
                        .font(.caption).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: Date()...endDate(context), countsDown: true, showsHours: true)
                        .font(.caption).monospacedDigit().lineLimit(1)
                        .frame(minWidth: 68, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.technicianName).font(.caption2).foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "wrench.and.screwdriver.fill")
            } compactTrailing: {
                // 52pt cortava "1:28:--" a meio ("1:2..."). Com showsHours a
                // false um servico de mais de uma hora mostraria minutos acima
                // de 60, que se le pior do que a hora.
                Text(timerInterval: Date()...endDate(context), countsDown: true, showsHours: true)
                    .monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
                    .frame(maxWidth: 72)
            } minimal: {
                Image(systemName: "wrench.and.screwdriver.fill")
            }
        }
    }

    private func endDate(_ context: ActivityViewContext<PiquetServiceAttributes>) -> Date {
        Date(timeIntervalSince1970: context.state.endAtEpoch)
    }

    /// "ate as 12:24" — hora de fim no formato curto da regiao do utilizador.
    private func endsAtLabel(_ context: ActivityViewContext<PiquetServiceAttributes>) -> String {
        let f = DateFormatter()
        f.locale = Locale.current
        f.setLocalizedDateFormatFromTemplate("Hm")
        // Portugues cravado, como o "restante" ja existente no cartao — a
        // widget nao tem (ainda) infraestrutura de traducoes propria.
        return "até às " + f.string(from: endDate(context))
    }
}
