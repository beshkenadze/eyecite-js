import { defaultTokenizer } from './src/tokenizers'

const testCases = [
  '42 U.S.C. §§ 1983, 1985(3), 1988',
  '26 U.S.C. §§ 501(c)(3), 502(a), 503',
]

console.log('=== Analyzing Tokenizer for Subsections ===\n')

for (const testCase of testCases) {
  console.log(`Testing: "${testCase}"`)
  const [words, citationTokens] = defaultTokenizer.tokenize(testCase)
  
  console.log(`Citation tokens (${citationTokens.length}):`)
  citationTokens.forEach(([index, token], i) => {
    console.log(`  ${i + 1}. Type: ${token.constructor.name}`)
    console.log(`     Text: "${token.toString()}"`)
    console.log(`     Groups section: "${token.groups?.section}"`)
  })
  console.log('---\n')
}