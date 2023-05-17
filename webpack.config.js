/* eslint-disable @typescript-eslint/naming-convention */
// @ts-check

'use strict'

const path = require('path')
const webpack = require('webpack')

/** @returns {import('webpack').Configuration} */
const createConfig = (/** @type {{ browser?: boolean; }} */ env) => ({
  // Leaves the source code as close as possible to the original
  // (when packaging we set this to 'production')
  mode: 'none',

  // vscode extensions run in a Node.js-context
  // => https://webpack.js.org/configuration/node/
  target: env.browser ? 'webworker' : 'node',

  // => https://webpack.js.org/configuration/entry-context/
  entry: './src/extension.ts',

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: env.browser ? 'extension-browser.js' : 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },

  devtool: 'source-map',

  externals: {
    // The vscode-module is created on-the-fly and must be excluded.
    // Add other modules that cannot be webpack'ed.
    // => https://webpack.js.org/configuration/externals/
    vscode: 'commonjs vscode'
  },

  resolve: {
    mainFields: ['browser', 'module', 'main'],
    // Support reading TypeScript and JavaScript files
    // => https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    fallback: env.browser
      ? {
          assert: false,
          buffer: false,
          child_process: false,
          constants: false,
          console: false,
          crypto: require.resolve('crypto-browserify'),
          fs: false,
          glob: false,
          http: require.resolve('stream-http'),
          https: false,
          os: false,
          path: require.resolve('path-browserify'),
          stream: false,
          unxhr: false,
          url: false,
          util: false,
          zlib: false
        }
      : {}
  },

  plugins: env.browser
    ? [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          // Work around for Buffer is undefined:
          // https://github.com/webpack/changelog-v5/issues/10
          Buffer: ['buffer', 'Buffer']
        }),
        new webpack.EnvironmentPlugin({ VSCODE_ENV: 'browser' })
      ]
    : [new webpack.EnvironmentPlugin({ VSCODE_ENV: 'electron' })],

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
})

module.exports = createConfig
