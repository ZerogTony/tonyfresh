const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  entry: [
    path.join(__dirname, 'app', 'index.js')
  ],
  output: {
    path: path.join(__dirname, 'public'),
    filename: 'test.js'
  },
  resolve: {
    modules: [
      path.join(__dirname, 'app'),
      path.join(__dirname, 'assets'),
      'node_modules'
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      IS_DEVELOPMENT: false
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
}
