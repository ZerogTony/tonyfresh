const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CnameWebpackPlugin = require('cname-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HTMLInlineCSSWebpackPlugin = require('html-inline-css-webpack-plugin').default

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev'

const dirApp = path.join(__dirname, 'app')
const dirAssets = path.join(__dirname, 'assets')
const dirStyles = path.join(__dirname, 'styles')
const dirNode = 'node_modules'

const folders = [
  'index.html',
  'about/index.html',
  'case/popeyes/index.html',
  'case/spotify/index.html',
  'case/boxpark/index.html',
  'case/turning-tide/index.html',
  'case/floema/index.html',
  'case/idris-elba/index.html',
  'case/stoli/index.html',
  'case/ocb/index.html',
  'case/trolli/index.html',
  'case/jack-daniels/index.html',
  'case/studio-maertens/index.html',
  'case/inbound/index.html',
  'case/redis/index.html',
  'case/kaleidoz/index.html',
  'case/erika-moreira/index.html',
  'case/bruno-arizio/index.html',
  'case/dominic-berzins/index.html',
  'case/pagethink/index.html',
  'case/neoway/index.html',
  'case/cult/index.html',
  'case/movida/index.html',
  'case/lufthansa-2/index.html',
  'case/tiaa/index.html',
  'case/lufthansa-1/index.html',
  'case/shell/index.html',
  'case/corvette/index.html',
  'case/nike/index.html',
  'case/airbnb/index.html',
  'case/discovery-kids/index.html',
  'case/rock-in-rio/index.html'
]

const mapFolders = folders.map(filename => {
  return new HtmlWebpackPlugin({
    filename,
    template: path.join(__dirname, 'index.pug')
  })
})

module.exports = {
  entry: [
    path.join(dirApp, 'index.js'),
    path.join(dirStyles, 'index.scss')
  ],

  output: {
    filename: '[name].[contenthash].js',
    clean: true
  },

  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    modules: [
      dirApp,
      dirAssets,
      dirNode
    ]
  },

  plugins: [
    // CleanWebpackPlugin removed - was causing build output to be deleted

    new webpack.DefinePlugin({
      IS_DEVELOPMENT: JSON.stringify(IS_DEVELOPMENT)
    }),

    ...mapFolders,

    new CnameWebpackPlugin({
      domain: 'bizar.ro'
    }),

    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'app', 'service-worker.js'),
          to: path.resolve(__dirname, 'public')
        },
        {
          from: path.resolve(__dirname, 'offline'),
          to: path.resolve(__dirname, 'public', 'offline')
        },
        {
          from: path.resolve(__dirname, 'shared'),
          to: path.resolve(__dirname, 'public')
        }
      ]
    }),

    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css'
    }),

    new HTMLInlineCSSWebpackPlugin()
  ],

  module: {
    rules: [
      {
        test: /\.pug$/,
        use: ['pug-loader']
      },

      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'babel-loader'
        }
      },

      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: IS_DEVELOPMENT,
              importLoaders: 2
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: IS_DEVELOPMENT,
              postcssOptions: {
                plugins: [
                  ['autoprefixer']
                ]
              }
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: IS_DEVELOPMENT,
              sassOptions: {
                silenceDeprecations: [
                  'legacy-js-api',
                  'import',
                  'division',
                  'global-builtin'
                ]
              }
            }
          }
        ]
      },

      {
        test: /\.(jpe?g|png|gif|svg|fnt|webp)$/,
        loader: 'file-loader',
        options: {
          name () {
            return '[hash].[ext]'
          },
          esModule: false
        }
      },

      {
        test: /\.(woff2?|ttf)$/,
        loader: 'file-loader',
        options: {
          name () {
            return '[name].[ext]'
          },
          esModule: false
        }
      },

      {
        test: /\.(glsl|frag|vert)$/,
        loader: 'raw-loader',
        exclude: /node_modules/
      },

      {
        test: /\.(glsl|frag|vert)$/,
        loader: 'glslify-loader',
        exclude: /node_modules/
      }
    ]
  }
}
