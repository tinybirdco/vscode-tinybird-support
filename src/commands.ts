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

function executeCLICommand(
  command: string,
  dataProjectPath: string,
  infoSql: vscode.OutputChannel
) {
  const commands = [`cd "${dataProjectPath}"`, getVenvCommand(), command]

  cp.exec(commands.join(' && '), async (err, stdout, stderr) => {
    if (err) infoSql.appendLine(`ERROR >\n${err}\n${stderr}`)
    else {
      infoSql.appendLine(stdout)
    }
  })
}

export function registerCLICommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('tb.connection.ls', () => {
      const output = vscode.window.createOutputChannel('Tinybird CLI', 'bash')
      const dataProjectPath = getDataProjectPath()
      if (!dataProjectPath) return

      executeCLICommand('tb connection ls', dataProjectPath, output)

      output.show(false)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('tb.connection.create', async () => {
      const output = vscode.window.createOutputChannel('Tinybird CLI', 'bash')
      const dataProjectPath = getDataProjectPath()
      if (!dataProjectPath) return

      executeCLICommand('tb connection create kafka', dataProjectPath, output)

      await output.show(false)
    })
  )
}
