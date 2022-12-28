"use strict";

exports.__esModule = true;

const vscode = require ("vscode");
const cp = require ("child_process");
const path = require('path');

const infoSql = vscode.window.createOutputChannel ("Tinybird SQL", "sql");

/**
 * Retrieves a setting.
 * 
 * @param {string} key 
 * @param {any} $default 
 * @returns 
 */
function getConfigValue (key, $default)
{
    try
    {
        let config = vscode.workspace.getConfiguration ().get ("tinybird");
        let result = config && config[key];
        return result || $default;
    }
    catch { return $default; }
}

/**
 * Returns the virtual env activation command, if needed.
 * 
 * @returns the venv activation command or `true`.
 */
function getVenvCommand ()
{
    let venv = getConfigValue("venv", null);
    if (venv)
    {
        let activate = getConfigValue("venvActivate", "bin/activate");
        return `. "${venv}/${activate}"`;
    }

    return "true"
}

/**
 * Converts a json Tinybird response into an ASCII table.
 * 
 * @param {object} json 
 * @returns with the ASCII table.
 */
function jsonToTable(json)
{
    const PAD = 2;

    let columns_by_name = {},
        columns_by_index = [];

    let index = 0;
    for (let m in json.meta)
    {
        let meta = json.meta[m],
            name = meta.name;

        columns_by_index[index] = { index: index, length: name.length + PAD, meta: meta };
        columns_by_name[name] = columns_by_index[index];
        index++;
    }

    let rows = [];

    json.data.forEach (data => {
        let row = [];

        for (let k in data)
        {
            if (!data.hasOwnProperty (k))
                continue;

            let meta = columns_by_name[k];

            let v;
            try { v = data[k].toString (); }
            catch { v = ''; }

            row[meta.index] = v;
            if ((v.length + PAD) > meta.length)
                meta.length = v.length + PAD;
        }

        rows.push (row);
    });

    function padValue (index, value)
    {
        let length = columns_by_index[index].length;
        if (value === undefined || value.length >= length)
            return value;

        let type = columns_by_index[index].meta.type.toLowerCase ();
        if (type == "string" || type == "date" || type == "datetime")
            return ` ${value}`.padEnd (length, ' ');
        else
            return `${value} `.padStart (length, ' ');
    }

    function makeRow (values, mid, left, right)
    {
        let cols = values.map ((col, i) =>  padValue (i, col));
        return left + cols.join (mid) + right;
    }

    function makeSeparator (mid, left, right)
    {
        let values = columns_by_index.map (c => '━'.repeat (c.length));
        return makeRow (values, mid, left, right);
    }

    let output = [];
    let separator = makeSeparator ('╋', '┣', '┫');

    output.push (makeSeparator ('┳', '┏', '┓'));
    output.push (makeRow (columns_by_index.map (c => c.meta.name), '┃', '┃', '┃'));
    output.push (separator);
    rows.forEach (row => {
        output.push (makeRow (row, '┃', '┃', '┃'));
        output.push (separator);
    });
    output.pop ();
    output.push (makeSeparator ('┻', '┗', '┛'));

    return output.join('\n');
}

function activate (context)
{
    const sqlCommand = vscode.commands.registerCommand ('tinybird.sql', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;

        let query = editor.document.getText (editor.selection);
        if (!query)
            return;

        let dataProjectSubdir = getConfigValue ("dataProjectSubdir", "");

        let workspacePath = vscode.workspace.workspaceFolders[0].uri.path,
            dataProjectPath = path.join (workspacePath, dataProjectSubdir);

        let commands = [`cd "${dataProjectPath}"`,
                        getVenvCommand (),
                        `tb --no-version-warning sql "${query}" --format json`];

        let command = commands.join(" && ");
        infoSql.appendLine (`QUERY >\n${query}\n`);
        cp.exec (command, async (err, stdout, stderr) => {
            if (err)
                infoSql.appendLine (`ERROR >\n${err}\n${stderr}`);
            else
            {
                try
                {
                    let data = JSON.parse (stdout);
                    infoSql.appendLine (`DATA >\n${jsonToTable (data)}`);
                }
                catch (ex)
                {
                    infoSql.appendLine (`MESSAGE >\n${stdout}`);
                }
            }

            infoSql.appendLine ('');
            await infoSql.show(true);
        });
    });

    context.subscriptions.push (sqlCommand);
}

exports.activate = activate;
