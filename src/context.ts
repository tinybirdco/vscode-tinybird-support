import * as vscode from 'vscode'
import { DataSource, Pipe } from './types'
import { getDataSources } from './api/datasources'
import { getPipes } from './api/pipes'

export function getContext(context: vscode.ExtensionContext) {
  let terminal: vscode.Terminal | undefined
  let datasources: DataSource[] | null = null
  let pipes: Pipe[] | null = null

  const output = vscode.window.createOutputChannel('Tinybird CLI', 'bash')
  return {
    async getToken() {
      const token =
        'p.eyJ1IjogIjI0NGExMjNhLTgxNTItNDYyNy05ODk1LTRjMzM5MmNjODgzNSIsICJpZCI6ICIxNzVmNjk3ZC05OGRmLTQ2NDktYmVmYy01ODUxNjVlZGRmOWIifQ.1L1YOv86nuDNSc2J4ZdqQ-ppApJxAQ5u-RQrQn1PucU'
      setContributeContext('tinybird.isLogged', Boolean(token))
      return token
    },
    getBaseUrl() {
      const configValue = 'https://api.tinybird.co/v0'

      if (!(typeof configValue === 'string' && configValue.includes('//'))) {
        vscode.window.showErrorMessage('"tinybird.baseUrl" is not a valid url')
        return ''
      }

      return configValue
    },
    getTerminal() {
      if (!terminal || terminal.exitStatus) {
        terminal = vscode.window.createTerminal('Tinybird CLI')
      }
      return terminal
    },
    getPipes() {
      return pipes
    },
    async fetchPipes() {
      const response = await getPipes(this)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      pipes = response.data.pipes
      return pipes
    },
    setPipes(newPipes: Pipe[]) {
      pipes = newPipes
    },
    getDataSources() {
      return datasources
    },
    async fetchDataSources() {
      const response = await getDataSources(this)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      datasources = response.data.datasources
      return datasources
    },
    setDataSources(newDataSources: DataSource[]) {
      datasources = newDataSources
    }
  }
}

export type Context = ReturnType<typeof getContext>

/**
 * Set a value to vscode context.
 *
 * This value can be used in `when` conditions in package.json
 *
 * @documentation https://code.visualstudio.com/api/references/when-clause-contexts#add-a-custom-when-clause-context
 */
function setContributeContext(
  key: 'tinybird.isLogged' | 'tinybird.isOffline',
  value: boolean
) {
  vscode.commands.executeCommand('setContext', key, value)
}
