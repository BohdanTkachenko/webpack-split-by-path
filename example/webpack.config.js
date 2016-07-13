var path = require('path');
var webpack = require('webpack');
var SplitByPathPlugin = require('../');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'js/app.js'),
    test: path.resolve(__dirname, 'js/test.js'),
    polyfills: path.resolve(__dirname, 'js/polyfills.js')
  },
  output: {
    path: path.join(__dirname, 'dist'),
    pathinfo: true,
    filename: '[name].js',
    chunkFilename: '[name].js'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 1,
      chunks: ['vendor', 'polyfills']
    }),

    new SplitByPathPlugin([
      {
        name: 'vendor',
        path: path.resolve(__dirname, '..', 'node_modules')
      },
      {
        name: 'styles',
        path: path.resolve(__dirname, 'css')
      }
    ], {
      ignoreChunks: ['common', 'polyfills']
    })
  ],
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' }
    ]
  }
};
