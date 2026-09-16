const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// O v4 compila o Tailwind pelo Metro a partir de um CSS de entrada, em vez de
// o fazer em tempo de build do Babel como o v2. Sem isto nao ha estilos.
module.exports = withNativeWind(config, { input: './global.css' });
