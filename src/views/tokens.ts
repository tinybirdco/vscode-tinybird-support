import * as vscode from 'vscode'
import { Context } from '../context'
import { getTokens } from '../api/tokens'
import { Token } from '../types'

export class TokenTreeItem extends vscode.TreeItem {
  contextValue = 'token' as const
  iconPath = new vscode.ThemeIcon('token')

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly token: Token
  ) {
    super(label, collapsibleState)
    const color = new vscode.ThemeColor('#e35f')
    this.iconPath = new vscode.ThemeIcon('token', color)
  }
}

export class TokenTreeDataProvider
  implements vscode.TreeDataProvider<TokenTreeItem>
{
  #onDidChangeTreeData: vscode.EventEmitter<TokenTreeItem | null> =
    new vscode.EventEmitter<TokenTreeItem | null>()

  readonly onDidChangeTreeData:
    | vscode.Event<TokenTreeItem | TokenTreeItem[] | null>
    | undefined = this.#onDidChangeTreeData.event

  constructor(private context: Context) {}

  public refresh() {
    this.#onDidChangeTreeData.fire(null)
  }

  async getChildren(element?: TokenTreeItem): Promise<TokenTreeItem[] | null> {
    if (!(await this.context.getToken())) {
      return []
    }

    if (!element) {
      const response = await getTokens(this.context)

      if (!response.success) {
        throw new Error(response.error.message)
      }

      const { tokens } = response.data

      return tokens.map(
        token =>
          new TokenTreeItem(
            token.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            token
          )
      )
    }

    return null
  }

  getTreeItem(element: TokenTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element
  }
}

export class TokenView {
  private treeDataProvider: TokenTreeDataProvider
  private view: vscode.TreeView<TokenTreeItem>

  public refresh() {
    this.treeDataProvider.refresh()
  }

  constructor(context: Context) {
    this.treeDataProvider = new TokenTreeDataProvider(context)

    this.view = vscode.window.createTreeView('tokenView', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: false
    })
  }

  dispose() {
    this.view.dispose()
  }
}
