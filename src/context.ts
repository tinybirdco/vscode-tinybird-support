import * as vscode from 'vscode'
import { DataSource, Pipe } from './types'
import { getDataSources } from './api/datasources'
import { getPipes } from './api/pipes'
import { getConfigValue } from './utils'

export function getContext(context: vscode.ExtensionContext) {
  let terminal: vscode.Terminal | undefined
  let output: vscode.OutputChannel | undefined
  let statusBarItem: vscode.StatusBarItem
  let datasources: DataSource[] | null = null
  let pipes: Pipe[] | null = null

  return {
    extensionUri: context.extensionUri,
    async getToken() {
      let token = await context.secrets.get('token')
      if (!token) {
        const config = await this.loadWorkspaceConfig()
        token = config.token
        await this.setToken(token)
      } else {
        setContributeContext('tinybird.isLogged', Boolean(token))
      }
      return token
    },
    setToken(token: string) {
      setContributeContext('tinybird.isLogged', Boolean(token))
      return context.secrets.store('token', token)
    },
    clearToken() {
      setContributeContext('tinybird.isLogged', false)
      return context.secrets.delete('token')
    },
    async getHost() {
      let host = vscode.workspace.getConfiguration().get('tinybird.host') as string
      if (!host) {
        const config = await this.loadWorkspaceConfig()
        host = config.host
      }
      return host
    },
    getTerminal() {
      if (!terminal || terminal.exitStatus) {
        terminal = vscode.window.createTerminal('Tinybird CLI')
      }
      return terminal
    },
    getOutput() {
      if (!output) {
        output = vscode.window.createOutputChannel('Tinybird SQL', 'sql')
      }
      return output
    },
    getStatusBarItem() {
      if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          100
        )
      }
      return statusBarItem
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
    async loadWorkspaceConfig() {
      let config = {} as {
        host: string
        id: string
        name: string
        scope: string
        token: string
        user_email: string
        user_id: string
      }
      if (vscode.workspace.workspaceFolders?.length) {
        try {
          const dataProjectSubdir = getConfigValue('dataProjectSubdir', '')
          const raw = await vscode.workspace.fs.readFile(
            vscode.Uri.joinPath(
              vscode.workspace.workspaceFolders[0].uri,
              dataProjectSubdir,
              '.tinyb'
            )
          )
          const json = JSON.parse(Buffer.from(raw).toString('utf-8'))
          config = {
            ...config,
            ...json
          }
        } catch {
          /* The file doesn't exist or is not a valid json */
          vscode.window.showWarningMessage(
            'The .tinyb file is missing or is not a valid json'
          )
        }
      }

      return config
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
