/**
 * Config plugin: desliga a verificação de lint `ExtraTranslation` nas builds de
 * release Android.
 *
 * O `locales` do app.config faz o Expo gerar strings localizadas (appName,
 * NSFaceIDUsageDescription, NSLocationWhenInUseUsageDescription, ...) em
 * `values-b+en`/`values-b+pt` que NÃO existem no locale por omissão
 * (`values/strings.xml`). O check de lint `ExtraTranslation` trata isso como
 * fatal, e a task `:app:lintVitalRelease` aborta a build de release no EAS
 * (erro `EAS_BUILD_UNKNOWN_GRADLE_ERROR`: "Lint found fatal errors while
 * assembling a release target").
 *
 * São strings benignas (a localização das usage descriptions do iOS), por isso
 * ignora-se SÓ este check, mantendo os restantes. Reproduzível a cada
 * `expo prebuild` (o android/ é gerado).
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// withAndroidLintFix";

module.exports = function withAndroidLintFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    const lintBlock = `\n    ${MARKER}\n    lint {\n        disable "ExtraTranslation"\n    }\n`;
    // Injeta logo a seguir à abertura do primeiro bloco `android {`.
    contents = contents.replace(/android\s*\{/, (match) => match + lintBlock);

    cfg.modResults.contents = contents;
    return cfg;
  });
};
