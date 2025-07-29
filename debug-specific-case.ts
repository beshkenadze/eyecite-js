import { getCitations } from './src/find'
import { defaultTokenizer } from './src/tokenizers'

const testCase = '29 C.F.R. §§ 778.113, 778.114'

console.log('=== Debugging Specific Case ===')
console.log(`Test: "${testCase}"`)

// Check tokenizer output
const [words, citationTokens] = defaultTokenizer.tokenize(testCase)
console.log(`\nTokenizer found ${citationTokens.length} citation tokens:`)
citationTokens.forEach(([index, token], i) => {
  console.log(`  ${i + 1}. Type: ${token.constructor.name}`)
  console.log(`     Text: "${token.toString()}"`)
  console.log(`     Groups section: "${token.groups?.section}"`)
  console.log(`     Contains comma: ${token.groups?.section?.includes(',') || false}`)
  console.log(`     Contains semicolon: ${token.groups?.section?.includes(';') || false}`)
})

// Check citation output
const citations = getCitations(testCase)
console.log(`\nGetCitations found ${citations.length} citations:`)
citations.forEach((cite, i) => {
  console.log(`  ${i + 1}. Type: ${cite.constructor.name}`)
  console.log(`     Section: ${(cite as any).section}`)
  const span = cite.span()
  console.log(`     Span: [${span[0]}, ${span[1]}]`)
})