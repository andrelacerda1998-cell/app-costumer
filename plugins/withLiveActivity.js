const { withInfoPlist } = require("@expo/config-plugins");

/**
 * Liga as Live Activities no Info.plist da app.
 *
 * ÂMBITO deste plugin, de propósito: só a flag NSSupportsLiveActivities, que é
 * a parte segura e idempotente. A Widget Extension (o target que desenha a
 * atividade) NÃO é criada aqui — gerar um target de Xcode por manipulação do
 * pbxproj é frágil e não foi validado. Ver BUILD_LIVE_ACTIVITY.md para o passo
 * de criar a extensão (via Xcode ou @bacons/apple-targets) e mover os .swift.
 *
 * Sem a extensão, a flag sozinha não faz mal: o módulo nativo reporta
 * isSupported()=false até a extensão existir, e o lado JS fica em no-op.
 */
const withLiveActivity = (config) => {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    return cfg;
  });
};

module.exports = withLiveActivity;
