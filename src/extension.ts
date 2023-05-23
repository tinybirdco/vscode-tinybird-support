import * as vscode from 'vscode'
import * as commands from './commands'
import { DataSourceView } from './views/datasources'
import { getContext } from './context'
import { PipeView } from './views/pipes'
import { TokenView } from './views/tokens'
import { DataFlowPanel, getWebviewOptions } from './views/dataflow'

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

  const myCommandId = 'sample.showSelectionCount'
  context.subscriptions.push(
    vscode.commands.registerCommand(myCommandId, () => {
      const n = getNumberOfSelectedLines(vscode.window.activeTextEditor)
      vscode.window.showInformationMessage(
        `Yeah, ${n} line(s) selected... Keep going!`
      )
    })
  )

  // create a new status bar item that we can now manage
  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  )
  myStatusBarItem.command = myCommandId
  context.subscriptions.push(myStatusBarItem)

  // register some listener that make sure the status bar
  // item always up-to-date
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
  )
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem)
  )

  // update status bar item once at start
  updateStatusBarItem()
}

function updateStatusBarItem(): void {
  const workspace = 'cli_workspace'
  const n = getNumberOfSelectedLines(vscode.window.activeTextEditor)

  myStatusBarItem.text = `cli_workspace`
  myStatusBarItem.show()
}

function getNumberOfSelectedLines(editor: vscode.TextEditor | undefined): number {
  let lines = 0
  if (editor) {
    lines = editor.selections.reduce(
      (prev, curr) => prev + (curr.end.line - curr.start.line),
      0
    )
  }
  return lines
}
