# Change Log

## [0.5.0] - 2022-12-28

- Added: Execute arbitrary SQL in yout Tinybird workspace by selecting it in an editor and pressing the default `f5` keybinding or calling the command `tinybird.sql`. See the results in the `Tinybird SQL` output panel.

  > Note: you need to have your `tb` command properly configured for this command to work. Please, [refer to our docs](https://www.tinybird.co/docs/quick-start-cli.html) for a quick start.

- Added: Configuration keys:
    - `tinybird.dataProjectSubdir`: Where your data project is located in the active workspace.
    - `tinybird.venv`: If you use a Python virtual env to work with Tinybird, put the venv name here.
    - `tinybird.venvActivate`: The activation command for your virtual env (see setting `tinybird.venv`). Default is `bin/activate` but for some shells you might need another one (for example `bin/activate.fish` for the [fish shell](https://fishshell.com/)).
- Fixed: Missing contributors in `package.json`.
- Fixed: Missing entries in `CHANGELOG.md`.

## [0.4.2] - 2022-09-16

- Added: Support for `.incl` files.

Support .incl files
## [0.3.3] - 2022-07-04

- Added: highlight for `ENGINE_PRIMARY_KEY`.

## [0.3.2] - 2022-07-01

- Added: support for Kafka datasources.

## [0.3.1] - 2022-06-30

- Added: support for `ENGINE_VER`, `ENGINE_SIGN` and `ENGINE_TTL`.

## [0.3.0] - 2022-06-29

- Added: support for `ENGINE_SAMPLING_KEY` meta.

## [0.2.0] - 2022-06-09

- Added: support for `ENGINE_SETTINGS` meta.

## [0.1.0] - 2022-06-09

- Initial release with syntax support for `.datasource` and `.pipe` files.
