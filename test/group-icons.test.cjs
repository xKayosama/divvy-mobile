const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { groupIcons, resolveGroupIcon } = require('../src/features/groups/groupIcons.ts');
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
test('group icons have unique identifiers, labels and available glyphs', () => {
  assert.equal(new Set(groupIcons.map(icon => icon.value)).size, groupIcons.length);
  for (const icon of groupIcons) {
    assert.ok(icon.label);
    assert.ok(glyphs[icon.glyph]);
    assert.equal(resolveGroupIcon(icon.value), icon);
  }
});
test('legacy and unknown group icons fall back to People', () => {
  for (const value of [undefined, null, '', 'invalid']) assert.equal(resolveGroupIcon(value).value, 'people');
});
