import { getCitations } from './src/find'

const testCase = '29 C.F.R. §§ 778.113, 778.114'

console.log('=== Testing Clean Citation Text ===\n')
console.log(`Input: "${testCase}"`)

const citations = getCitations(testCase)
console.log(`\nFound ${citations.length} citations:`)

citations.forEach((cite, i) => {
  const matchedText = cite.matchedText()
  console.log(`  ${i + 1}. Matched text: "${matchedText}" (${matchedText.startsWith(',') ? '❌ HAS LEADING COMMA' : '✅ CLEAN'})`)
  console.log(`     Section: ${(cite as any).section}`)
  console.log(`     Reporter: ${(cite as any).reporter}`)
})