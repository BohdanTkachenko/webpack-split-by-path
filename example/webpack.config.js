var path = require('path');
var SplitByPathPlugin = require('../');

module.exports = {
  entry: {
    app: './example/js/app'
  },
  output: {
    path: path.join(__dirname, 'dist'),
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
