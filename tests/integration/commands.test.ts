import { expect } from 'chai';
import * as vscode from 'vscode';

describe('Command registration', () => {
  it('registers edit mode commands', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.markdown-reader');
    expect(extension).to.not.equal(undefined);
    await extension?.activate();

    const commands = await vscode.commands.getCommands(true);
    expect(commands).to.include('markdownReader.enterEditMode');
    expect(commands).to.include('markdownReader.exitEditMode');
    expect(commands).to.include('markdownReader.toggleEditMode');
  });
});
