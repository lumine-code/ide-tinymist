# ide-tinymist

Tinymist language-server adapter for Typst.

Registers the [tinymist](https://github.com/Myriad-Dreamin/tinymist) language server with the bundled `ide-client` package, providing completions, diagnostics, navigation, and formatting for Typst documents.

## Features

- **PATH discovery**: finds `tinymist` on your PATH, or uses the Server Path setting.
- **Fonts**: loads fonts from your own directories, and can ignore the ones installed on the machine so a document compiles the same way everywhere.
- **Formatting**: formats with `typstyle` or `typstfmt`, both built into the server, at the print width and indent you choose.
- **Linting**: reports style and correctness warnings on top of the compiler's errors, on save or as you type.
- **Compilation**: resolves each file on its own or through the project lock file, with your own compiler arguments and an optional PDF export, off by default because the `typst-tools` package already compiles Typst documents.
- **Feature switches**: any of the fourteen capabilities Tinymist serves can be turned off, which hands it to another server on the same file.
- **Project sessions**: one server per project root, started lazily with the first Typst editor.

## Installation

To install `ide-tinymist` search for _ide-tinymist_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/ide-tinymist`. The `tinymist` binary itself is installed separately — prebuilt binaries are available from its releases, or build it with `cargo install tinymist`.

## Services

- **ide-client** (`^1.0.0`): consumed to register the Tinymist adapter with the editor's language-server client.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
