import * as vscode from 'vscode'
import { Context } from '../context'
import { getPipes } from '../api/pipes'
import { Pipe, Node } from '../types'

export class PipeTreeItem extends vscode.TreeItem {
  contextValue = 'pipe' as const
  iconPath = new vscode.ThemeIcon('file')

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly pipe: Pipe
  ) {
    super(label, collapsibleState)
    this.iconPath = new vscode.ThemeIcon('file')
  }
}

export class NodeTreeItem extends vscode.TreeItem {
  contextValue = 'node' as const
  iconPath = new vscode.ThemeIcon('circle-outline')

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly node: Node
  ) {
    super(label, collapsibleState)
  }
}

type TreeItem = PipeTreeItem | NodeTreeItem

export class PipeTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  #onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> =
    new vscode.EventEmitter<TreeItem | null>()

  readonly onDidChangeTreeData:
    | vscode.Event<TreeItem | TreeItem[] | null>
    | undefined = this.#onDidChangeTreeData.event

  constructor(private context: Context) {}

  public refresh() {
    this.#onDidChangeTreeData.fire(null)
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!(await this.context.getToken())) {
      return []
    }

    if (!element) {
      const pipes = this.context.getPipes() || (await this.context.fetchPipes())

      return pipes.map(
        pipe =>
          new PipeTreeItem(
            pipe.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            pipe
          )
      )
    }

    if (element?.contextValue === 'pipe') {
      return (element.pipe.nodes || []).map(
        node =>
          new NodeTreeItem(node.name, vscode.TreeItemCollapsibleState.None, node)
      )
    }

    return []
  }

  getTreeItem(element: PipeTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element
  }
}

export class PipeView {
  private treeDataProvider: PipeTreeDataProvider
  private view: vscode.TreeView<TreeItem>

  public refresh() {
    this.treeDataProvider.refresh()
  }

  constructor(context: Context) {
    this.treeDataProvider = new PipeTreeDataProvider(context)

    this.view = vscode.window.createTreeView('pipeView', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: false
    })
  }

  dispose() {
    this.view.dispose()
  }
}
