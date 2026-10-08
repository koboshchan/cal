import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

export function loadTs(relativePath, mocks = {}, globals = {}) {
  const url = new URL(relativePath, import.meta.url);
  const require = createRequire(url);
  const code = ts.transpileModule(fs.readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, Date, ...globals, require: (name) => name in mocks ? mocks[name] : require(name) };
  vm.runInNewContext(code, context, { filename: url.pathname });
  return context.exports;
}
