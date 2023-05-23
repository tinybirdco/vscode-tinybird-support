import * as vscode from 'vscode'
import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const pipeAppendCommand: Command = {
  id: 'pipeAppend',
  action(context) {
    return async () => {
      const pipeId = await vscode.window.showInputBox({
        prompt: 'Enter the ID or name of the Pipe',
        ignoreFocusOut: true
      })
      if (!pipeId) return

      const sql = await vscode.window.showInputBox({
        prompt: 'Enter the SQL to append',
        ignoreFocusOut: true
      })
      if (!sql) return

      executeCLICommand(`pipe append "${pipeId}" "${sql}"`, context)
    }
  }
}
