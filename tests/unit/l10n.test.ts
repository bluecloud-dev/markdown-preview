import { t } from '../../src/utils/l10n';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



describe('l10n', () => {
  it('formats messages with placeholders', () => {
    expect(t('Hello {0}', 'world')).to.equal('Hello world');
    expect(t('Value: {0}', true)).to.equal('Value: true');
    expect(t('No placeholders')).to.equal('No placeholders');
  });
});
