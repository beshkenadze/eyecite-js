import { getCitations } from './src/find'

const testCases = [
  '29 C.F.R. §§ 778.113, 778.114',
  '29 C.F.R. §§ 778.113 (method A), 778.114 (method B)',
  'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).',
]

console.log('=== Testing Multiple Law Citations ===\n')

for (const testCase of testCases) {
  console.log(`Testing: "${testCase}"`)
  const citations = getCitations(testCase)
  
  console.log(`Found ${citations.length} citations:`)
  citations.forEach((cite, i) => {
    console.log(`  ${i + 1}. Type: ${cite.constructor.name}`)
    console.log(`     Text: "${cite.toString()}"`)
    const span = cite.span()
    console.log(`     Span: [${span[0]}, ${span[1]}]`)
    
    if ('reporter' in cite) {
      console.log(`     Reporter: ${(cite as any).reporter}`)
    }
    if ('section' in cite) {
      console.log(`     Section: ${(cite as any).section}`)
    }
    if ('metadata' in cite && cite.metadata.parenthetical) {
      console.log(`     Parenthetical: ${cite.metadata.parenthetical}`)
    }
    console.log()
  })
  console.log('---\n')
}