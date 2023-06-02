import * as vscode from 'vscode'
import * as path from 'path'
import { Context } from './context'

/**
 * Retrieves a setting.
 *
 * @param {string} key
 * @param {any} $default
 * @returns
 */
export function getConfigValue<T>(key: string, $default: T): string | T {
  try {
    const config = vscode.workspace.getConfiguration().get('tinybird')
    return config?.[key as keyof typeof config] || $default
  } catch {
    return $default
  }
}

/**
 * Returns the virtual env activation command, if needed.
 *
 * @returns the venv activation command or `true`.
 */
export function getVenvCommand() {
  let venv = getConfigValue('venv', null)
  if (venv) {
    let activate = getConfigValue('venvActivate', 'bin/activate')
    return `. "${venv}/${activate}"`
  }
  return 'true'
}

export function getDataProjectPath(): string {
  const dataProjectSubdir = getConfigValue('dataProjectSubdir', '')
  const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.path || ''
  return path.join(workspacePath, dataProjectSubdir)
}

export function executeCLICommand(command: string, context: Context) {
  const dataProjectPath = getDataProjectPath()
  if (!dataProjectPath) return
  const commands = [`cd "${dataProjectPath}"`, getVenvCommand(), `tb ${command}`]
  const terminal = context.getTerminal()
  terminal.sendText(commands.join(' && '))
  terminal.show(false)
}
