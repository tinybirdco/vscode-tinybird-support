import * as vscode from 'vscode'
import { Context } from '../context'
import { getDataSources } from '../api/datasources'
import { Column, DataSource } from '../types'

export class ColumnTreeItem extends vscode.TreeItem {
  contextValue = 'column' as const

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly column: Column
  ) {
    super(label, collapsibleState)
    this.description = column.type
  }
}

export class DataSourceTreeItem extends vscode.TreeItem {
  contextValue = 'datasource' as const
  iconPath = new vscode.ThemeIcon('database')

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly datasource: DataSource
  ) {
    super(label, collapsibleState)
  }
}

type TreeItem = ColumnTreeItem | DataSourceTreeItem

export class DataSourceTreeDataProvider
  implements vscode.TreeDataProvider<TreeItem>
{
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
      const response = await getDataSources(this.context)

      if (!response.success) {
        throw new Error(response.error.message)
      }

      const { datasources } = response.data

      return datasources.map(
        datasource =>
          new DataSourceTreeItem(
            datasource.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            datasource
          )
      )
    }

    if (element?.contextValue === 'datasource') {
      return (element.datasource.columns || []).map(
        column =>
          new ColumnTreeItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column
          )
      )
    }

    return []
  }

  getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element
  }
}

export class DataSourceView {
  private treeDataProvider: DataSourceTreeDataProvider
  private view: vscode.TreeView<TreeItem>

  public refresh() {
    this.treeDataProvider.refresh()
  }

  constructor(context: Context) {
    this.treeDataProvider = new DataSourceTreeDataProvider(context)

    this.view = vscode.window.createTreeView('dataSourceView', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: false
    })
  }

  dispose() {
    this.view.dispose()
  }
}
