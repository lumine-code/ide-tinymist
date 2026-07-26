const { resolveServer } = require("./server");

let missingReported = false;

module.exports = {
  consumeLanguageServer(service) {
    return service.registerAdapter({
      id: "ide-tinymist",
      displayName: "Tinymist Language Server",
      grammarScopes: ["source.typst"],
      sessionScope: "project-root",
      async resolveServer(context) {
        const launch = await resolveServer(atom.config.get("ide-tinymist.serverPath"));
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
      getWorkspaceConfiguration(section) {
        return section ? atom.config.get(section) : {};
      },
    });
  },
};
