import { getCitations } from './src/find'

// Test simpler cases
const testCases = [
  '42 U.S.C. §§ 1983, 1985(3), 1988',  // This should work
  '42 U.S.C. §§ 1983, 1985, 1988',     // Simple case without subsections
  '26 U.S.C. § 501(c)(3)',             // Single section with subsection
]

console.log('=== Testing Simple Subsection Cases ===\n')

for (const testCase of testCases) {
  console.log(`Testing: "${testCase}"`)
  const citations = getCitations(testCase)
  
  console.log(`Found ${citations.length} citations:`)
  citations.forEach((cite, i) => {
    console.log(`  ${i + 1}. Section: ${(cite as any).section}`)
    if ('metadata' in cite && cite.metadata.parenthetical) {
      console.log(`     Parenthetical: ${cite.metadata.parenthetical}`)
    }
  })
  console.log('---\n')
}