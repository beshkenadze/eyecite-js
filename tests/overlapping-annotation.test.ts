import { describe, test, expect } from 'bun:test'
import { getCitations, annotateCitations } from '../src'
import type { FullLawCitation } from '../src/models/citations'

describe('Overlapping citation annotation', () => {
  test('should handle multi-section law citations as single citation', () => {
    const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
    const citations = getCitations(text)
    
    // Multi-section citations are now kept as single citations
    expect(citations.length).toBe(1)
    
    // Annotate the text
    const annotated = annotateCitations(text, {
      annotateFunc: (citation, text) => `<cite>${text}</cite>`
    })
    
    console.log('Original text:', text)
    console.log('Annotated text:', annotated)
    console.log('Citations:')
    citations.forEach((c, i) => {
      const span = c.span()
      console.log(`  Citation ${i}: [${span.start}, ${span.end}] = "${text.substring(span.start, span.end)}"`)
    })
    
    // The output should have a single citation annotation
    const openTags = (annotated.match(/<cite>/g) || []).length
    const closeTags = (annotated.match(/<\/cite>/g) || []).length
    
    expect(openTags).toBe(closeTags) // Should be balanced
    expect(openTags).toBe(1) // Should have 1 citation
    
    // Check that the full citation is properly wrapped
    expect(annotated).toBe('See <cite>29 C.F.R. §§ 778.113, 778.114, 778.115</cite> for details.')
  })

  test('should handle multi-section U.S.C. citations as single citation', () => {
    const text = 'See 15 U.S.C. §§ 78a, 78b, 78c for reference.'
    const citations = getCitations(text)
    
    // Multi-section citations are now kept as single citations
    expect(citations.length).toBe(1)
    
    const annotated = annotateCitations(text, {
      annotateFunc: (citation, text) => `<cite data-id="${citation.metadata.section}">${text}</cite>`
    })
    
    console.log('\nDeep nesting test:')
    console.log('Original:', text)
    console.log('Annotated:', annotated)
    
    // Verify tags are balanced
    const openTags = (annotated.match(/<cite[^>]*>/g) || []).length
    const closeTags = (annotated.match(/<\/cite>/g) || []).length
    
    expect(openTags).toBe(closeTags)
    expect(openTags).toBe(1)
    
    // Should contain the multi-section citation as a single annotation
    expect(annotated).toBe('See <cite data-id="78a, 78b, 78c">15 U.S.C. §§ 78a, 78b, 78c</cite> for reference.')
  })

  test('should handle non-overlapping citations correctly', () => {
    const text = 'See 29 C.F.R. § 778.113 and 15 U.S.C. § 78a for details.'
    const citations = getCitations(text)
    
    const annotated = annotateCitations(text, {
      annotateFunc: (citation, text) => `<cite>${text}</cite>`
    })
    
    console.log('\nNon-overlapping test:')
    console.log('Original:', text)
    console.log('Annotated:', annotated)
    
    // Should have two separate citations
    expect(annotated).toBe('See <cite>29 C.F.R. § 778.113</cite> and <cite>15 U.S.C. § 78a</cite> for details.')
  })

  test('should preserve citation metadata in multi-section annotations', () => {
    const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
    const citations = getCitations(text) as FullLawCitation[]
    
    // Should have single multi-section citation
    expect(citations.length).toBe(1)
    
    const annotated = annotateCitations(text, {
      annotateFunc: (citation: FullLawCitation, text) => {
        const section = citation.metadata.section
        return `<cite section="${section}">${text}</cite>`
      }
    })
    
    console.log('\nMetadata preservation test:')
    console.log('Annotated:', annotated)
    
    // Check that the single citation has all sections in one attribute
    expect(annotated).toBe('See <cite section="778.113, 778.114, 778.115">29 C.F.R. §§ 778.113, 778.114, 778.115</cite> for details.')
  })
})