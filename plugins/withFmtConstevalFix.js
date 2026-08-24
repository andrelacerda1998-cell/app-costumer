const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Contorna a incompatibilidade fmt + Clang do Xcode 26.
 *
 * O `fmt` (dependência do React Native) marca as suas format-strings como
 * `consteval`; o Clang do Xcode 26 rejeita-as com "call to consteval function
 * ... is not a constant expression" e o build da APP INTEIRA falha — nada a ver
 * com código nosso. Desliga-se FMT_USE_CONSTEVAL, que faz o fmt cair para
 * `constexpr` (o próprio fmt tem esse caminho para compiladores sem consteval).
 *
 * Vive num plugin e não numa edição a ios/Pods porque ios/ é gerado e ignorado
 * pelo git: uma edição à mão perde-se no prebuild seguinte.
 *
 * REMOVER quando o Expo SDK trouxer um fmt compatível com o Xcode 26.
 */
const withFmtConstevalFix = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      const marker = "# fmt/consteval fix (Xcode 26)";
      if (!contents.includes(marker)) {
        const patch = `
    ${marker}
    fmt_base = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      src = File.read(fmt_base)
      unless src.include?('PIQUET_FMT_NO_CONSTEVAL')
        src = src.sub("#if FMT_USE_CONSTEVAL\\n", "#define PIQUET_FMT_NO_CONSTEVAL 1\\n#undef FMT_USE_CONSTEVAL\\n#define FMT_USE_CONSTEVAL 0\\n#if FMT_USE_CONSTEVAL\\n")
        File.write(fmt_base, src)
      end
    end
`;
        contents = contents.replace(
          "  post_install do |installer|\n",
          `  post_install do |installer|\n${patch}`
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);

module.exports = withFmtConstevalFix;
