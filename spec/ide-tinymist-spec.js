const path = require("path");
const { resolveServer, findOnPath, assetFor } = require("../lib/server");
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
  it("prefers a managed install over PATH, and the configured path over both", async () => {
    const managed = { binaryPath: "/managed/tinymist", version: "0.15.2" };
    const launch = await resolveServer("", managed);
    expect(launch.command).toBe("/managed/tinymist");
    expect(launch.args).toEqual(["lsp"]);
    expect(launch.version).toBe("0.15.2");
    expect((await resolveServer(process.execPath, managed)).command).toBe(process.execPath);
  });
  it("names the language server's asset, never the docs tool published beside it", () => {
    // The same release carries `tinymist-docs-tool-<target>` archives, so the
    // name is computed exactly rather than matched by prefix.
    expect(assetFor({ platform: "win32", arch: "x64" })).toBe(
      "tinymist-x86_64-pc-windows-msvc.zip",
    );
    expect(assetFor({ platform: "darwin", arch: "arm64" })).toBe(
      "tinymist-aarch64-apple-darwin.tar.gz",
    );
    expect(assetFor({ platform: "linux", arch: "x64" })).toBe(
      "tinymist-x86_64-unknown-linux-gnu.tar.gz",
    );
    expect(assetFor({ platform: "aix", arch: "ppc64" })).toBeNull();
    for (const platform of ["win32", "darwin", "linux"])
      expect(assetFor({ platform, arch: "x64" })).not.toContain("docs-tool");
  });
});

describe("ide-tinymist adapter", () => {
  let adapter;
  let disposable;

  beforeEach(async () => {
    // Applies the configSchema, so the defaults the adapter reads are the ones
    // the manifest declares rather than undefined.
    await lumine.packages.activatePackage("ide-tinymist");
    ({ adapter, disposable } = registerAdapter());
  });
  afterEach(async () => {
    disposable.dispose();
    await lumine.packages.deactivatePackage("ide-tinymist");
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
    lumine.config.set("ide-tinymist.fontPaths", ["/fonts"]);
    lumine.config.set("ide-tinymist.formatterMode", "typstfmt");

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
    lumine.config.set("ide-tinymist.systemFonts", false);
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
    lumine.config.set("ide-tinymist.formatterPrintWidth", 0);
    expect(adapter.getWorkspaceConfiguration("tinymist").formatterPrintWidth).toBeUndefined();
  });

  it("stops the server classifying tokens when the switch is off", () => {
    // One control, not two: what the editor would discard is not computed.
    expect(adapter.getWorkspaceConfiguration("tinymist").semanticTokens).toBe("enable");
    lumine.config.set("ide-tinymist.features.semanticTokens", false);
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
      "format",
      "rename",
      "codeActions",
      "inlayHints",
      "codeLens",
      "semanticTokens",
    ]);
  });
});
