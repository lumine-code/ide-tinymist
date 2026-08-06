const { CompositeDisposable } = require("atom");
const { resolveServer } = require("./server");

let missingReported = false;

const setting = (key) => atom.config.get(`ide-tinymist.${key}`);
// An empty setting means "no opinion", so it is left out and Tinymist keeps its
// own default rather than being told to use nothing.
const text = (key) => setting(key) || undefined;
const list = (key) => {
  const value = setting(key);
  return value?.length ? value : undefined;
};
const positive = (key) => {
  const value = setting(key);
  return value > 0 ? value : undefined;
};

// The flat map Tinymist reads. Its keys are the configuration items the server
// asks for by name — see `tinymistOptions` callers below for how they are
// answered.
const tinymistOptions = () => ({
  fontPaths: list("fontPaths"),
  systemFonts: setting("systemFonts"),
  rootPath: text("rootPath"),
  outputPath: setting("outputPath"),
  exportPdf: setting("exportPdf"),
  exportTarget: setting("exportTarget"),
  typstExtraArgs: list("typstExtraArgs"),
  projectResolution: setting("projectResolution"),
  syntaxOnly: setting("syntaxOnly"),
  formatterMode: setting("formatterMode"),
  formatterPrintWidth: positive("formatterPrintWidth"),
  formatterIndentSize: positive("formatterIndentSize"),
  formatterProseWrap: setting("formatterProseWrap"),
  // The Semantic Tokens feature switch is the single control. Mapping it here
  // as well means a server whose tokens the editor would discard does not
  // compute them in the first place.
  semanticTokens: setting("features.semanticTokens") === false ? "disable" : "enable",
  lint: {
    enabled: setting("lint.enabled"),
    when: setting("lint.when"),
  },
  completion: {
    postfix: setting("completion.postfix"),
    symbol: setting("completion.symbol"),
    triggerOnSnippetPlaceholders: setting("completion.triggerOnSnippetPlaceholders"),
  },
});

// Tinymist asks for each configuration item by name, twice — once under the
// `tinymist` namespace and once bare — and takes whichever answer is not null.
// Both are answered with the same value; the whole map answers the section
// named after the server itself.
const configurationFor = (section) => {
  const options = tinymistOptions();
  if (!section) return { tinymist: options };
  if (section === "tinymist") return options;
  const item = section.startsWith("tinymist.") ? section.slice("tinymist.".length) : section;
  // `hasOwn`, not `in`: an item named after something on Object's prototype
  // would otherwise resolve to a function.
  return Object.hasOwn(options, item) ? options[item] : undefined;
};

module.exports = {
  consumeIdeClient(service) {
    const adapter = {
      id: "ide-tinymist",
      displayName: "Tinymist Language Server",
      grammarScopes: ["source.typst"],
      sessionScope: "project-root",
      settingsKeyPaths: ["ide-tinymist"],
      async resolveServer(context) {
        const launch = await resolveServer(setting("serverPath"));
        if (!launch) {
          if (!missingReported) {
            missingReported = true;
            atom.notifications.addError("Unable to find tinymist", {
              description:
                "Install [tinymist](https://github.com/Myriad-Dreamin/tinymist) and make sure it is on your PATH, or set its location in the ide-tinymist settings.",
              dismissable: true,
            });
          }
          return null;
        }
        return { ...launch, cwd: context.rootPath, transport: "stdio" };
      },
      getInitializationOptions() {
        return tinymistOptions();
      },
      getSettings() {
        return { tinymist: tinymistOptions() };
      },
      getWorkspaceConfiguration(section) {
        return configurationFor(section);
      },
    };

    const subscriptions = new CompositeDisposable(service.registerAdapter(adapter));
    // Everything else reaches a running server through didChangeConfiguration.
    // Fonts are resolved once at startup, and which executable is running is
    // settled when it starts.
    const restart = () => {
      for (const session of service.getSessions()) {
        if (session.adapter !== adapter || ["stopping", "stopped"].includes(session.state))
          continue;
        service.restart(session).catch((error) => {
          atom.notifications.addError("Unable to restart Tinymist Language Server", {
            detail: error.message,
            dismissable: true,
          });
        });
      }
    };
    for (const key of ["serverPath", "fontPaths", "systemFonts"]) {
      subscriptions.add(atom.config.onDidChange(`ide-tinymist.${key}`, restart));
    }
    return subscriptions;
  },
};
