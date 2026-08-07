const path = require("path");
const { resolveServer, findOnPath } = require("../lib/server");
const main = require("../lib/main");

const registerAdapter = () => {
  let adapter;
  const disposable = main.consumeIdeClient({
    registerAdapter(registered) {
      adapter = registered;
      return { dispose() {} };
    },
    getSessions: () => [],
    restart: async () => {},
  });
  return { adapter, disposable };
};

describe("ide-tinymist server resolution", () => {
  it("prefers the configured path and launches the lsp subcommand", async () => {
    const launch = await resolveServer(process.execPath);
    expect(launch.command).toBe(process.execPath);
    expect(launch.args).toEqual(["lsp"]);
  });
  it("finds executables on a synthetic PATH", () => {
    const dir = path.dirname(process.execPath);
    const name = path.basename(process.execPath, path.extname(process.execPath));
    expect(findOnPath(name, { PATH: dir, PATHEXT: ".EXE" })).toBeTruthy();
    expect(findOnPath("definitely-not-a-real-binary", { PATH: dir })).toBeNull();
  });
});

describe("ide-tinymist adapter", () => {
  let adapter;
  let disposable;

  beforeEach(async () => {
    // Applies the configSchema, so the defaults the adapter reads are the ones
    // the manifest declares rather than undefined.
    await atom.packages.activatePackage("ide-tinymist");
    ({ adapter, disposable } = registerAdapter());
  });
  afterEach(async () => {
    disposable.dispose();
    await atom.packages.deactivatePackage("ide-tinymist");
  });

  it("registers with the language-server service", () => {
    expect(adapter.id).toBe("ide-tinymist");
    expect(adapter.grammarScopes).toEqual(["source.typst"]);
    expect(adapter.settingsKeyPaths).toEqual(["ide-tinymist"]);
  });

  it("answers each configuration item the server asks for by name", () => {
    // Tinymist requests every item twice, once under its own namespace and
    // once bare, and takes whichever answer is not null. Answering only the
    // section called `tinymist` — which is what reading a Lumine namespace of
    // that name used to amount to — leaves every item null.
    atom.config.set("ide-tinymist.fontPaths", ["/fonts"]);
    atom.config.set("ide-tinymist.formatterMode", "typstfmt");

    expect(adapter.getWorkspaceConfiguration("tinymist.fontPaths")).toEqual(["/fonts"]);
    expect(adapter.getWorkspaceConfiguration("fontPaths")).toEqual(["/fonts"]);
    expect(adapter.getWorkspaceConfiguration("tinymist.formatterMode")).toBe("typstfmt");
    expect(adapter.getWorkspaceConfiguration("formatterMode")).toBe("typstfmt");
    // The section named after the server itself carries the whole map.
    expect(adapter.getWorkspaceConfiguration("tinymist").fontPaths).toEqual(["/fonts"]);
    // Anything else is not ours to answer.
    expect(adapter.getWorkspaceConfiguration("tinymist.tinymist")).toBeUndefined();
    expect(adapter.getWorkspaceConfiguration("editor")).toBeUndefined();
  });

  it("carries the same options through the handshake and the push", () => {
    atom.config.set("ide-tinymist.systemFonts", false);
    expect(adapter.getInitializationOptions().systemFonts).toBe(false);
    expect(adapter.getSettings().tinymist.systemFonts).toBe(false);
  });

  it("keeps the defaults that avoid duplicating typst-tools", () => {
    const options = adapter.getWorkspaceConfiguration("tinymist");
    // typst-tools already compiles Typst documents; both on would export twice.
    expect(options.exportPdf).toBe("never");
    expect(options.formatterMode).toBe("typstyle");
    expect(options.formatterPrintWidth).toBe(120);
    expect(options.projectResolution).toBe("singleFile");
    expect(options.lint.enabled).toBe(false);
  });

  it("omits an unset path rather than sending an empty one", () => {
    const options = adapter.getWorkspaceConfiguration("tinymist");
    expect(options.rootPath).toBeUndefined();
    expect(options.fontPaths).toBeUndefined();
    expect(options.typstExtraArgs).toBeUndefined();
    // An empty output pattern is a pattern, not an absent one, and Tinymist
    // resolves it to a relative path it then refuses.
    expect(options.outputPath).toBeUndefined();
    atom.config.set("ide-tinymist.formatterPrintWidth", 0);
    expect(adapter.getWorkspaceConfiguration("tinymist").formatterPrintWidth).toBeUndefined();
  });

  it("stops the server classifying tokens when the switch is off", () => {
    // One control, not two: what the editor would discard is not computed.
    expect(adapter.getWorkspaceConfiguration("tinymist").semanticTokens).toBe("enable");
    atom.config.set("ide-tinymist.features.semanticTokens", false);
    expect(adapter.getWorkspaceConfiguration("tinymist").semanticTokens).toBe("disable");
  });

  it("offers a switch for every capability Tinymist advertises", () => {
    // Read from the server's own capability declaration; Tinymist serves all
    // of them.
    const { configSchema } = require("../package.json");
    expect(Object.keys(configSchema.features.properties)).toEqual([
      "diagnostics",
      "autocomplete",
      "hover",
      "signature",
      "definition",
      "references",
      "symbols",
      "outline",
      "format",
      "rename",
      "codeActions",
      "inlayHints",
      "codeLens",
      "semanticTokens",
    ]);
  });
});
