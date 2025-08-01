/**
 * Example: Handling Overlapping Citations
 * 
 * This example demonstrates how to use the overlapHandling option
 * to control which citations are returned for multi-section references.
 */

import { getCitations, type GetCitationsOptions } from '../src'

const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for wage calculations.'

console.log('Original text:', text)
console.log('\n' + '='.repeat(60) + '\n')

// Example 1: Default behavior (all citations)
console.log('1. Default behavior - returns all citations:')
const allCitations = getCitations(text)
console.log(`   Found ${allCitations.length} citations:`)
allCitations.forEach((c, i) => {
  const span = c.span()
  console.log(`   [${i}] "${text.substring(span.start, span.end)}" at [${span.start}, ${span.end}]`)
})

// Example 2: Parent-only mode
console.log('\n2. Parent-only mode - returns only encompassing citations:')
const parentOnly = getCitations(text, { overlapHandling: 'parent-only' })
console.log(`   Found ${parentOnly.length} citation(s):`)
parentOnly.forEach((c, i) => {
  const span = c.span()
  console.log(`   [${i}] "${text.substring(span.start, span.end)}" at [${span.start}, ${span.end}]`)
})

// Example 3: Children-only mode
console.log('\n3. Children-only mode - returns only nested citations:')
const childrenOnly = getCitations(text, { overlapHandling: 'children-only' })
console.log(`   Found ${childrenOnly.length} citation(s):`)
childrenOnly.forEach((c, i) => {
  const span = c.span()
  console.log(`   [${i}] "${text.substring(span.start, span.end)}" at [${span.start}, ${span.end}]`)
})

// Example 4: Manual annotation with parent-only
console.log('\n4. Manual annotation example (using parent-only to avoid overlaps):')
const options: GetCitationsOptions = {
  overlapHandling: 'parent-only'
}
const citations = getCitations(text, options)

// Simple manual annotation
let annotated = text
citations
  .sort((a, b) => b.span().start - a.span().start) // Process from right to left
  .forEach(citation => {
    const span = citation.span()
    const citationText = text.substring(span.start, span.end)
    const wrapped = `<cite>${citationText}</cite>`
    annotated = annotated.substring(0, span.start) + wrapped + annotated.substring(span.end)
  })

console.log('   Annotated:', annotated)

// Example 5: Using TypeScript types
console.log('\n5. TypeScript example with explicit types:')
const typedOptions: GetCitationsOptions = {
  overlapHandling: 'children-only',
  removeAmbiguous: true
}
const typedCitations = getCitations(text, typedOptions)
console.log(`   Found ${typedCitations.length} citations with typed options`)