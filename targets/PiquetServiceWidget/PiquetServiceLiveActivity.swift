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
                        .font(.headline).lineLimit(1)
                    Text(context.attributes.technicianName)
                        .font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(endDate(context), style: .timer)
                        .font(.title2).monospacedDigit().multilineTextAlignment(.trailing)
                        .frame(maxWidth: 78)
                    Text("restante").font(.caption2).foregroundStyle(.secondary)
                }
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
                    Text(endDate(context), style: .timer)
                        .font(.caption).monospacedDigit().frame(maxWidth: 64)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.technicianName).font(.caption2).foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "wrench.and.screwdriver.fill")
            } compactTrailing: {
                Text(endDate(context), style: .timer).monospacedDigit().frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "wrench.and.screwdriver.fill")
            }
        }
    }

    private func endDate(_ context: ActivityViewContext<PiquetServiceAttributes>) -> Date {
        Date(timeIntervalSince1970: context.state.endAtEpoch)
    }
}
