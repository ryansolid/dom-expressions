import config from "../config";

export default (path, { opts })  => {
  path.hub.file.metadata.config = Object.assign({}, config, opts);
  const lib = config.requireImportSource;
  if (lib) {
    const comments = path.hub.file.ast.comments;
    for(let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      const index = comment.value.indexOf("@jsxImportSource");
      if (index > -1 && comment.value.slice(index).includes(lib)) return;
    }
    path.skip();
  }
};