# Tinybird support for Visual Studio Code

![Screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/banner.png)

This extension provides some helpers for your [Tinybird](https://tinybird.co) data projects:

## Syntax highlighting and autocomplete

Adds syntax highlighting for `.datasource`, `.pipe` and `.incl` files.

![Syntax highlighting screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/screenshot.jpg)

Also includes autocomplete for the full library of ClickHouse SQL functions.

![Syntax highlighting screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/autcomplete-gif.gif)

## Navigate your Data Project

The Tinybird Sidebar lists all the resources within your data project, including Data Sources, Pipes, and Tokens.

![Sidebar screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/sidebar-final.gif)

## View your Data Flow

View the flow of data from Data Sources to Endpoints without switching back to the Tinybird UI. Simply open the Command Palette (`Cmd+Shift+P`), type `Tinybird CLI: Show Data Flow` and hit `Enter`. You can drag to navigate and zoom in/out with `Ctrl` and your scroll wheel/trackpad.

![Data Flow screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/data-flow-gif.gif)

## Execute common Tinybird commands

Find and execute common Tinybird CLI commands from the Command Palette in VS Code. Use `Cmd+Shift+P` to open the Command Palette, type `Tinybird CLI` and find a list of available commands.

![Command palette screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/cli-commands-final.gif)

## Run SQL from within VS Code

Execute any SQL in your Tinybird workspace by selecting an SQL statement in the editor and pressing the default `Cmd+Enter` keybinding (alternatively, you can call the command from the command bar or set your preferred mapping).

You'll see the results in the `Tinybird SQL` output panel.

![tinybird.sql screenshot](https://github.com/tinybirdco/vscode-tinybird-support/raw/main/images/run-sql-gif.gif)

> Note: for this command to work you need to have your `tb` command properly configured. Please, [refer to our docs](https://www.tinybird.co/docs/quick-start-cli.html) for a quick start.

#### Configure the extension

For the Tinybird commands to work, you need to setup the following settings:
- `tinybird.dataProjectSubdir`: Where your data project is located in the active workspace.
- `tinybird.venv`: If you use a Python virtual env to work with Tinybird, put the venv name here.
- `tinybird.venvActivate`: The activation command for your virtual env (see setting `tinybird.venv`). Default is `bin/activate` but for some shells you might need another one (for example `bin/activate.fish` for the [fish shell](https://fishshell.com/)).

## New to Tinybird?
If you’re new to Tinybird and want to try it out, you can signup for free [here](https://www.tinybird.co/signup?referrer=vscode). The Build Plan doesn’t require a credit card and has no time limit.

If you have any questions or want new features in the VS Code Extension, please join our [Slack community](https://www.tinybird.co/community).


