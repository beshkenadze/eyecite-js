#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { $ } from 'bun'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
}

async function main() {
  try {
    // Read current package.json
    const packagePath = join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
    const currentVersion = packageJson.version
    
    console.log(`\n${colors.cyan}📦 Version Bump Tool${colors.reset}`)
    console.log(`${colors.yellow}Current version: ${colors.bright}${currentVersion}${colors.reset}\n`)
    
    // Parse current version
    const versionParts = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/)
    if (!versionParts) {
      console.error(`${colors.red}Error: Invalid version format${colors.reset}`)
      process.exit(1)
    }
    
    const [, major, minor, patch, prerelease] = versionParts
    
    // Show bump options
    console.log(`${colors.blue}Choose version bump type:${colors.reset}`)
    console.log('  1) Patch  (bug fixes)           → ' + `${major}.${minor}.${Number(patch) + 1}`)
    console.log('  2) Minor  (new features)        → ' + `${major}.${Number(minor) + 1}.0`)
    console.log('  3) Major  (breaking changes)    → ' + `${Number(major) + 1}.0.0`)
    
    if (prerelease) {
      const prereleaseMatch = prerelease.match(/^(.+?)\.?(\d+)?$/)
      const [, preType, preNum = '0'] = prereleaseMatch || []
      console.log('  4) Prerelease (increment)       → ' + `${major}.${minor}.${patch}-${preType}.${Number(preNum) + 1}`)
    } else {
      console.log('  4) Alpha  (early testing)       → ' + `${major}.${minor}.${patch}-alpha.1`)
      console.log('  5) Beta   (feature complete)    → ' + `${major}.${minor}.${patch}-beta.1`)
      console.log('  6) RC     (release candidate)   → ' + `${major}.${minor}.${patch}-rc.1`)
    }
    
    console.log('  7) Custom (specify version)')
    console.log('  0) Cancel\n')
    
    const choice = await question('Enter your choice (0-7): ')
    
    let newVersion = ''
    
    switch (choice) {
      case '1':
        newVersion = `${major}.${minor}.${Number(patch) + 1}`
        break
      case '2':
        newVersion = `${major}.${Number(minor) + 1}.0`
        break
      case '3':
        newVersion = `${Number(major) + 1}.0.0`
        break
      case '4':
        if (prerelease) {
          const prereleaseMatch = prerelease.match(/^(.+?)\.?(\d+)?$/)
          const [, preType, preNum = '0'] = prereleaseMatch || []
          newVersion = `${major}.${minor}.${patch}-${preType}.${Number(preNum) + 1}`
        } else {
          newVersion = `${major}.${minor}.${patch}-alpha.1`
        }
        break
      case '5':
        if (!prerelease) {
          newVersion = `${major}.${minor}.${patch}-beta.1`
        } else {
          console.log(`${colors.red}Invalid choice${colors.reset}`)
          process.exit(1)
        }
        break
      case '6':
        if (!prerelease) {
          newVersion = `${major}.${minor}.${patch}-rc.1`
        } else {
          console.log(`${colors.red}Invalid choice${colors.reset}`)
          process.exit(1)
        }
        break
      case '7':
        newVersion = await question('Enter custom version: ')
        // Validate custom version
        if (!/^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/.test(newVersion)) {
          console.error(`${colors.red}Error: Invalid version format${colors.reset}`)
          process.exit(1)
        }
        break
      case '0':
        console.log(`${colors.yellow}Version bump cancelled${colors.reset}`)
        process.exit(0)
      default:
        console.error(`${colors.red}Invalid choice${colors.reset}`)
        process.exit(1)
    }
    
    console.log(`\n${colors.green}New version will be: ${colors.bright}${newVersion}${colors.reset}`)
    
    // Ask for confirmation
    const confirm = await question('\nDo you want to proceed? (y/n): ')
    if (confirm.toLowerCase() !== 'y') {
      console.log(`${colors.yellow}Version bump cancelled${colors.reset}`)
      process.exit(0)
    }
    
    // Update package.json
    packageJson.version = newVersion
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
    console.log(`${colors.green}✓ Updated package.json${colors.reset}`)
    
    // Generate changelog with git-cliff
    const changelogOps = await question('\nDo you want to generate/update CHANGELOG? (y/n): ')
    if (changelogOps.toLowerCase() === 'y') {
      try {
        console.log(`${colors.cyan}Generating changelog...${colors.reset}`)
        
        // Generate changelog for the new version
        await $`git-cliff --tag v${newVersion} --output CHANGELOG.md`
        console.log(`${colors.green}✓ Generated CHANGELOG.md${colors.reset}`)
        
        // Stage the changelog
        await $`git add CHANGELOG.md`
        console.log(`${colors.green}✓ Staged CHANGELOG.md${colors.reset}`)
      } catch (error) {
        console.error(`${colors.red}Changelog generation failed:${colors.reset}`, error)
        console.log(`${colors.yellow}You can generate it manually later with: git-cliff --tag v${newVersion} --output CHANGELOG.md${colors.reset}`)
      }
    }
    
    // Ask about git operations
    const gitOps = await question('\nDo you want to commit and tag? (y/n): ')
    if (gitOps.toLowerCase() === 'y') {
      try {
        // Stage package.json
        await $`git add package.json`
        console.log(`${colors.green}✓ Staged package.json${colors.reset}`)
        
        // Commit
        const commitMessage = `chore: bump version to ${newVersion}`
        await $`git commit -m ${commitMessage}`
        console.log(`${colors.green}✓ Created commit${colors.reset}`)
        
        // Create tag
        const tagName = `v${newVersion}`
        await $`git tag ${tagName}`
        console.log(`${colors.green}✓ Created tag: ${tagName}${colors.reset}`)
        
        // Ask about pushing
        const pushOps = await question('\nDo you want to push to remote? (y/n): ')
        if (pushOps.toLowerCase() === 'y') {
          await $`git push`
          console.log(`${colors.green}✓ Pushed commits${colors.reset}`)
          
          await $`git push --tags`
          console.log(`${colors.green}✓ Pushed tags${colors.reset}`)
        }
      } catch (error) {
        console.error(`${colors.red}Git operation failed:${colors.reset}`, error)
        process.exit(1)
      }
    }
    
    // Ask about building
    const buildOps = await question('\nDo you want to build the package? (y/n): ')
    if (buildOps.toLowerCase() === 'y') {
      console.log(`\n${colors.cyan}Building package...${colors.reset}`)
      await $`bun run build`
      console.log(`${colors.green}✓ Build complete${colors.reset}`)
    }
    
    // Ask about publishing
    const publishOps = await question('\nDo you want to publish to npm? (y/n): ')
    if (publishOps.toLowerCase() === 'y') {
      // Determine npm tag based on version
      let npmTag = 'latest'
      if (newVersion.includes('-alpha')) npmTag = 'alpha'
      else if (newVersion.includes('-beta')) npmTag = 'beta'
      else if (newVersion.includes('-rc')) npmTag = 'rc'
      else if (newVersion.includes('-')) npmTag = 'next'
      
      console.log(`\n${colors.cyan}Publishing to npm with tag: ${npmTag}${colors.reset}`)
      
      try {
        await $`npm publish --tag ${npmTag}`
        console.log(`${colors.green}✓ Published to npm${colors.reset}`)
        console.log(`${colors.bright}Install with: npm install @beshkenadze/eyecite@${npmTag}${colors.reset}`)
      } catch (error) {
        console.error(`${colors.red}Publish failed:${colors.reset}`, error)
        console.log(`${colors.yellow}You can publish manually later with: npm publish --tag ${npmTag}${colors.reset}`)
      }
    }
    
    console.log(`\n${colors.green}${colors.bright}✨ Version bump complete!${colors.reset}`)
    console.log(`${colors.cyan}Version changed from ${currentVersion} to ${newVersion}${colors.reset}\n`)
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()