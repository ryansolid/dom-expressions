#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// Look for configuration in project root
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);
const config = resolveApp('dom-expressions.config.js');
if (!config) {
  console.warn('dom-expressions.config.js is missing in project root.');
  return 1;
}
const options = require(config);

console.log( resolveApp('dom-expressions.config.js'))
ejs.renderFile(path.join(__dirname, '../template/runtime.ejs'), options.variables).then(rendered => {
  fs.writeFileSync(path.join(resolveApp(options.output || 'runtime.js')), rendered);
})