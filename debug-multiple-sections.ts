import { getCitations } from './src/find'

const testCases = [
  '29 C.F.R. §§ 778.113, 778.114',
  '42 U.S.C. §§ 1983, 1985, 1988',
  'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).',
]

for (const text of testCases) {
  console.log(`\nTest: "${text}"`)
  const citations = getCitations(text)
  console.log(`Found ${citations.length} citations:`)
  
  citations.forEach((citation, index) => {
    console.log(`  ${index + 1}. Type: ${citation.constructor.name}`)
    console.log(`     Groups:`, citation.groups)
    if ('section' in citation) {
      console.log(`     Section: ${citation.section}`)
    }
    if ('reporter' in citation) {
      console.log(`     Reporter: ${citation.reporter}`)
    }
    console.log(`     Span: ${citation.span()}`)
    console.log(`     Matched text: "${text.substring(citation.span()[0], citation.span()[1])}"`)
  })
}