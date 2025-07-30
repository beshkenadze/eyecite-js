# Publishing Guide

This package is published to npm as `@beshkenadze/eyecite`.

## Prerequisites

1. **npm account**: You need an npm account with publish permissions for the `@beshkenadze` scope
2. **Authentication**: Login to npm:
   ```bash
   npm login
   ```

## Publishing Methods

### Method 1: Manual Publishing (Recommended for Initial Setup)

1. **Update version in package.json**:
   ```bash
   bun version patch  # for bug fixes
   bun version minor  # for new features
   bun version major  # for breaking changes
   ```

2. **Build and test**:
   ```bash
   bun run build
   bun test
   ```

3. **Publish to npm**:
   ```bash
   npm publish --access public
   ```
   
   Or if you're using Bun:
   ```bash
   bunx npm publish --access public
   ```

4. **Create and push git tag**:
   ```bash
   git push origin main
   git push origin v2.7.6  # replace with your version
   ```

### Method 2: Using GitHub Actions (After Setup)

1. **Set up NPM_TOKEN**:
   - Go to https://www.npmjs.com/settings/[your-username]/tokens
   - Create an "Automation" token
   - Add to GitHub repository: Settings → Secrets → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm token

2. **Trigger publish via tags**:
   ```bash
   # Update version
   bun version patch
   
   # Push changes and tag
   git push origin main
   git push origin v2.7.7  # This triggers the publish workflow
   ```

### Method 3: Automated Semantic Release

Once NPM_TOKEN is set up, every push to main will:
- Analyze commit messages
- Determine version bump
- Publish automatically

Use conventional commits:
- `fix: ...` → patch release
- `feat: ...` → minor release
- `BREAKING CHANGE: ...` → major release

## First-Time Publishing Checklist

- [ ] npm account created
- [ ] Logged in via `npm login`
- [ ] Package name is `@beshkenadze/eyecite` in package.json
- [ ] `publishConfig.access` is set to `"public"` in package.json
- [ ] All tests passing (`bun test`)
- [ ] Build successful (`bun run build`)
- [ ] README updated with correct package name
- [ ] CHANGELOG.md updated

## Troubleshooting

### "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- For scoped packages, ensure you have permissions for the scope

### "Package name too similar to existing packages"
- This shouldn't happen with scoped packages like `@beshkenadze/eyecite`

### GitHub Actions failing
- Check that NPM_TOKEN is set in repository secrets
- Ensure version in package.json matches the git tag