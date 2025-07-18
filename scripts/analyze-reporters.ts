#!/usr/bin/env bun
/**
 * Analyze the reporters data to understand its structure
 */

import { REPORTERS } from '../src/reporters-db'

console.log('Total reporters:', Object.keys(REPORTERS).length)
console.log('\nSample reporter keys:')
const keys = Object.keys(REPORTERS).slice(0, 20)
keys.forEach(key => console.log(`  "${key}"`))

console.log('\nLooking for common reporters:')
const commonReporters = ['U.S.', 'F.', 'F.2d', 'F.3d', 'F. 3d', 'F.Supp.', 'Cal.', 'N.Y.']
for (const reporter of commonReporters) {
  if (REPORTERS[reporter]) {
    console.log(`  ✓ Found "${reporter}"`)
  } else {
    console.log(`  ✗ Missing "${reporter}"`)
    // Check if it exists with spaces
    const withSpace = reporter.replace(/\.(\w)/g, '. $1')
    if (REPORTERS[withSpace]) {
      console.log(`    → Found as "${withSpace}"`)
    }
  }
}

console.log('\nChecking F.3d variations:')
const f3dVariations = Object.keys(REPORTERS).filter(k => k.includes('3d') && k.includes('F'))
f3dVariations.forEach(v => console.log(`  "${v}"`))

console.log('\nFirst reporter structure:')
const firstKey = Object.keys(REPORTERS)[0]
console.log(`Key: "${firstKey}"`)
console.log('Value:', JSON.stringify(REPORTERS[firstKey], null, 2))