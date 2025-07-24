#!/usr/bin/env bun

import { getCitations, annotateCitations } from './src'

const text = `See 29 C.F.R. § 778.114(a); Wage and Hour Division Rule on Fluctuating
Workweek Method of Computing Overtime, 85 Fed. Reg. 34,970 (June 8,
2020), www.federalregister.gov/documents/2020/06/08/2020-10872/fluctuat
ing-workweek-method-of-computing-overtime; 29 C.F.R. § 778.`

console.log('Original Text:')
console.log('==============')
console.log(text)
console.log('\n')

// Get all citations
const citations = getCitations(text)

console.log(`Found ${citations.length} citations:`)
console.log('========================')

citations.forEach((citation, i) => {
  const type = citation.constructor.name
  const matchedText = citation.matchedText()
  console.log(`${i + 1}. ${type}: "${matchedText}"`)
})

// Create custom annotator that wraps with <a> tag including type
const annotatedText = annotateCitations(text, {
  citations,
  annotateFunc: (citation: any, citationText: string) => {
    const type = citation.constructor.name
    return `<a class="${type}">${citationText}</a>`
  }
})

console.log('\nAnnotated Text:')
console.log('===============')
console.log(annotatedText)

// Alternative: More detailed annotation with data attributes
const detailedAnnotatedText = annotateCitations(text, {
  citations,
  annotateFunc: (citation: any, citationText: string) => {
    const type = citation.constructor.name
    const attrs = [`data-type="${type}"`]
    
    // Add specific attributes based on citation type
    if (citation.metadata?.reporter) {
      attrs.push(`data-reporter="${citation.metadata.reporter}"`)
    }
    if (citation.metadata?.section) {
      attrs.push(`data-section="${citation.metadata.section}"`)
    }
    if (citation.metadata?.year) {
      attrs.push(`data-year="${citation.metadata.year}"`)
    }
    if (citation.metadata?.court) {
      attrs.push(`data-court="${citation.metadata.court}"`)
    }
    
    return `<a ${attrs.join(' ')}>${citationText}</a>`
  }
})

console.log('\nDetailed Annotated Text:')
console.log('========================')
console.log(detailedAnnotatedText)