// AsyncStorage é um módulo nativo: em Jest não existe binding e qualquer import
// rebenta. Mock oficial do próprio pacote — mantém a API real, guarda em memória.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A implementação está em __mocks__/@expo/vector-icons.js — ver lá porquê.
jest.mock('@expo/vector-icons');

// A lingua dos testes nao pode depender da maquina de quem os corre.
//
// O `translation/index.ts` escolhe pt_PT ou en_US a partir do
// `Localization.getLocales()`. O expo-localization 16 devolvia vazio em Jest e
// caia no `?? 'pt'`; o 17 passou a devolver o locale do sistema, e numa maquina
// em ingles os testes que afirmam copy portuguesa passavam a receber ingles.
//
// No dispositivo nada disto muda: la o getLocales() le mesmo as definicoes do
// telefone, como sempre leu.
jest.mock('expo-localization', () => ({
  getLocales: () => [
    { languageCode: 'pt', languageTag: 'pt-PT', regionCode: 'PT', textDirection: 'ltr' },
  ],
  getCalendars: () => [{ calendar: 'gregory', timeZone: 'Europe/Lisbon', uses24hourClock: true }],
}));
