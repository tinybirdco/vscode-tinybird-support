import * as vscode from 'vscode'

const cats = {
  'Data flow': 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
  'Compiling Cat': 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif',
  'Testing Cat': 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif'
}

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
  }
}

/**
 * Manages cat coding webview panels
 */
export class CatCodingPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: CatCodingPanel | undefined

  public static readonly viewType = 'catCoding'

  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    // If we already have a panel, show it.
    if (CatCodingPanel.currentPanel) {
      CatCodingPanel.currentPanel._panel.reveal(column)
      return
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      CatCodingPanel.viewType,
      'Data flow',
      vscode.ViewColumn.Three,
      getWebviewOptions(extensionUri)
    )

    CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri)
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri)
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel
    this._extensionUri = extensionUri

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
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text)
            return
        }
      },
      null,
      this._disposables
    )
  }

  public doRefactor() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: 'refactor' })
  }

  public dispose() {
    CatCodingPanel.currentPanel = undefined

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

    // Vary the webview's content based on where it is located in the editor.
    switch (this._panel.viewColumn) {
      case vscode.ViewColumn.Two:
        this._updateForCat(webview, 'Compiling Cat')
        return

      case vscode.ViewColumn.Three:
        this._updateForCat(webview, 'Testing Cat')
        return

      case vscode.ViewColumn.One:
      default:
        this._updateForCat(webview, 'Data flow')
        return
    }
  }

  private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
    this._panel.title = catName
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
  <title>Angular Test </title>
 
</head>
<body>
  <div id="root">
      <div id="graph-container" style="lightGrey:red;height:800px;"></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@antv/g6@4.8.13/dist/g6.min.js"></script>
  <script>
    function onScriptLoad() {
      window.G6 = G6;
    }
    var scriptTag = $document[0].createElement('script');
    scriptTag.type = 'text/javascript'; 
    scriptTag.async = true;
    scriptTag.src = 'https://cdn.jsdelivr.net/npm/@antv/g6@4.8.13/dist/g6.min.js';
    scriptTag.onreadystatechange = function () {
      if (this.readyState == 'complete') onScriptLoad();
    }
    scriptTag.onload = onScriptLoad;
    
    var s = $document[0].getElementsByTagName('body')[0];
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
