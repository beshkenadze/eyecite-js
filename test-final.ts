import { getCitations } from './src/find'

const testCases = [
  '29 C.F.R. §§ 778.113, 778.114',
  '29 C.F.R. §§ 778.113 (method A), 778.114 (method B)',
  'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).',
]

console.log('=== Final Test of Required Patterns ===\n')

for (const testCase of testCases) {
  console.log(`✓ Testing: "${testCase}"`)
  const citations = getCitations(testCase)
  
  console.log(`  Found ${citations.length} citations:`)
  citations.forEach((cite, i) => {
    const section = (cite as any).section
    const parenthetical = cite.metadata?.parenthetical
    console.log(`    ${i + 1}. ${section}${parenthetical ? ` (${parenthetical})` : ''}`)
  })
  
  if (citations.length >= 2) {
    console.log(`  ✅ SUCCESS: Correctly extracted ${citations.length} separate citations`)
  } else {
    console.log(`  ❌ FAILED: Only found ${citations.length} citation(s), expected at least 2`)
  }
  console.log()
}