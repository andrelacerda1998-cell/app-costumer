import SwiftUI
import WidgetKit

/// Ponto de entrada da Widget Extension. Só a Live Activity vive aqui — não há
/// widgets de ecrã inicial neste target.
@main
struct PiquetServiceWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            PiquetServiceLiveActivity()
        }
    }
}
