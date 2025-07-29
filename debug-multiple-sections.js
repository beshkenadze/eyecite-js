import { getCitations } from './src/find.js'

// Test basic multiple sections
const testText = '29 C.F.R. §§ 778.113, 778.114'
console.log('Testing:', testText)

const citations = getCitations(testText)
console.log('Found citations:', citations.length)

citations.forEach((citation, i) => {
  console.log(`Citation ${i + 1}:`)
  console.log('  Type:', citation.constructor.name)
  console.log('  Reporter:', citation.reporter)
  console.log('  Section:', citation.section)
  console.log('  Volume:', citation.volume)
  console.log('  Span:', citation.span())
  console.log('  Groups:', citation.groups)
  console.log('  Metadata:', citation.metadata)
  console.log()
})

// Test regression case
const regressionText = 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).'
console.log('Testing regression case:', regressionText)

const regressionCitations = getCitations(regressionText)
console.log('Found citations:', regressionCitations.length)

regressionCitations.forEach((citation, i) => {
  console.log(`Citation ${i + 1}:`)
  console.log('  Type:', citation.constructor.name)
  console.log('  Reporter:', citation.reporter)
  console.log('  Section:', citation.section)
  console.log('  Volume:', citation.volume)
  console.log('  Span:', citation.span())
  console.log('  Parenthetical:', citation.metadata?.parenthetical)
  console.log('  Metadata:', citation.metadata)
  console.log()
})