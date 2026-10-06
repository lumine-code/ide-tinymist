// Tinymist publishes one archive per Rust target through cargo-dist. The name
// is computed rather than searched for: the same release also carries
// `tinymist-docs-tool-<target>` archives, and a prefix match would fetch one of
// those instead of the language server.
const TARGETS = {
  "win32-x64": "x86_64-pc-windows-msvc",
  "win32-arm64": "aarch64-pc-windows-msvc",
  "darwin-x64": "x86_64-apple-darwin",
  "darwin-arm64": "aarch64-apple-darwin",
  "linux-x64": "x86_64-unknown-linux-gnu",
  "linux-arm64": "aarch64-unknown-linux-gnu",
};

exports.assetFor = ({ platform, arch }) => {
  const target = TARGETS[`${platform}-${arch}`];
  if (!target) return null;
  return `tinymist-${target}.${platform === "win32" ? "zip" : "tar.gz"}`;
};

// Where the editor can fetch tinymist itself.
exports.managedServer = {
  source: "github-release",
  displayName: "Tinymist",
  repository: "Myriad-Dreamin/tinymist",
  assetFor: exports.assetFor,
  checksum: "sha256-sidecar",
  binary: process.platform === "win32" ? "tinymist.exe" : "tinymist",
};

// The configured path wins because it is the only setting that says which copy
// to use. A managed install comes next — it exists only because the user asked
// for one — and PATH last, which is also where uninstalling lands.
exports.resolveServer = async (context, configuredPath = "") => {
  const selection = await context.resolver.select({
    kind: "executable",
    configuredPath,
    managedPath: context.managedServer?.binaryPath,
    managedVersion: context.managedServer?.version,
    env: context.env,
    cwd: context.rootPath,
    names: ["tinymist"],
    signal: context.signal,
  });
  return selection
    ? context.resolver.launch(selection, { signal: context.signal, args: ["lsp"] })
    : null;
};
