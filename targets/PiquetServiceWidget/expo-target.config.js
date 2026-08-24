/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "PiquetServiceWidget",
  // A extensão desenha a Live Activity — precisa do frameworks de ActivityKit/SwiftUI.
  frameworks: ["SwiftUI", "ActivityKit", "WidgetKit"],
  // iOS 16.2 é o mínimo das Live Activities com ContentState atualizável.
  deploymentTarget: "16.2",
};
