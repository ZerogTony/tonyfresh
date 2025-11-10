const path = require('path')
const { merge } = require('webpack-merge')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const config = require('./webpack.config')

const shouldAnalyze = process.env.ANALYZE === 'true'

module.exports = merge(config, {
  mode: 'production',

  output: {
    path: path.join(__dirname, 'public'),
    publicPath: '/'
  },

  devtool: false,

  plugins: shouldAnalyze
    ? [
        // Analyzer only runs when ANALYZE=true to avoid generating bundle-stats during normal builds
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: 'bundle-report.html',
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: 'bundle-stats.json'
        })
      ]
    : []
})
