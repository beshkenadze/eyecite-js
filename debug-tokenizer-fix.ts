import { defaultTokenizer } from './src/tokenizers'

const testCases = [
  '29 C.F.R. §§ 778.113, 778.114',
  '29 C.F.R. §§ 778.113 (method A), 778.114 (method B)',
  'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).',
]

console.log('=== Analyzing Tokenizer Output ===\n')

for (const testCase of testCases) {
  console.log(`Testing: "${testCase}"`)
  const [words, citationTokens] = defaultTokenizer.tokenize(testCase)
  
  console.log(`Citation tokens (${citationTokens.length}):`)
  citationTokens.forEach(([index, token], i) => {
    console.log(`  ${i + 1}. Index: ${index}, Type: ${token.constructor.name}`)
    console.log(`     Text: "${token.toString()}"`)
    console.log(`     Start: ${token.start}, End: ${token.end}`)
    console.log(`     Data: "${token.data}"`)
    
    if ('groups' in token && token.groups) {
      console.log(`     Groups:`, token.groups)
    }
    if ('reporter' in token) {
      console.log(`     Reporter: ${(token as any).reporter}`)
    }
    if ('lawType' in token) {
      console.log(`     LawType: ${(token as any).lawType}`)
    }
    console.log()
  })
  console.log('---\n')
}