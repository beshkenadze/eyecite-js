import { getCitations } from './src/find.js'
import { defaultTokenizer } from './src/tokenizers/default.js'

console.log('Testing: "29 C.F.R. §§ 778.113, 778.114"')
const citations = getCitations('29 C.F.R. §§ 778.113, 778.114')
console.log('Number of citations found:', citations.length)
citations.forEach((c, i) => {
  console.log(`Citation ${i + 1}:`, {
    type: c.constructor.name,
    matchedText: c.matchedText(),
    span: c.span(),
    section: c.section || 'N/A',
    reporter: c.reporter || 'N/A',
    volume: c.volume || 'N/A',
    groups: c.groups
  })
})

// Let's also test tokenization
const [words, tokens] = defaultTokenizer.tokenize('29 C.F.R. §§ 778.113, 778.114')
console.log('\nTokens found:')
tokens.forEach((tokenInfo, i) => {
  const [tokenIndex, token] = tokenInfo
  console.log(`Token ${i + 1}:`, {
    index: tokenIndex,
    type: token.constructor.name,
    data: token.data,
    start: token.start,
    end: token.end,
    groups: token.groups,
    reporter: token.reporter || 'N/A',
    lawType: token.lawType || 'N/A'
  })
})
