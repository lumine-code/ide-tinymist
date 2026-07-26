# ide-tinymist

Tinymist language-server adapter for Typst.

Registers the [tinymist](https://github.com/Myriad-Dreamin/tinymist) language server with the bundled `ide-client` package, providing completions, diagnostics, navigation, and formatting for Typst documents.

## Features

- **PATH discovery**: finds `tinymist` on your PATH, or uses the Server Path setting.
- **Project sessions**: one server per project root, started lazily with the first Typst editor.

## Installation

To install `ide-tinymist` search for _ide-tinymist_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/ide-tinymist`. The `tinymist` binary itself is installed separately — prebuilt binaries are available from its releases, or build it with `cargo install tinymist`.

## Services

- **lumine.languageServer** (`^1.0.0`): consumed to register the Tinymist adapter with the editor's language-server client.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
