import { describe, test, expect } from 'bun:test'
import { getCitations, type OverlapHandling } from '../src'

describe('Overlap handling in getCitations', () => {
  const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'

  test('default behavior (all) returns all overlapping citations', () => {
    const citations = getCitations(text)
    expect(citations.length).toBe(3)
    
    const spans = citations.map(c => c.span())
    expect(spans[0]).toEqual({ start: 4, end: 42 }) // Full citation
    expect(spans[1]).toEqual({ start: 26, end: 33 }) // 778.114
    expect(spans[2]).toEqual({ start: 35, end: 42 }) // 778.115
  })

  test('parent-only returns only the encompassing citation', () => {
    const citations = getCitations(text, { overlapHandling: 'parent-only' })
    expect(citations.length).toBe(1)
    
    const span = citations[0].span()
    expect(span).toEqual({ start: 4, end: 42 })
    expect(text.substring(span.start, span.end)).toBe('29 C.F.R. §§ 778.113, 778.114, 778.115')
  })

  test('children-only returns only the nested citations', () => {
    const citations = getCitations(text, { overlapHandling: 'children-only' })
    expect(citations.length).toBe(2)
    
    const spans = citations.map(c => c.span())
    expect(spans[0]).toEqual({ start: 26, end: 33 }) // 778.114
    expect(spans[1]).toEqual({ start: 35, end: 42 }) // 778.115
    
    // Verify the parent citation is not included
    const fullCitationIncluded = citations.some(c => {
      const span = c.span()
      return span.start === 4 && span.end === 42
    })
    expect(fullCitationIncluded).toBe(false)
  })

  test('non-overlapping citations are unaffected', () => {
    const nonOverlappingText = 'See 29 C.F.R. § 778.113 and 15 U.S.C. § 78a.'
    
    const allCitations = getCitations(nonOverlappingText)
    const parentOnly = getCitations(nonOverlappingText, { overlapHandling: 'parent-only' })
    const childrenOnly = getCitations(nonOverlappingText, { overlapHandling: 'children-only' })
    
    // All three should return the same citations
    expect(allCitations.length).toBe(2)
    expect(parentOnly.length).toBe(2)
    expect(childrenOnly.length).toBe(2)
  })

  test('complex overlapping scenario', () => {
    const complexText = 'See 15 U.S.C. §§ 78a, 78b, 78c and 29 C.F.R. § 1910.1200.'
    
    const all = getCitations(complexText)
    const parentOnly = getCitations(complexText, { overlapHandling: 'parent-only' })
    const childrenOnly = getCitations(complexText, { overlapHandling: 'children-only' })
    
    // All should include both multi-section and single citations
    expect(all.length).toBeGreaterThan(2)
    
    // Parent only should have fewer citations (no nested ones)
    expect(parentOnly.length).toBeLessThan(all.length)
    
    // Children only should also have fewer (no parent citations)
    expect(childrenOnly.length).toBeLessThan(all.length)
  })

  test('manual annotation works with parent-only option', () => {
    const citations = getCitations(text, { overlapHandling: 'parent-only' })
    
    // Manual annotation approach from bug report
    let result = text
    citations
      .sort((a, b) => b.span().start - a.span().start)
      .forEach(citation => {
        const span = citation.span()
        const wrapped = `<a>${text.substring(span.start, span.end)}</a>`
        result = result.substring(0, span.start) + wrapped + result.substring(span.end)
      })
    
    // Should produce valid HTML without overlaps
    expect(result).toBe('See <a>29 C.F.R. §§ 778.113, 778.114, 778.115</a> for details.')
    
    // Verify HTML is balanced
    const openTags = (result.match(/<a>/g) || []).length
    const closeTags = (result.match(/<\/a>/g) || []).length
    expect(openTags).toBe(closeTags)
  })

  test('backward compatibility with legacy signature', () => {
    // Test that the old signature still works
    const legacyCitations = getCitations(text, false, undefined, '', undefined, 'parent-only')
    const newCitations = getCitations(text, { overlapHandling: 'parent-only' })
    
    expect(legacyCitations.length).toBe(newCitations.length)
    expect(legacyCitations[0].span()).toEqual(newCitations[0].span())
  })
})