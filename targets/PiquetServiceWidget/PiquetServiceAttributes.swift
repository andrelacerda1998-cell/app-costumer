import ActivityKit
import Foundation

/// Contrato da Live Activity do serviço em curso.
///
/// PARTILHADO entre o módulo (que arranca/atualiza a atividade) e a Widget
/// Extension (que a desenha). Tem de estar no target da app E no da extensão —
/// ver o BUILD_LIVE_ACTIVITY.md.
///
/// Divisão deliberada:
///  - atributos ESTÁTICOS (técnico, serviço) não mudam durante a execução;
///  - o estado DINÂMICO leva só o instante de fim. O widget conta sozinho até
///    lá com Text(timerInterval:), por isso não é preciso empurrar atualizações
///    a cada segundo — o iOS trata da contagem no ecrã bloqueado.
@available(iOS 16.2, *)
struct PiquetServiceAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Fim estimado, em epoch (segundos). O widget desenha a contagem até aqui.
        var endAtEpoch: Double
    }

    var technicianName: String
    var serviceType: String
}
