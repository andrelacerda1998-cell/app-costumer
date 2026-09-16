module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v4 deixou de ser um plugin e passou a duas coisas: o
    // `jsxImportSource` reescreve o JSX para o runtime dele (e o que faz o
    // `className` chegar aos componentes) e o preset trata do resto.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
