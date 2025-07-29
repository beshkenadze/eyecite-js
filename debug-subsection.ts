import { getCitations } from './src/find'

const testCases = [
  '42 U.S.C. §§ 1983, 1985(3), 1988',
  '26 U.S.C. §§ 501(c)(3), 502(a), 503',
  '29 C.F.R. §§ 778.113 (the "statutory method"), 778.114'
]

console.log('=== Testing Subsection Parsing ===\n')

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