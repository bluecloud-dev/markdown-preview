import fs from 'node:fs';
import path from 'node:path';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type PackageJson = {
  contributes: {
    commands: Array<{ command: string; enablement?: string }>;
    keybindings: Array<{ command: string; key: string; mac?: string; when?: string }>;
    menus: {
      commandPalette: Array<{ command: string; when?: string }>;
    };
    views?: {
      explorer?: Array<{ id: string; name: string; when?: string }>;
    };
  };
};

const loadPackageJson = (): PackageJson => {
  const packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf8')) as PackageJson;
};

describe('package contributions', () => {
  it('contributes reading-first focus and section navigation commands', () => {
    const packageJson = loadPackageJson();
    const commands = new Map(
      packageJson.contributes.commands.map((command) => [command.command, command]),
    );
    const commandPaletteCommands = new Map(
      packageJson.contributes.menus.commandPalette.map((entry) => [entry.command, entry]),
    );

    expect(commands.get('muninn.toggleFocusMode')).to.include({
      enablement: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(commandPaletteCommands.get('muninn.toggleFocusMode')).to.include({
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(commands.get('muninn.goToSection')).to.include({
      enablement: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(commandPaletteCommands.get('muninn.goToSection')).to.include({
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
  });

  it('contributes the Muninn Outline view under Explorer only for the Muninn editor', () => {
    const packageJson = loadPackageJson();
    const outlineView = packageJson.contributes.views?.explorer?.find(
      (view) => view.id === 'muninn.outline',
    );

    expect(outlineView).to.deep.equal({
      id: 'muninn.outline',
      name: '%view.muninn.outline.name%',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
  });

  it('contributes keyboard-first authoring shortcuts only for the Muninn editor', () => {
    const packageJson = loadPackageJson();
    const keybindings = new Map(
      packageJson.contributes.keybindings.map((binding) => [binding.command, binding]),
    );

    expect(keybindings.get('muninn.insertLink')).to.deep.include({
      key: 'ctrl+k',
      mac: 'cmd+k',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.setHeading1')).to.deep.include({
      key: 'ctrl+alt+1',
      mac: 'cmd+alt+1',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.setHeading2')).to.deep.include({
      key: 'ctrl+alt+2',
      mac: 'cmd+alt+2',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.setHeading3')).to.deep.include({
      key: 'ctrl+alt+3',
      mac: 'cmd+alt+3',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.setParagraph')).to.deep.include({
      key: 'ctrl+alt+0',
      mac: 'cmd+alt+0',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.toggleBulletList')).to.deep.include({
      key: 'ctrl+shift+8',
      mac: 'cmd+shift+8',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.toggleNumberedList')).to.deep.include({
      key: 'ctrl+shift+7',
      mac: 'cmd+shift+7',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
    expect(keybindings.get('muninn.insertCodeBlock')).to.deep.include({
      key: 'ctrl+alt+c',
      mac: 'cmd+alt+c',
      when: 'activeCustomEditorId == muninn.markdownEditor',
    });
  });
});
