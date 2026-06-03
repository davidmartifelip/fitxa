module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@db': './src/db',
            '@hooks': './src/hooks',
            '@screens': './src/screens',
            '@components': './src/components',
            '@services': './src/services',
            '@utils': './src/utils',
          },
        },
      ],
    ],
  };
};
