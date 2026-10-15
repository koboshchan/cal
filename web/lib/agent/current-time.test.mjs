import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

// Exercise the actual request expression without a provider, database or native sandbox.
const source = fs.readFileSync(path.join(import.meta.dirname, "run.ts"), "utf8");
const expression = source.match(/system: (SYSTEM_PROMPT \+[\s\S]*?),\n      messages:/)[1];
const timezone = ts.transpileModule(
  fs.readFileSync(path.join(import.meta.dirname, "../timezone.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const timezoneContext = { exports: {}, require: createRequire(import.meta.url) };
vm.runInNewContext(timezone, timezoneContext);

function promptAt(instant, zone = "America/Vancouver") {
  return vm.runInNewContext(expression, {
    SYSTEM_PROMPT: "instructions",
    session: { timezone: zone },
    formatInZone: timezoneContext.exports.formatInZone,
    Date: class extends Date { constructor() { super(instant); } },
  });
}

test("consecutive model turns refresh the clock across local midnight", () => {
  const first = promptAt("2026-10-08T06:30:00Z");
  const next = promptAt("2026-10-08T15:30:00Z");
  assert.match(first, /2026-10-07T23:30:00/);
  assert.match(next, /2026-10-08T08:30:00/);
  assert.notEqual(first, next);
});

test("the request clock uses the session timezone, not server time", () => {
  assert.match(promptAt("2026-10-08T15:30:00Z", "Asia/Shanghai"), /2026-10-08T23:30:00/);
});

test("fresh requests supersede legacy timestamps without persisting an initial clock", () => {
  assert.match(promptAt("2026-10-08T15:30:00Z"), /instead of any older timestamp/);
  const initial = source.slice(0, source.indexOf("export function initializeSession"));
  assert(!initial.includes("Current date/time"));
});
