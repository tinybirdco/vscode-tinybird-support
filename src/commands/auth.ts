import * as vscode from 'vscode'
import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const authCommand: Command = {
  id: 'login',
  action(context, refresh) {
    return async () => {
      const token = await vscode.window.showInputBox({
        prompt: 'Paste your Tinybird auth token',
        ignoreFocusOut: true
      })

      if (token) {
        executeCLICommand(`auth --token ${token}`, context)
        await context.setToken(token)
        return refresh()
      }
    }
  }
}
