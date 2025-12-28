# Release Guide

This guide covers the complete release process for the Markdown Preview extension, from preparation to publication.

## Table of Contents

- [Version Strategy](#version-strategy)
- [Pre-Release Checklist](#pre-release-checklist)
- [Release Process](#release-process)
- [Post-Release Validation](#post-release-validation)
- [Rollback Procedure](#rollback-procedure)
- [Marketplace Publishing](#marketplace-publishing)

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):

| Version Part | When to Increment | Example |
|--------------|-------------------|---------|
| **MAJOR** (X.0.0) | Breaking changes, major rewrites | 1.0.0 → 2.0.0 |
| **MINOR** (0.X.0) | New features, backward compatible | 1.0.0 → 1.1.0 |
| **PATCH** (0.0.X) | Bug fixes, documentation | 1.0.0 → 1.0.1 |

### Version Examples

- `0.1.0` - Initial preview release
- `0.2.0` - Added formatting toolbar
- `0.2.1` - Fixed bold button not working
- `1.0.0` - First stable release
- `1.1.0` - Added heading submenu

### Pre-release Versions

For testing before official release:

- `1.0.0-alpha.1` - Early development
- `1.0.0-beta.1` - Feature complete, testing
- `1.0.0-rc.1` - Release candidate

## Pre-Release Checklist

Complete all items before creating a release.

### 1. Code Quality

```bash
# Ensure clean build
npm run compile

# Run all tests
npm test

# Run linter with no warnings
npm run lint

# Check test coverage meets threshold (80%)
npm run coverage
```

**All commands must pass with zero errors.**

### 2. Documentation Updates

- [ ] **README.md** - Features list matches current functionality
- [ ] **README.md** - Features/Commands list only what ships in this release (no milestone or version labels)
- [ ] **README.md** - Screenshots/GIFs are current
- [ ] **README.md** - Keyboard shortcuts table is accurate
- [ ] **README.md** - Configuration options table is complete
- [ ] **CHANGELOG.md** - New section for this version
- [ ] **CHANGELOG.md** - All changes since last release documented

### 3. Version Bump

Update version in `package.json`:

```json
{
  "version": "X.Y.Z"
}
```

**Important:** Version must match the Git tag you'll create.

### 4. CHANGELOG Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.1.0] - 2024-01-15

### Added
- Heading submenu with H1, H2, H3 options (#42)
- Keyboard shortcut for strikethrough (Ctrl+Shift+S)

### Changed
- Improved toolbar button icons for better visibility

### Fixed
- Bold formatting not working with multi-line selection (#38)
- Preview not opening for files with spaces in name (#41)

### Deprecated
- None

### Removed
- None

### Security
- None
```

### 5. Package Verification

```bash
# Create VSIX package
npm run package

# This creates: markdown-preview-X.Y.Z.vsix
```

**Verify package contents:**

```bash
# List package contents (requires vsce)
npx vsce ls
```

**Expected files:**

- `extension.js` - Compiled extension
- `package.json` - Manifest with correct version
- `README.md` - User documentation
- `CHANGELOG.md` - Version history
- `LICENSE` - MIT license
- `assets/icon.png` - 128x128 extension icon

### 6. Local Testing

**Install from VSIX:**

1. Open VS Code
2. Extensions view (`Ctrl+Shift+X`)
3. `...` menu > "Install from VSIX..."
4. Select the generated `.vsix` file

**Manual test checklist:**

- [ ] Open markdown file → Shows preview
- [ ] `Ctrl+Shift+V` → Enters edit mode
- [ ] `Ctrl+Shift+V` again → Exits edit mode
- [ ] Bold button works with selection
- [ ] Italic button works with selection
- [ ] Bullet list toggles correctly
- [ ] Settings changes take effect
- [ ] Excluded paths open in editor

## Release Process

### Step 1: Final Commit

```bash
# Commit version bump and changelog
git add package.json CHANGELOG.md
git commit -m "chore(release): v1.1.0"
```

### Step 2: Create Git Tag

```bash
# Create annotated tag
git tag -a v1.1.0 -m "Release v1.1.0"

# Push commit and tag
git push origin main
git push origin v1.1.0
```

### Step 3: Create GitHub Release

1. Go to repository > Releases > "Create a new release"
2. Select the tag you just pushed
3. Title: `v1.1.0`
4. Description: Copy from CHANGELOG.md
5. Attach the `.vsix` file
6. Check "Set as the latest release"
7. Publish release

### Step 4: Publish to Marketplace

See [Marketplace Publishing](#marketplace-publishing) section below.

## Post-Release Validation

After publishing, verify the release works correctly.

### From Marketplace

1. **Search for extension**
   - Open VS Code Extensions view
   - Search "Markdown Preview"
   - Verify correct version appears

2. **Fresh install**
   - Use a clean VS Code profile or VM
   - Install from marketplace
   - Run through manual test checklist

3. **Upgrade path**
   - Have a machine with previous version
   - Update extension
   - Verify no issues, settings preserved

### Monitoring

- [ ] Check GitHub Issues for new bug reports
- [ ] Monitor marketplace reviews for feedback
- [ ] Respond to any critical issues within 24 hours

## Rollback Procedure

If a critical bug is found after release:

### Quick Rollback (Unpublish)

```bash
# Unpublish specific version (requires vsce)
npx vsce unpublish blueclouddev.markdown-preview@1.1.0
```

**Note:** Users who already installed won't be affected.

### Patch Release

For bugs that need immediate fix:

1. Create fix on a hotfix branch
2. Test thoroughly
3. Bump patch version (1.1.0 → 1.1.1)
4. Follow release process
5. Update CHANGELOG noting the fix

### Informing Users

For critical issues:

1. Update README with known issues section
2. Post in GitHub Issues
3. Consider adding in-extension notification for severe issues

## Marketplace Publishing

### Prerequisites

1. **Azure DevOps Account**
   - Create at https://dev.azure.com/

2. **Personal Access Token (PAT)**
   - Azure DevOps > User Settings > Personal Access Tokens
   - Create token with "Marketplace (publish)" scope
   - Save token securely

3. **Publisher Account**
   - https://marketplace.visualstudio.com/manage
   - Create publisher if not exists

### First-Time Setup

```bash
# Install vsce globally
npm install -g @vscode/vsce

# Login with PAT (one-time)
npx vsce login <publisher-name>
# Enter PAT when prompted
```

### Publishing Commands

```bash
# Publish to marketplace
npx vsce publish

# Or publish specific version
npx vsce publish 1.1.0

# Or publish from VSIX
npx vsce publish --packagePath markdown-preview-1.1.0.vsix
```

### Marketplace Metadata

Ensure `package.json` has all required fields:

```json
{
  "name": "markdown-preview",
  "displayName": "Markdown Preview",
  "description": "Open markdown files in preview mode by default.",
  "version": "1.1.0",
  "publisher": "blueclouddev",
  "license": "MIT",
  "icon": "assets/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/ayhammouda/markdown-preview"
  },
  "categories": ["Other"],
  "keywords": [
    "markdown",
    "preview",
    "reader",
    "documentation",
    "reading"
  ],
  "engines": {
    "vscode": "^1.107.0"
  }
}
```

### Icon Requirements

- **Size:** 128x128 pixels exactly
- **Format:** PNG with transparency
- **Location:** `images/icon.png`
- **Design:** Works on light and dark backgrounds

## Automated Releases (Future)

For future automation with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run package
      - uses: softprops/action-gh-release@v1
        with:
          files: '*.vsix'
```

## Release Schedule

**Recommended cadence:**

- **Patch releases:** As needed for bug fixes
- **Minor releases:** Every 2-4 weeks with new features
- **Major releases:** When breaking changes are necessary

**Avoid releasing:**

- Friday afternoons (harder to respond to issues)
- Before holidays
- Multiple releases in one day (unless critical fixes)

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Development workflow
- [TESTING.md](TESTING.md) - Running tests
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
