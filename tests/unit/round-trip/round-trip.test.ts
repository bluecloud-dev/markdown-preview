import { evaluateCorpus, formatMismatch, loadDeviationRecords, loadFixtureCases } from './corpus';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('round-trip golden corpus', () => {
  const outcomes = evaluateCorpus();

  it('covers at least 40 cases', () => {
    expect(outcomes.length).to.be.at.least(40);
  });

  it('deviations.json references existing fixtures only, without duplicates', () => {
    const fixtureNames = new Set(loadFixtureCases().map((fixture) => fixture.name));
    const seen = new Set<string>();
    for (const record of loadDeviationRecords()) {
      expect(
        fixtureNames.has(record.fixture),
        `deviations.json references unknown fixture: ${record.fixture}`,
      ).to.equal(true);
      expect(
        seen.has(record.fixture),
        `deviations.json lists ${record.fixture} more than once`,
      ).to.equal(false);
      seen.add(record.fixture);
    }
  });

  const improvementHint =
    'improvement! Re-classify it in deviations.json (or remove the entry so it joins ' +
    'the strict set), then regenerate the report via npm run test:roundtrip.';

  for (const outcome of outcomes) {
    const { deviation } = outcome;
    if (deviation?.kind === 'final-newline-only') {
      it(`${outcome.fixtureName} — documented deviation, final newline only`, () => {
        expect(
          outcome.matches,
          `${outcome.fixtureName} now round-trips byte-identically — ${improvementHint}`,
        ).to.equal(false);
        expect(
          outcome.tailNewlineOnly,
          `${outcome.fixtureName} diverges beyond the trailing newline — the documented ` +
            `deviation no longer describes reality\n${formatMismatch(outcome.input, outcome.output)}`,
        ).to.equal(true);
      });
    } else if (deviation) {
      it(`${outcome.fixtureName} — documented deviation (${deviation.category})`, () => {
        expect(
          outcome.matches,
          `${outcome.fixtureName} now round-trips byte-identically — ${improvementHint}`,
        ).to.equal(false);
        expect(
          outcome.tailNewlineOnly,
          `${outcome.fixtureName} now fails only by the trailing newline — ${improvementHint}`,
        ).to.equal(false);
      });
    } else {
      it(`${outcome.fixtureName} — byte-identical`, () => {
        expect(
          outcome.matches,
          `${outcome.fixtureName} failed round-trip\n${formatMismatch(outcome.input, outcome.output)}`,
        ).to.equal(true);
      });
    }
  }
});
