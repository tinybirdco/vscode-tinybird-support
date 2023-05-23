// @ts-check

'use strict'

const path = require('path')

/** @returns {import('webpack').Configuration} */
const createConfig = (/** @type {{ browser?: boolean; }} */ env) => ({
  mode: 'none',
  target: 'node',
  entry: './src/extension.ts',

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },

  devtool: 'source-map',

  externals: {
    vscode: 'commonjs vscode'
  },

  resolve: {
    mainFields: ['main'],
    extensions: ['.ts', '.js']
  },

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
