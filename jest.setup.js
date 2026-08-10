// AsyncStorage é um módulo nativo: em Jest não existe binding e qualquer import
// rebenta. Mock oficial do próprio pacote — mantém a API real, guarda em memória.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
