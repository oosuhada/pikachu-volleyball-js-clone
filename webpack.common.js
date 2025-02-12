const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: './src/resources/js/main.js',
    ko: './src/ko/ko.js',
  },
  output: {
    filename: '[name].[contenthash:8].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: { name: 'runtime' }, // this is for code-sharing between "main.js" and "ko.js"
    splitChunks: {
      chunks: 'all',
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          context: 'src/',
          from: 'resources/assets/**/*.+(json|png|mp3|wav)',
        },
        { from: 'src/ko/manifest.json', to: 'manifest.json' },
        { from: 'src/resources/style.css', to: 'resources/style.css' },
        { from: 'src/redirect-to-root.html', to: 'ko/index.html' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: 'src/ko/index.html',
      filename: 'index.html',
      assetPrefix: './',
      manifestPath: './manifest.json',
      buildVersion: '1.0.14',
      chunks: [
        'runtime',
        'ko',
        'main',
      ],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
  ],
};
