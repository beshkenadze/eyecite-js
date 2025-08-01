import { describe, test, expect } from 'bun:test'
import { getCitations, annotateCitations } from '../src'
import type { FullLawCitation } from '../src/models/citations'

describe('Overlapping citation annotation', () => {
  test('should handle multi-section law citations with overlapping spans', () => {
    const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
    const citations = getCitations(text)
    
    // Verify we have overlapping citations
    expect(citations.length).toBe(3)
    
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
    
    // The output should properly handle nested citations
    // We expect the individual sections to be annotated only with their section numbers
    // since they are nested within the larger citation
    
    // Count opening and closing tags
    const openTags = (annotated.match(/<cite>/g) || []).length
    const closeTags = (annotated.match(/<\/cite>/g) || []).length
    
    expect(openTags).toBe(closeTags) // Should be balanced
    expect(openTags).toBe(3) // Should have 3 citations
    
    // Check that the full citation is properly wrapped
    expect(annotated).toContain('<cite>29 C.F.R. §§ 778.113, <cite>778.114</cite>, <cite>778.115</cite></cite>')
  })

  test('should handle deeply nested citations', () => {
    const text = 'See 15 U.S.C. §§ 78a, 78b, 78c for reference.'
    const citations = getCitations(text)
    
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
    expect(openTags).toBe(citations.length)
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

  test('should preserve citation metadata in nested annotations', () => {
    const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
    const citations = getCitations(text) as FullLawCitation[]
    
    const annotated = annotateCitations(text, {
      annotateFunc: (citation: FullLawCitation, text) => {
        const section = citation.metadata.section
        return `<cite section="${section}">${text}</cite>`
      }
    })
    
    console.log('\nMetadata preservation test:')
    console.log('Annotated:', annotated)
    
    // Check that each citation has the correct section attribute
    expect(annotated).toContain('section="778.113"')
    expect(annotated).toContain('section="778.114"')
    expect(annotated).toContain('section="778.115"')
  })
})