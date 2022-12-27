"use strict";

exports.__esModule = true;

const vscode = require("vscode");
const cp = require ("child_process");

const info = vscode.window.createOutputChannel ("Tinybird-Output", "sql");

function getConfigValue(key, $default)
{
    try
    {
        let config = vscode.workspace.getConfiguration ().get("tinybird");
        let result = config && config.get[key];
        return result || $default;
    }
    catch { return $default; }
}

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

            let meta = columns_by_name[k],
                v = data[k].toString ();

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
            return `${value} `.padStart (length, ' ');
        else
            return ` ${value}`.padEnd (length, ' ');
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
	const disposable = vscode.commands.registerCommand ('tinybird.sql', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;

        let query = editor.document.getText (editor.selection);
        if (!query)
            return;

        let path = vscode.workspace.workspaceFolders[0].uri.path;
        let commands = [`cd ${path}`,
                        "true",
                        `tb --no-version-warning sql "${query}" --format json`];

        let venv = getConfigValue("venv", null);
        if (venv)
            commands[1] = `${venv}/bin/activate`

        let command = commands.join(" && ");
        info.appendLine (`QUERY >\n${query}\n`);
        cp.exec (command, async (err, stdout, stderr) => {
            if (err)
                info.appendLine (`ERROR: ${err} >\n${stderr}`);
            else
            {
                try
                {
                    let data = JSON.parse (stdout);
                    info.appendLine (`DATA >\n${jsonToTable (data)}`);
                }
                catch
                {
                    info.appendLine (`MESSAGE >\n${stdout}`);
                }
            }

            info.appendLine ('');
            await info.show(true);
        });
    });

    context.subscriptions.push (disposable);
}

exports.activate = activate;
