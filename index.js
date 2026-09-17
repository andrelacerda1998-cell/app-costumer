/**
 * Entrada do Expo Router.
 *
 * O `main` do package.json aponta directamente para `expo-router/entry`, por
 * isso este ficheiro NAO e carregado hoje. Fica correcto na mesma: veio do
 * template antigo a fazer `import App from './App'` — um ficheiro que nao
 * existe neste projecto, porque com o Expo Router o encaminhamento nasce da
 * pasta `app/` e nao de um componente raiz.
 *
 * Nao partia nada (nunca corre), mas partia a quem mexesse no arranque: mudar
 * o `main` para aqui dava um erro de import a apontar para um ficheiro
 * inexistente, no primeiro sitio onde ninguem quer procurar.
 */
import 'expo-router/entry';
