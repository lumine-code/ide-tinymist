const fs = require("fs");
const os = require("os");
const path = require("path");
const main = require("../lib/main");
const { findOnPath } = require("../lib/server");
const { LiveLspClient, fileUri } = require("./helpers/live-lsp-client");

const serverPath = process.env.TINYMIST_PATH || findOnPath("tinymist");
const liveSuite = serverPath ? describe : () => {};

liveSuite("ide-tinymist official server", () => {
  let adapter, client, disposable, rootPath;
  let originalTimeout;

  beforeEach(async () => {
    jasmine.useRealClock();
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), "ide-tinymist-live-"));
    await lumine.packages.activatePackage("ide-tinymist");
    lumine.config.set("ide-tinymist.serverPath", serverPath);
    disposable = main.consumeIdeClient({
      registerAdapter(registered) {
        adapter = registered;
        return { dispose() {} };
      },
      reportMissingServer() {},
    });
    client = new LiveLspClient(adapter, rootPath);
  });

  afterEach(async () => {
    await client.stop();
    disposable.dispose();
    lumine.config.unset("ide-tinymist.serverPath");
    await lumine.packages.deactivatePackage("ide-tinymist");
    fs.rmSync(rootPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it("serves diagnostics, completion, formatting and Typst structure", async () => {
    const { capabilities, serverInfo } = await client.start();
    expect(serverInfo.name).toBe("tinymist");
    if (process.env.TINYMIST_VERSION) expect(serverInfo.version).toBe(process.env.TINYMIST_VERSION);
    else expect(serverInfo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(capabilities.completionProvider.triggerCharacters).toContain("#");
    expect(capabilities.signatureHelpProvider.triggerCharacters).toContain("(");
    expect(capabilities.codeLensProvider.resolveProvider).toBe(false);

    const uri = fileUri(path.join(rootPath, "main.typ"));
    client.open(uri, "#let double(x)=x*2\n= Heading\n#missing()\n#dou\n");
    const diagnostics = await client.waitFor(
      () =>
        client
          .messages("textDocument/publishDiagnostics")
          .find(({ params }) =>
            params.diagnostics.some(({ message }) => /unknown variable/.test(message)),
          )?.params.diagnostics,
      "unknown-variable diagnostics",
    );
    expect(diagnostics.some(({ message }) => message.includes("missing"))).toBe(true);

    const completion = await client.request("textDocument/completion", {
      textDocument: { uri },
      position: { line: 3, character: 4 },
    });
    const items = Array.isArray(completion) ? completion : completion.items;
    expect(items.map(({ label }) => label)).toContain("double");

    const edits = await client.request("textDocument/formatting", {
      textDocument: { uri },
      options: { tabSize: 2, insertSpaces: true },
    });
    expect(edits.some(({ newText }) => newText.includes(" = "))).toBe(true);
    const symbols = await client.request("textDocument/documentSymbol", {
      textDocument: { uri },
    });
    expect(symbols.map(({ name }) => name)).toEqual(jasmine.arrayContaining(["double", "Heading"]));
  });
});
