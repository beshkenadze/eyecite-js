# Scripts

## bump-version.ts

Interactive version bumping tool for the eyecite-js package.

### Usage

```bash
# Interactive mode - prompts for version type
bun run bump

# Direct bump commands (future enhancement)
bun run bump:patch  # Bug fixes (1.2.3 → 1.2.4)
bun run bump:minor  # New features (1.2.3 → 1.3.0)
bun run bump:major  # Breaking changes (1.2.3 → 2.0.0)
```

### Features

- **Interactive prompts** for choosing version bump type
- **Prerelease support** (alpha, beta, rc)
- **Custom version** input option
- **Git integration**:
  - Auto-commit with conventional commit message
  - Create git tag (v{version})
  - Optional push to remote
- **Build integration**: Optional package build after version bump
- **NPM publishing**: Optional publish with appropriate npm tag
- **Color-coded output** for better readability

### Version Types

1. **Patch**: Bug fixes and minor updates (x.x.X)
2. **Minor**: New features, backward compatible (x.X.0)
3. **Major**: Breaking changes (X.0.0)
4. **Alpha**: Early testing versions (x.x.x-alpha.N)
5. **Beta**: Feature-complete testing (x.x.x-beta.N)
6. **RC**: Release candidates (x.x.x-rc.N)
7. **Custom**: Specify any valid semver version

### NPM Tags

The script automatically determines the appropriate npm tag:
- `latest`: For stable releases
- `alpha`: For alpha versions
- `beta`: For beta versions
- `rc`: For release candidates
- `next`: For other prerelease versions

### Example Session

```
📦 Version Bump Tool
Current version: 2.7.6-alpha.26

Choose version bump type:
  1) Patch  (bug fixes)           → 2.7.7
  2) Minor  (new features)        → 2.8.0
  3) Major  (breaking changes)    → 3.0.0
  4) Prerelease (increment)       → 2.7.6-alpha.27
  7) Custom (specify version)
  0) Cancel

Enter your choice (0-7): 4

New version will be: 2.7.6-alpha.27

Do you want to proceed? (y/n): y
✓ Updated package.json

Do you want to commit and tag? (y/n): y
✓ Staged package.json
✓ Created commit
✓ Created tag: v2.7.6-alpha.27

Do you want to push to remote? (y/n): y
✓ Pushed commits
✓ Pushed tags

Do you want to build the package? (y/n): y
Building package...
✓ Build complete

Do you want to publish to npm? (y/n): n

✨ Version bump complete!
Version changed from 2.7.6-alpha.26 to 2.7.6-alpha.27
```