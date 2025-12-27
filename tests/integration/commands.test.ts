import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';
import * as vscode from 'vscode';

type PackageJsonKeybinding = {
  command: string;
  key: string;
  mac?: string;
  when?: string;
};

const loadPackageJsonKeybindings = (): PackageJsonKeybinding[] => {
  const packageJsonPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(raw) as {
    contributes?: { keybindings?: PackageJsonKeybinding[] };
  };
  return packageJson.contributes?.keybindings ?? [];
};

describe('Command registration', () => {
  it('registers edit mode commands', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.markdown-preview');
    expect(extension).to.not.equal(undefined);
    await extension?.activate();

    const commands = await vscode.commands.getCommands(true);
    expect(commands).to.include('markdownReader.enterEditMode');
    expect(commands).to.include('markdownReader.exitEditMode');
    expect(commands).to.include('markdownReader.toggleEditMode');
  });

  it('defines keyboard shortcuts for edit mode and formatting', () => {
    const keybindings = loadPackageJsonKeybindings();

    const toggleEdit = keybindings.find(
      (binding) => binding.command === 'markdownReader.toggleEditMode'
    );
    expect(toggleEdit, 'missing toggleEditMode keybinding').to.not.equal(undefined);
    expect(toggleEdit?.key).to.equal('ctrl+shift+v');
    expect(toggleEdit?.mac).to.equal('cmd+shift+v');
    expect(toggleEdit?.when).to.include('resourceLangId == markdown');

    const boldBinding = keybindings.find(
      (binding) => binding.command === 'markdownReader.formatBold'
    );
    expect(boldBinding, 'missing formatBold keybinding').to.not.equal(undefined);
    expect(boldBinding?.key).to.equal('ctrl+b');
    expect(boldBinding?.mac).to.equal('cmd+b');
    expect(boldBinding?.when).to.include('markdownReader.editMode');
    expect(boldBinding?.when).to.include('editorLangId == markdown');
    expect(boldBinding?.when).to.include('editorTextFocus');

    const italicBinding = keybindings.find(
      (binding) => binding.command === 'markdownReader.formatItalic'
    );
    expect(italicBinding, 'missing formatItalic keybinding').to.not.equal(undefined);
    expect(italicBinding?.key).to.equal('ctrl+i');
    expect(italicBinding?.mac).to.equal('cmd+i');
    expect(italicBinding?.when).to.include('markdownReader.editMode');
    expect(italicBinding?.when).to.include('editorLangId == markdown');
    expect(italicBinding?.when).to.include('editorTextFocus');
  });
});
