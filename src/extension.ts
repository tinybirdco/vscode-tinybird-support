import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as path from 'path'

const infoSql = vscode.window.createOutputChannel('Tinybird SQL', 'sql')

/**
 * Retrieves a setting.
 *
 * @param {string} key
 * @param {any} $default
 * @returns
 */
function getConfigValue<T>(key: string, $default: T): string | T {
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
function getVenvCommand() {
  let venv = getConfigValue('venv', null)
  if (venv) {
    let activate = getConfigValue('venvActivate', 'bin/activate')
    return `. "${venv}/${activate}"`
  }

  return 'true'
}

/**
 * Converts a json Tinybird response into an ASCII table.
 *
 * @param {object} json
 * @returns with the ASCII table.
 */
function jsonToTable(json: {
  meta: { name: string; type: string }[]
  data: Record<string, any>[]
}) {
  const PAD = 2

  let columns_by_index = [] as {
    index: number
    length: number
    meta: { name: string; type: string }
  }[]
  let columns_by_name = {} as Record<string, (typeof columns_by_index)[number]>
  let index = 0
  for (let m in json.meta) {
    let meta = json.meta[m],
      name = meta.name

    columns_by_index[index] = {
      index: index,
      length: name.length + PAD,
      meta: meta,
    }
    columns_by_name[name] = columns_by_index[index]
    index++
  }

  let rows = [] as any[]

  json.data.forEach(data => {
    let row = []

    for (let k in data) {
      if (!data.hasOwnProperty(k)) continue

      let meta = columns_by_name[k]

      let v
      try {
        v = data[k].toString()
      } catch {
        v = ''
      }

      row[meta.index] = v
      if (v.length + PAD > meta.length) meta.length = v.length + PAD
    }

    rows.push(row)
  })

  function padValue(index: number, value: string) {
    let length = columns_by_index[index].length
    if (value === undefined || value.length >= length) return value

    let type = columns_by_index[index].meta.type.toLowerCase()
    if (type == 'string' || type == 'date' || type == 'datetime')
      return ` ${value}`.padEnd(length, ' ')
    else return `${value} `.padStart(length, ' ')
  }

  function makeRow(values: string[], mid: string, left: string, right: string) {
    let cols = values.map((col, i) => padValue(i, col))
    return left + cols.join(mid) + right
  }

  function makeSeparator(mid: string, left: string, right: string) {
    let values = columns_by_index.map(c => '━'.repeat(c.length))
    return makeRow(values, mid, left, right)
  }

  let output = []
  let separator = makeSeparator('╋', '┣', '┫')

  output.push(makeSeparator('┳', '┏', '┓'))
  output.push(
    makeRow(
      columns_by_index.map(c => c.meta.name),
      '┃',
      '┃',
      '┃'
    )
  )
  output.push(separator)
  rows.forEach(row => {
    output.push(makeRow(row, '┃', '┃', '┃'))
    output.push(separator)
  })
  output.pop()
  output.push(makeSeparator('┻', '┗', '┛'))

  return output.join('\n')
}

function getPipeName(baseFileName: string) {
  let fileName = baseFileName.split('/').slice(-1)
  let pipeName = undefined
  if (fileName && fileName.length && fileName[0].endsWith('.pipe')) {
    pipeName = fileName[0].split('.pipe')[0]
  }
  return pipeName
}

export function activate(context: vscode.ExtensionContext) {
  const sqlCommand = vscode.commands.registerCommand('tinybird.sql', () => {
    let editor = vscode.window.activeTextEditor
    if (!editor) return

    let pipeName = getPipeName(editor.document.fileName)
    let query = editor.document.getText(editor.selection)
    if (!query) return

    let dataProjectSubdir = getConfigValue('dataProjectSubdir', '')

    let workspacePath = vscode.workspace.workspaceFolders?.[0].uri.path || ''
    let dataProjectPath = path.join(workspacePath, dataProjectSubdir)

    let commands
    if (query.trim().startsWith('NODE')) {
      let nodeName = query.trim().split('NODE').slice(-1)[0].trim()
      commands = [
        `cd "${dataProjectPath}"`,
        getVenvCommand(),
        `tb --no-version-warning sql --stats --pipe ${editor.document.fileName} --node ${nodeName} --format json`,
      ]
      infoSql.appendLine(`NODE ${nodeName}\n`)
    } else {
      let pipeline = ''
      if (pipeName !== undefined) {
        pipeline = `--pipeline ${pipeName}`
      }

      commands = [
        `cd "${dataProjectPath}"`,
        getVenvCommand(),
        `tb --no-version-warning sql "${query}" ${pipeline} --stats --format json`,
      ]

      infoSql.appendLine(`QUERY >\n${query}\n`)
    }

    let command = commands.join(' && ')
    cp.exec(command, async (err, stdout, stderr) => {
      if (err) infoSql.appendLine(`ERROR >\n${err}\n${stderr}`)
      else {
        try {
          let stats = stdout.split('\n').slice(0, 3).join('\n')
          let jsonData = stdout.split('\n').slice(3).join('')
          let data = JSON.parse(jsonData)
          infoSql.appendLine(`DATA >\n${jsonToTable(data)}\n`)
          infoSql.appendLine(`STATS >\n${stats}`)
        } catch (ex) {
          infoSql.appendLine(`MESSAGE >\n${stdout}`)
        }
      }

      infoSql.appendLine('')
      await infoSql.show(true)
    })
  })

  context.subscriptions.push(sqlCommand)
}
