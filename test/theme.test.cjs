const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const filename = require("node:path").resolve(__dirname, "../src/constants/theme.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(filename);
loaded._compile(compiled, filename);
const { themes, themeVariables } = loaded.exports;

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const [mode, theme] of Object.entries(themes)) {
  test(`${mode} theme keeps text and controls readable`, () => {
    const c = theme.colors;
    for (const [foreground, background] of [
      [c.foreground, c.background], [c.cardForeground, c.card],
      [c.primaryForeground, c.primary], [c.mutedForeground, c.card],
      [c.secondaryForeground, c.secondary],
      ...Object.values(theme.statusColors).map((palette) => [palette.foreground, palette.background]),
    ]) assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background}`);
  });
  test(`${mode} exposes RGB variables for NativeWind and opacity utilities`, () => {
    const variables = themeVariables(theme);
    assert.ok(Object.values(variables).every((value) => /^\d+ \d+ \d+$/.test(value)));
    assert.equal(variables["--ring"], variables["--primary"]);
    assert.equal(variables["--popover"], variables["--card"]);
  });
}
