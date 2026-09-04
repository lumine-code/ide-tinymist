# ide-tinymist

Tinymist language-server adapter for Typst.

Registers the [tinymist](https://github.com/Myriad-Dreamin/tinymist) language server with `ide-client`, providing completions, diagnostics, navigation, and formatting for Typst documents.

## Features

- **Server discovery**: uses the Server Path setting, a copy the editor installed for you, or `tinymist` on your PATH, in that order.
- **Managed install**: downloads tinymist from its GitHub releases and keeps it current, verifying each download against the published checksum.
- **Fonts**: loads fonts from your own directories, and can ignore the ones installed on the machine so a document compiles the same way everywhere.
- **Formatting**: formats with `typstyle` or `typstfmt`, both built into the server, at the print width and indent you choose.
- **Linting**: reports style and correctness warnings on top of the compiler's errors, on save or as you type.
- **Compilation**: resolves each file on its own or through the project lock file, with your own compiler arguments, paged, HTML, or bundle targets, and an optional PDF export, off by default because the `typst-tools` package already compiles Typst documents.
- **Feature switches**: any of the fourteen capabilities Tinymist serves can be turned off, which hands it to another server on the same file.
- **Project sessions**: one server per project root, started lazily with the first Typst editor.

## Installation

Install `ide-client` first, then search for `ide-tinymist` in the Install pane of the Lumine settings, or run `lumine --install lumine-code/ide-tinymist`. You can provide a release binary or build one with `cargo install tinymist`, or let the editor fetch it from Manage Servers.

## Services

- `ide-client`: consumed to register the Tinymist adapter with the editor's language-server client.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
