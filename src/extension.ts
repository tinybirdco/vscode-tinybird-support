import * as vscode from 'vscode'
import * as commands from './commands'
import { DataSourceView } from './views/datasources'
import { Context, getContext } from './context'
import { PipeView } from './views/pipes'
import { TokenView } from './views/tokens'
import { DataFlowPanel, getWebviewOptions } from './views/dataflow'
import { getWorkspace } from './api/workspaces'

let myStatusBarItem: vscode.StatusBarItem

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

  // create a new status bar item that we can now manage
  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  )

  context.subscriptions.push(myStatusBarItem)

  // update status bar item once at start
  updateStatusBarItem(tinybirdContext)
}

async function updateStatusBarItem(context: Context) {
  const response = await getWorkspace(context)

  if (!response.success) {
    myStatusBarItem.hide()
    return
  }

  const workspace = response.data

  myStatusBarItem.text = workspace.name
  myStatusBarItem.show()
}
