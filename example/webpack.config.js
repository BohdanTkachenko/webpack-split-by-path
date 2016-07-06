var path = require('path');
var SplitByPathPlugin = require('../');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'js/app.js'),
    test: path.resolve(__dirname, 'js/test.js')
  },
  output: {
    path: path.join(__dirname, 'dist'),
    pathinfo: true,
    filename: '[name].js',
    chunkFilename: '[name].js'
  },
  plugins: [
    new SplitByPathPlugin([
      {
        name: 'vendor',
        path: path.resolve(__dirname, '..', 'node_modules')
      },
      {
        name: 'styles',
        path: path.resolve(__dirname, 'css')
      }
    ])
  ],
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' }
    ]
  }
};
