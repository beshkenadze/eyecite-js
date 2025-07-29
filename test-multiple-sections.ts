import { getCitations } from './src/find'
import { FullLawCitation } from './src/models'

console.log('Testing multiple section parsing...')

const text = 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).'
const citations = getCitations(text)

console.log(`Found ${citations.length} citations:`)

citations.forEach((citation, index) => {
  console.log(`\nCitation ${index + 1}:`)
  console.log(`  Type: ${citation.constructor.name}`)
  console.log(`  Text: "${citation.text}"`)
  console.log(`  Span: ${citation.span().start}-${citation.span().end}`)
  
  if (citation instanceof FullLawCitation) {
    console.log(`  Reporter: ${citation.metadata.reporter}`)
    console.log(`  Chapter: ${citation.metadata.chapter}`)
    console.log(`  Section: ${citation.metadata.section}`)
    console.log(`  Parenthetical: ${citation.metadata.parenthetical}`)
    console.log(`  Groups:`, citation.groups)
  }
})

console.log('\nExpected: 2 citations')
console.log('1. Section 778.113 with parenthetical "the \\"statutory method\\""')
console.log('2. Section 778.114 with parenthetical "the FWW method"')