const path = require('path')
const { merge } = require('webpack-merge')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const config = require('./webpack.config')

module.exports = merge(config, {
  mode: 'production',

  output: {
    path: path.join(__dirname, 'public'),
    publicPath: '/'
  },

  devtool: false,

  plugins: [
    // Bundle analyzer - generates visual report of bundle composition
    // Usage: npm run build:analyze
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'static' : 'disabled',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    })
  ]
})
