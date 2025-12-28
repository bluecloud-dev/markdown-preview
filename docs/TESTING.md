# Testing Guide

This guide explains how to run, write, and debug tests for the Markdown Preview extension.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking Strategies](#mocking-strategies)
- [Test Fixtures](#test-fixtures)
- [Coverage](#coverage)
- [Debugging Tests](#debugging-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The extension uses a two-tier testing strategy:

| Type | Location | Framework | Purpose |
|------|----------|-----------|---------|
| **Unit Tests** | `tests/unit/` | Mocha + Sinon + Chai | Test services in isolation with mocked VS Code APIs |
| **Integration Tests** | `tests/integration/` | Mocha + @vscode/test-electron | Test extension behavior within a real VS Code instance |

### Test Stack

- **Mocha** - Test framework (BDD style with `describe`/`it`)
- **Chai** - Assertion library (`expect` style)
- **Sinon** - Mocking, stubbing, and spying
- **@vscode/test-electron** - VS Code integration test runner

## Test Structure

```
tests/
├── run-test.ts              # Integration test runner entry point
├── suite/
│   └── index.ts             # Mocha test suite loader
├── unit/                    # Unit tests (mocked VS Code APIs)
│   ├── state-service.test.ts
│   ├── config-service.test.ts
│   ├── formatting-service.test.ts
│   └── validation-service.test.ts
├── integration/             # Integration tests (real VS Code)
│   ├── preview-mode.test.ts
│   ├── edit-mode.test.ts
│   ├── commands.test.ts
│   ├── formatting.test.ts
│   ├── performance.test.ts
│   └── observability.test.ts
└── fixtures/                # Test data files
    ├── sample.md            # Normal markdown file
    └── large-file.md        # File >1MB for size tests
```

## Running Tests

### All Tests (Integration)

```bash
npm test
```

This launches VS Code with the extension loaded and runs all test suites.

> **Note:** The integration runner may attempt to download a VS Code build.
> If the download host is unavailable, it will fall back to any cached
> `.vscode-test` install. This is expected when running offline.

### Individual Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all integration tests |
| `npm run test:integration` | Same as `npm test` |
| `npm run coverage` | Run tests with code coverage |
| `npm run lint` | Lint check (not tests, but related) |

### Via VS Code

1. Open the project in VS Code
2. Go to **Run and Debug** sidebar (`Ctrl+Shift+D`)
3. Select "Extension Tests" from the dropdown
4. Press `F5` or click the green play button

## Manual Acceptance Checklist (Quickstart Validation)

Run these checks in the Extension Development Host to validate user stories,
edge cases, and accessibility behavior.

### US1: Preview by Default
- [ ] Open a `.md` file from Explorer → preview opens automatically
- [ ] Quick Open (`Ctrl+P`) a `.md` file → preview opens automatically
- [ ] Go to Definition into a `.md` file → preview opens automatically
- [ ] Disable `markdownReader.enabled` → file opens in editor
- [ ] Open a large file (>1MB) → prompt appears with opt-in preview

### US2: Edit Mode
- [ ] Run **Enter Edit Mode** → split view (editor left, preview right)
- [ ] Click **Done (Exit Edit Mode)** → preview-only
- [ ] Toggle with `Ctrl+Shift+V` / `Cmd+Shift+V` → mode switches
- [ ] Cursor restores to last position when re-entering edit mode

### US3: Toolbar Formatting
- [ ] Bold/Italic/Strikethrough wrap selection
- [ ] Bullet/Numbered list toggles current line prefix
- [ ] Inline code / code block insert correctly
- [ ] Link prompt inserts `[text](url)`
- [ ] Heading 1/2/3 toggle prefixes

### US4: Context Menu Formatting
- [ ] Right-click in edit mode → **Format** menu appears
- [ ] Heading + Code submenus appear and execute commands

### US5: Keyboard Shortcuts
- [ ] Bold (`Ctrl+B` / `Cmd+B`) in edit mode
- [ ] Italic (`Ctrl+I` / `Cmd+I`) in edit mode
- [ ] Toggle edit mode (`Ctrl+Shift+V` / `Cmd+Shift+V`)

### US6: Configuration
- [ ] `excludePatterns` prevents auto-preview in matching paths
- [ ] `maxFileSize` blocks auto-preview and prompts

### Edge Cases
- [ ] Untitled markdown opens in edit mode
- [ ] Diff view (`git:` or `diff:`) is ignored
- [ ] Binary file shows error and stays in editor
- [ ] Conflict markers open in edit mode

### Error Handling + Observability
- [ ] Preview failure shows **Open in Editor** action
- [ ] Output channel logs warnings/errors
- [ ] State changes show transient status bar messages

### Accessibility & Keyboard Navigation
- [ ] Use **Toggle Tab Key Moves Focus** (Command Palette) to enable UI tabbing
- [ ] Tab moves focus to the first toolbar button
- [ ] Shift+Tab moves focus backward
- [ ] Enter/Space activates toolbar buttons
- [ ] Escape returns focus to the text editor

### Watch Mode (Development)

For continuous testing during development:

```bash
npm run compile  # Initial build
# Then manually re-run npm test after changes
```

> **Tip:** Use the VS Code test runner for interactive test debugging.

## Writing Tests

### Unit Test Template

```typescript
import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { MyService } from '../../src/services/my-service';

describe('MyService', () => {
  // Runs before each test - set up stubs
  beforeEach(() => {
    // Stub vscode.l10n.t for localization
    const l10nStub = sinon.stub(vscode.l10n, 't') as sinon.SinonStub;
    l10nStub.callsFake((message: string) => message);
  });

  // Runs after each test - clean up
  afterEach(() => {
    sinon.restore();
  });

  describe('myMethod', () => {
    it('should return expected result', () => {
      const service = new MyService();
      const result = service.myMethod('input');
      expect(result).to.equal('expected');
    });

    it('should handle edge case', () => {
      const service = new MyService();
      expect(() => service.myMethod('')).to.throw('Invalid input');
    });
  });
});
```

### Integration Test Template

```typescript
import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { MyService } from '../../src/services/my-service';

// Helper to create a mock Memento (for workspaceState/globalState)
const createMemento = (): vscode.Memento => {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      if (store.has(key)) {
        return store.get(key) as T;
      }
      return defaultValue as T;
    },
    update: async (key: string, value: unknown): Promise<void> => {
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};

describe('MyService Integration', () => {
  beforeEach(() => {
    const l10nStub = sinon.stub(vscode.l10n, 't') as sinon.SinonStub;
    l10nStub.callsFake((message: string) => message);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should integrate with VS Code APIs', async () => {
    // Stub VS Code commands
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const service = new MyService(createMemento());
    await service.doSomething();

    expect(vscode.commands.executeCommand).to.have.been.calledWith(
      'markdown.showPreview'
    );
  });
});
```

### Assertion Patterns

```typescript
// Basic assertions
expect(value).to.equal(expected);
expect(value).to.be.true;
expect(value).to.be.false;
expect(value).to.be.undefined;
expect(array).to.have.lengthOf(3);
expect(object).to.have.property('key');

// Async assertions
await expect(promise).to.eventually.equal(expected);

// Exception assertions
expect(() => fn()).to.throw('error message');
await expect(asyncFn()).to.be.rejectedWith('error message');

// Sinon spy assertions
expect(stub.calledOnce).to.be.true;
expect(stub.calledWith('arg1', 'arg2')).to.be.true;
expect(stub.calledBefore(otherStub)).to.be.true;
```

## Mocking Strategies

### Mocking VS Code APIs

VS Code APIs are not available in unit tests, so we mock them:

```typescript
// Mock vscode.window.showTextDocument
const editor = {
  selection: new vscode.Selection(
    new vscode.Position(0, 0),
    new vscode.Position(0, 0)
  ),
  revealRange: sinon.stub(),
  document: { uri: vscode.Uri.file('/tmp/test.md') },
} as unknown as vscode.TextEditor;

sinon.stub(vscode.window, 'showTextDocument').resolves(editor);
```

### Mocking Memento (State Storage)

```typescript
const createMemento = (): vscode.Memento => {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      if (store.has(key)) {
        return store.get(key) as T;
      }
      return defaultValue as T;
    },
    update: async (key: string, value: unknown): Promise<void> => {
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};
```

### Mocking Configuration

```typescript
sinon.stub(vscode.workspace, 'getConfiguration').returns({
  get: (key: string, defaultValue: unknown) => {
    const values: Record<string, unknown> = {
      enabled: true,
      excludePatterns: ['**/node_modules/**'],
      maxFileSize: 1048576,
    };
    return values[key] ?? defaultValue;
  },
  has: () => true,
  inspect: () => undefined,
  update: async () => {},
} as unknown as vscode.WorkspaceConfiguration);
```

### Mocking Logger

```typescript
const createLogger = () => ({
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  show: sinon.stub(),
}) as unknown as Logger;
```

## Test Fixtures

Test fixtures are located in `tests/fixtures/`:

| File | Purpose |
|------|---------|
| `sample.md` | Normal markdown for basic tests |
| `large-file.md` | File >1MB for large file handling tests |

### Creating New Fixtures

1. Add file to `tests/fixtures/`
2. Reference with path resolution:
   ```typescript
   const fixturePath = path.resolve(
     __dirname,
     '..',
     '..',
     '..',
     'tests',
     'fixtures',
     'my-fixture.md'
   );
   const uri = vscode.Uri.file(fixturePath);
   ```

## Coverage

### Running Coverage

```bash
npm run coverage
```

This generates a coverage report in the `coverage/` directory.

> The coverage script uses a small shim to ensure `os.cpus()` reports at least
> one CPU in constrained environments. This avoids nyc concurrency errors.
> Coverage runs the unit test suite in Node with a lightweight `vscode` stub;
> integration tests still run via `npm test`.
> Coverage is collected from the compiled output in `out/src`, so run
> `npm run compile` before `npm run coverage`.

### Coverage Requirements

The project enforces minimum coverage thresholds:

| Metric | Minimum |
|--------|---------|
| Branches | 80% |
| Lines | 80% |
| Functions | 80% |
| Statements | 80% |

### Viewing Coverage Reports

- **Terminal:** Summary printed after tests
- **HTML:** Open `coverage/lcov-report/index.html` in a browser
- **LCOV:** `coverage/lcov.info` for CI integration

### Improving Coverage

Focus on:

1. **Edge cases** - Empty inputs, error conditions
2. **Branches** - All `if/else` paths
3. **Error handling** - Catch blocks, validation failures

## Debugging Tests

### Using VS Code Debugger

1. Set breakpoints in test files or source files
2. Open **Run and Debug** (`Ctrl+Shift+D`)
3. Select "Extension Tests"
4. Press `F5`
5. Tests run with debugger attached

### Console Output

Add temporary `console.log()` statements:

```typescript
it('should work', () => {
  const result = service.method();
  console.log('Result:', result);  // Shows in Debug Console
  expect(result).to.equal(expected);
});
```

### Isolating Tests

Run a single test by adding `.only`:

```typescript
describe.only('MyService', () => {  // Only this suite runs
  it.only('should work', () => {    // Only this test runs
    // ...
  });
});
```

> **Remember:** Remove `.only` before committing!

## CI Parity

To mirror CI locally:

```bash
npm run compile
npm test
npm run lint
```

Add `npm run coverage` when checking branch coverage locally.

### Skipping Tests

Skip tests temporarily with `.skip`:

```typescript
it.skip('not ready yet', () => {
  // This test won't run
});
```

## Best Practices

### DO

- **Test behavior, not implementation** - Focus on inputs and outputs
- **Use descriptive test names** - `it('should return preview mode when file is markdown')`
- **One assertion per test** - Makes failures clear
- **Clean up after tests** - Use `afterEach` with `sinon.restore()`
- **Test edge cases** - Empty values, large inputs, error conditions
- **Keep tests fast** - Mock I/O operations

### DON'T

- **Don't test private methods** - Test through public API
- **Don't share state between tests** - Each test should be independent
- **Don't use real file system** - Mock `vscode.workspace.fs`
- **Don't skip cleanup** - Leaking state causes flaky tests
- **Don't test VS Code itself** - Trust the framework

### Naming Conventions

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // ...
    });
  });
});
```

Examples:
- `should return true when file is markdown`
- `should throw error when URI is invalid`
- `should update state when mode changes`

## Troubleshooting

### Tests Not Running

**Symptom:** `npm test` hangs or shows no output

**Solutions:**
1. Close all VS Code windows before running tests
2. Run `npm run compile` first
3. Check for syntax errors in test files

### Flaky Tests

**Symptom:** Tests pass sometimes, fail sometimes

**Solutions:**
1. Check for shared state between tests
2. Add proper `afterEach` cleanup
3. Ensure async operations complete before assertions

### Mock Not Working

**Symptom:** Real implementation called instead of mock

**Solutions:**
1. Ensure stub is created before code runs
2. Check the import path matches exactly
3. Verify `sinon.restore()` is called in `afterEach`

### Coverage Too Low

**Symptom:** Coverage below 80% threshold

**Solutions:**
1. Check `coverage/lcov-report/index.html` for uncovered lines
2. Add tests for missed branches
3. Add tests for error handling paths

### TypeScript Errors in Tests

**Symptom:** Type errors when mocking

**Solutions:**
1. Use `as unknown as TargetType` for partial mocks
2. Ensure test tsconfig includes all necessary types
3. Check that `@types/mocha`, `@types/chai`, `@types/sinon` are installed

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - Understanding the codebase
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
