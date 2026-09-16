import ActivityKit
import ExpoModulesCore

/// Ponte ActivityKit <-> JS. Métodos correspondem a modules/live-activity/index.ts.
///
/// Uma atividade de cada vez: guarda-se a referência para poder atualizar/terminar
/// a que está no ar. Arrancar uma segunda sem terminar a primeira deixaria duas
/// no ecrã bloqueado a dizer o mesmo.
public class LiveActivityModule: Module {
    private var currentActivityId: String?

    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

        Function("isSupported") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        Function("start") { (technicianName: String, serviceType: String, endAtMs: Double) in
            guard #available(iOS 16.2, *) else { return }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

            // Já há uma no ar (ex.: serviço anterior mal terminado) — encerra antes.
            self.endInternal()

            let attributes = PiquetServiceAttributes(
                technicianName: technicianName,
                serviceType: serviceType
            )
            let state = PiquetServiceAttributes.ContentState(endAtEpoch: endAtMs / 1000.0)

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil)
                )
                self.currentActivityId = activity.id
            } catch {
                // Falhar a arrancar não pode derrubar nada do lado de JS.
            }
        }

        Function("update") { (endAtMs: Double) in
            guard #available(iOS 16.2, *) else { return }
            let state = PiquetServiceAttributes.ContentState(endAtEpoch: endAtMs / 1000.0)
            Task {
                for activity in Activity<PiquetServiceAttributes>.activities
                where activity.id == self.currentActivityId {
                    await activity.update(.init(state: state, staleDate: nil))
                }
            }
        }

        Function("end") {
            guard #available(iOS 16.2, *) else { return }
            self.endInternal()
        }
    }

    @available(iOS 16.2, *)
    private func endInternal() {
        let id = self.currentActivityId
        self.currentActivityId = nil
        Task {
            for activity in Activity<PiquetServiceAttributes>.activities where id == nil || activity.id == id {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
