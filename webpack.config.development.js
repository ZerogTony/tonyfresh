const path = require('path')
const { merge } = require('webpack-merge')

const config = require('./webpack.config')

module.exports = merge(config, {
  mode: 'development',

  devtool: 'inline-source-map',

  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public')
    },
    historyApiFallback: true,
    hot: true,
    devMiddleware: {
      writeToDisk: true
    },
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },

  output: {
    path: path.resolve(__dirname, 'public')
  }
})
