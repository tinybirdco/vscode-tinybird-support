import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as path from 'path'
import { getConfigValue, getVenvCommand } from './utils'

function getDataProjectPath(): string | null {
  const editor = vscode.window.activeTextEditor
  if (!editor) return null
  const dataProjectSubdir = getConfigValue('dataProjectSubdir', '')
  const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.path || ''
  return path.join(workspacePath, dataProjectSubdir)
}

const execShell = (cmd: string) =>
  new Promise<string>(resolve => {
    cp.exec(cmd, (err, out) => {
      if (err) {
        return resolve(cmd + ' error!')
      }
      return resolve(out)
    })
  })

function executeCLICommand(command: string, terminal: vscode.Terminal) {
  const dataProjectPath = getDataProjectPath()
  if (!dataProjectPath) return
  const commands = [`cd "${dataProjectPath}"`, getVenvCommand(), command]
  terminal.sendText(commands.join(' && '))
}

function listConnections(terminal: vscode.Terminal) {
  executeCLICommand('tb connection ls', terminal)
  terminal.show(false)
}

export function registerCLICommands(context: vscode.ExtensionContext) {
  const terminal = vscode.window.createTerminal('Tinybird CLI')

  context.subscriptions.push(
    vscode.commands.registerCommand('tb.connection.ls', () => {
      executeCLICommand('tb connection ls', terminal)
      terminal.show(false)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('tb.connection.create', async () => {
      // The code you place here will be executed every time your command is executed

      // Show input box
      let userInput = await vscode.window.showInputBox({
        prompt: 'Please enter some input',
        placeHolder: 'Input goes here...'
      })

      // Use the user input (if any was given)
      if (userInput) {
        userInput = await vscode.window.showInputBox({
          prompt: 'Please enter another input',
          placeHolder: 'Input goes here...'
        })
      } else {
        vscode.window.showInformationMessage(`No input was received.`)
      }
    })
  )
}
