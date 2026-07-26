const path = require("path");
const { resolveServer, findOnPath } = require("../lib/server");
const main = require("../lib/main");

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
  it("registers with the language-server service", () => {
    let adapter;
    const disposable = main.consumeIdeClient({
      registerAdapter(registered) {
        adapter = registered;
        return { dispose() {} };
      },
    });
    expect(adapter.id).toBe("ide-tinymist");
    expect(adapter.grammarScopes).toEqual(["source.typst"]);
    disposable.dispose();
  });
});
