import * as vscode from 'vscode'

export class LoginTreeItem extends vscode.TreeItem {
  contextValue = 'login' as const

  constructor(public readonly label: string) {
    super(label)
    this.command = {
      command: 'tinybird.palette.login',
      title: 'Login to Tinybird'
    }
    this.description = 'Click to start'
  }
}
