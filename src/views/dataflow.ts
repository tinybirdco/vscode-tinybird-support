import * as vscode from 'vscode'
import { Context } from '../context'

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
  }
}

export class DataFlowPanel {
  public static currentPanel: DataFlowPanel | undefined

  public static readonly viewType = 'dataFlow'

  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []
  private _context: Context

  public static createOrShow(extensionUri: vscode.Uri, context: Context) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    // If we already have a panel, show it.
    if (DataFlowPanel.currentPanel) {
      DataFlowPanel.currentPanel._panel.reveal(column)
      return
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      DataFlowPanel.viewType,
      'Data flow',
      vscode.ViewColumn.Three,
      getWebviewOptions(extensionUri)
    )

    DataFlowPanel.currentPanel = new DataFlowPanel(panel, extensionUri, context)
  }

  public static revive(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: Context
  ) {
    DataFlowPanel.currentPanel = new DataFlowPanel(panel, extensionUri, context)
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: Context
  ) {
    this._panel = panel
    this._extensionUri = extensionUri
    this._context = context
    // Set the webview's initial html content
    this._update()

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      e => {
        if (this._panel.visible) {
          this._update()
        }
      },
      null,
      this._disposables
    )

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text)
            return
          case 'dataFlowLoaded': {
            const [datasources, pipes] = await Promise.all([
              this._context.getDataSources() ||
                (await this._context.fetchDataSources()),
              this._context.getPipes() || (await this._context.fetchPipes())
            ])

            this._panel.webview.postMessage({
              command: 'loadEntities',
              data: { datasources, pipes }
            })
          }
        }
      },
      null,
      this._disposables
    )
  }

  public dispose() {
    DataFlowPanel.currentPanel = undefined

    // Clean up our resources
    this._panel.dispose()

    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }

  private _update() {
    const webview = this._panel.webview
    this._panel.title = 'Data flow'
    this._panel.webview.html = this._getHtmlForWebview(webview)
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      'media',
      'main.js'
    )

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk)

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      'media',
      'reset.css'
    )
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      'media',
      'vscode.css'
    )

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath)
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath)

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce()

    return `<!doctype html>
<html>
<head>
  <link href="${stylesResetUri}" rel="stylesheet">
  <title>Data Flow</title>
 
</head>
<body>
  <div id="root">
      <div id="graph-container" style="height:100vh;width:100vw;background:#f6f7f9;"></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@antv/g6@4.8.13/dist/g6.min.js"></script>
  <script>
    function onScriptLoad() {
      window.G6 = G6;
    }
    const scriptTag = $document[0].createElement('script');
    scriptTag.type = 'text/javascript'; 
    scriptTag.async = true;
    scriptTag.src = 'https://cdn.jsdelivr.net/npm/@antv/g6@4.8.13/dist/g6.min.js';
    scriptTag.onload = onScriptLoad;
    
    const s = $document[0].getElementsByTagName('body')[0];
    s.appendChild(scriptTag);
  </script>
  <script src="${stylesMainUri}" type="module"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }
}

function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
