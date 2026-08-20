import fs from 'node:fs';
import path from 'node:path';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type PackageJson = {
  version: string;
  preview?: boolean;
  repository: { url: string };
  bugs: { url: string };
  homepage: string;
  badges: Array<{ url: string; href: string }>;
  contributes: {
    customEditors: Array<{ viewType: string; priority?: string }>;
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

const repoRoot = path.resolve(__dirname, '..', '..', '..');

const loadPackageJson = (): PackageJson => {
  const packagePath = path.join(repoRoot, 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf8')) as PackageJson;
};

const readRepoFile = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const GITHUB_REPOSITORY_SLUG = 'bluecloud-dev/markdown-preview';

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

describe('marketplace release metadata', () => {
  it('uses a plain major.minor.patch version the VS Marketplace accepts', () => {
    // vsce refuses to publish semver prerelease tags such as 2.0.0-alpha.1.
    expect(loadPackageJson().version).to.match(/^\d+\.\d+\.\d+$/);
  });

  it('carries the Preview flag while the extension is pre-1.0', () => {
    const packageJson = loadPackageJson();
    if (packageJson.version.startsWith('0.')) {
      expect(packageJson.preview, 'pre-1.0 releases must set "preview": true').to.equal(true);
    }
  });

  it('has a CHANGELOG section matching the manifest version', () => {
    // release.yml extracts release notes by searching for this exact header.
    const { version } = loadPackageJson();
    const header = `## [${version}]`;
    const hasSection = readRepoFile('CHANGELOG.md')
      .split('\n')
      .some((line) => line.startsWith(header));

    expect(hasSection, `CHANGELOG.md must contain a "${header}" section`).to.equal(true);
  });

  it('points every marketplace URL at the real GitHub repository', () => {
    const packageJson = loadPackageJson();
    const urls = [
      packageJson.repository.url,
      packageJson.bugs.url,
      packageJson.homepage,
      ...packageJson.badges.flatMap((badge) => [badge.url, badge.href]),
    ];

    for (const url of urls) {
      expect(url, `${url} must reference ${GITHUB_REPOSITORY_SLUG}`).to.contain(
        GITHUB_REPOSITORY_SLUG,
      );
    }
  });

  it('documents the same markdown ownership the manifest declares', () => {
    const packageJson = loadPackageJson();
    const customEditor = packageJson.contributes.customEditors.find(
      (editor) => editor.viewType === 'muninn.markdownEditor',
    );

    // "default" means VS Code opens matching files in Muninn automatically, so the docs must not
    // claim users have to reach for Reopen With… first.
    expect(customEditor?.priority).to.equal('default');
    expect(readRepoFile('README.md')).to.contain('default editor for');
  });
});
