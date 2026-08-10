// AsyncStorage é um módulo nativo: em Jest não existe binding e qualquer import
// rebenta. Mock oficial do próprio pacote — mantém a API real, guarda em memória.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// @expo/vector-icons carrega tipos de letra nativos no construtor e rebenta em
// Jest ("loadedNativeFonts.forEach is not a function"). Cada família de ícones
// passa a ser um <Text>, o suficiente para testar conteúdo e acessibilidade.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = (props) => React.createElement(Text, props, null);
  return new Proxy({}, { get: () => Icon });
});
