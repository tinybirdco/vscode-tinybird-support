import * as vscode from 'vscode'
import * as commands from './commands'
import { DataSourceView } from './views/datasources'
import { Context, getContext } from './context'
import { PipeView } from './views/pipes'
import { TokenView } from './views/tokens'
import { DataFlowPanel, getWebviewOptions } from './views/dataflow'
import { getWorkspace } from './api/workspaces'

export function activate(context: vscode.ExtensionContext) {
  const tinybirdContext = getContext(context)
  const dataSourceView = new DataSourceView(tinybirdContext)
  const pipeView = new PipeView(tinybirdContext)
  const tokenView = new TokenView(tinybirdContext)
  context.subscriptions.push(dataSourceView)
  context.subscriptions.push(pipeView)
  context.subscriptions.push(tokenView)

  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer(DataFlowPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri)
        DataFlowPanel.revive(webviewPanel, context.extensionUri, tinybirdContext)
      }
    })
  }

  const refresh = () => {}

  Object.values(commands).forEach(command => {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `tinybird.${command.id}`,
        command.action(tinybirdContext, refresh)
      )
    )
  })

  const statusBarItem = tinybirdContext.getStatusBarItem()

  context.subscriptions.push(statusBarItem)
  updateStatusBarItem(tinybirdContext)
}

async function updateStatusBarItem(context: Context) {
  const host = await context.getHost()
  const statusBarItem = context.getStatusBarItem()

  if (!host) {
    statusBarItem.hide()
    return
  }

  const response = await getWorkspace(context)

  if (!response.success) {
    statusBarItem.hide()
    return
  }

  const workspace = response.data

  statusBarItem.text = `tb: ${workspace.name}`
  statusBarItem.show()
}
