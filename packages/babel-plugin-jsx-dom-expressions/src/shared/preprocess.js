import config from "../config";

export default (path, state) => {
  const merged = (path.hub.file.metadata.config = Object.assign({}, config, state.opts));
  const lib = merged.requireImportSource;
  if (lib) {
    const comments = path.hub.file.ast.comments;
    let process = false;
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      const pieces = comment.value.split("@jsxImportSource");
      if (pieces.length === 2 && pieces[1].trim() === lib) {
        process = true;
        break;
      }
    }
    if (!process) {
      state.skip = true;
      return;
    }
  }
};
