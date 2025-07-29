#!/usr/bin/env node

import { getCitations, FullLawCitation } from './dist/index.js'

// Test the current behavior with multiple law citations
const testCases = [
  'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).',
  '29 C.F.R. §§ 778.113, 778.114',
  '42 U.S.C. §§ 1983, 1985(3)',
  '18 U.S.C. §§ 4241-4243',
]

console.log('Testing current behavior of multiple law citations:\n')

testCases.forEach((text, index) => {
  console.log(`Test case ${index + 1}: ${text}`)
  const citations = getCitations(text)
  console.log(`Found ${citations.length} citation(s):`)
  
  citations.forEach((citation, citIndex) => {
    if (citation instanceof FullLawCitation) {
      console.log(`  ${citIndex + 1}. FullLawCitation:`)
      console.log(`     - text: "${citation.matchedText()}"`)
      console.log(`     - reporter: "${citation.reporter}"`)
      console.log(`     - volume: "${citation.volume}"`)
      console.log(`     - section: "${citation.section}"`)
      console.log(`     - span: ${citation.span().start}-${citation.span().end}`)
      console.log(`     - groups:`, citation.groups)
      if (citation.metadata.parenthetical) {
        console.log(`     - parenthetical: "${citation.metadata.parenthetical}"`)
      }
    } else {
      console.log(`  ${citIndex + 1}. ${citation.constructor.name}: "${citation.matchedText()}"`)
    }
  })
  console.log('')
})