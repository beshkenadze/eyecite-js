# Commit Signing in GitHub Actions

This guide explains how to enable verified/signed commits in GitHub Actions workflows.

## Why Sign Commits?

Signed commits provide:
- **Verification** that commits come from a trusted source
- **Security** against impersonation
- **Compliance** with organization policies requiring signed commits
- **Trust** in automated changes

## Methods for Signing Commits in GitHub Actions

### Method 1: GitHub Web Flow (Automatic) ✅ Recommended

Uses GitHub's built-in GPG key to automatically sign commits made through the API.

**Pros:**
- No GPG key setup required
- Automatically verified by GitHub
- Works with GITHUB_TOKEN or PAT_TOKEN

**Implementation:**
```yaml
- name: Create Verified Commit
  uses: swinton/commit@v2.0.0
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    files: |
      CHANGELOG.md
    commit-message: "docs: update changelog"
    ref: refs/heads/main
```

### Method 2: GPG Key Import

Import your own GPG key for signing commits.

**Setup Steps:**

1. **Generate a GPG key locally:**
```bash
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, no expiration
```

2. **Export the private key:**
```bash
gpg --armor --export-secret-keys YOUR_KEY_ID > private.key
```

3. **Add to GitHub Secrets:**
- `GPG_PRIVATE_KEY`: Contents of private.key
- `GPG_PASSPHRASE`: Your key passphrase

4. **Add GPG public key to GitHub:**
```bash
gpg --armor --export YOUR_KEY_ID
# Add this to GitHub Settings > SSH and GPG keys
```

**Implementation:**
```yaml
- name: Import GPG key
  uses: crazy-max/ghaction-import-gpg@v6
  with:
    gpg_private_key: ${{ secrets.GPG_PRIVATE_KEY }}
    passphrase: ${{ secrets.GPG_PASSPHRASE }}
    git_user_signingkey: true
    git_commit_gpgsign: true
    
- name: Commit with signature
  run: |
    git add .
    git commit -S -m "chore: signed commit"
    git push
```

### Method 3: GitHub App Installation Token

Use a GitHub App for automatic signing.

**Setup Steps:**

1. Create a GitHub App in your organization
2. Install the app on your repository
3. Use an action to generate installation token

**Implementation:**
```yaml
- name: Generate token
  id: generate_token
  uses: tibdex/github-app-token@v2
  with:
    app_id: ${{ secrets.APP_ID }}
    private_key: ${{ secrets.APP_PRIVATE_KEY }}
    
- name: Checkout with app token
  uses: actions/checkout@v4
  with:
    token: ${{ steps.generate_token.outputs.token }}
```

## Current Implementation

The eyecite-js project uses **Method 1** (GitHub Web Flow) for changelog updates:

```yaml
# .github/workflows/changelog.yml
- name: Commit and Push Changes (Verified)
  uses: swinton/commit@v2.0.0
  env:
    GH_TOKEN: ${{ secrets.PAT_TOKEN }}
  with:
    files: |
      CHANGELOG.md
    commit-message: "docs: update CHANGELOG.md [skip ci]"
    ref: refs/heads/main
```

This ensures all automated changelog commits are properly signed and verified.

## Verification

To verify commits are signed:

1. Check GitHub: Look for the "Verified" badge on commits
2. Local verification:
```bash
git log --show-signature
```

## Troubleshooting

### Commits Not Showing as Verified

- Ensure the email in git config matches your GitHub account
- Check that GPG key is properly added to GitHub
- Verify the key hasn't expired

### Permission Denied Errors

- Use PAT_TOKEN instead of GITHUB_TOKEN for protected branches
- Ensure the token has appropriate permissions

### GPG Signing Fails

- Check GPG_PRIVATE_KEY secret is properly formatted (include headers)
- Verify passphrase is correct
- Ensure GPG key hasn't expired

## Security Best Practices

1. **Never commit GPG private keys** to the repository
2. **Use GitHub Secrets** for sensitive data
3. **Rotate keys periodically**
4. **Use separate keys** for automation vs personal commits
5. **Enable branch protection** requiring signed commits

## References

- [GitHub Docs: Signing Commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)
- [swinton/commit Action](https://github.com/swinton/commit)
- [crazy-max/ghaction-import-gpg](https://github.com/crazy-max/ghaction-import-gpg)
- [GitHub Web Flow GPG Key](https://github.com/web-flow.gpg)