// @expo/vector-icons carrega tipos de letra nativos no construtor e rebenta em
// Jest ("loadedNativeFonts.forEach is not a function"). Cada família de ícones
// passa a ser um <Text>, o suficiente para testar conteúdo e acessibilidade.
//
// Vive aqui, e não numa fábrica de `jest.mock()` no jest.setup.js, porque o
// preset do NativeWind v4 transforma o `require('react-native')` de dentro da
// fábrica e passa a referir um ajudante do escopo do módulo
// (`_ReactNativeCSSInterop`). O Jest proíbe fábricas que toquem em variáveis de
// fora do seu escopo, e rejeitava a suite inteira. Num ficheiro de mock manual
// essa regra não se aplica.
const React = require('react');
const { Text } = require('react-native');

const Icon = (props) => React.createElement(Text, props, null);

module.exports = new Proxy({}, { get: () => Icon });
