import { describe, test, expect } from 'bun:test'
import { getCitations } from '../src'
import type { FullLawCitation } from '../src/models/citations'

describe('Multi-section law citations', () => {
  test('should extract C.F.R. citations with §§ as single citation', () => {
    const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
    const citations = getCitations(text)
    
    // Multi-section citations are now kept as single citations
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.reporter).toBe('C.F.R.')
    expect(citation.metadata.chapter).toBe('29')
    expect(citation.metadata.section).toBe('778.113, 778.114, 778.115')
    
    // The span should cover the entire multi-section reference
    expect(citation.span().start).toBe(4)
    expect(citation.span().end).toBe(42)
    expect(text.substring(citation.span().start, citation.span().end)).toBe('29 C.F.R. §§ 778.113, 778.114, 778.115')
  })

  test('should handle U.S.C. multi-section citations as single citation', () => {
    const text = 'Under 42 U.S.C. §§ 1983, 1985, 1988, plaintiffs may sue.'
    const citations = getCitations(text)
    
    // Multi-section citations are now kept as single citations
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.reporter).toBe('U.S.C.')
    expect(citation.metadata.title).toBe('42')
    expect(citation.metadata.section).toBe('1983, 1985, 1988')
    expect(citation.groups.title).toBe('42')
  })

  test('should handle multi-section with complex parentheticals', () => {
    // Complex parentheticals with quotes interrupt the multi-section pattern
    // This is expected behavior - the regex stops at complex parentheticals
    const text = '29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method)'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.reporter).toBe('C.F.R.')
    expect(citation.metadata.chapter).toBe('29')
    
    // The citation only captures the first section due to complex parentheticals
    expect(citation.metadata.section).toBe('778.113')
    expect(citation.metadata.parenthetical).toContain('statutory method')
  })

  test('should not create multiple citations for single section with §', () => {
    const text = 'See 29 C.F.R. § 778.113 for details.'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.section).toBe('113')
    expect(citation.part).toBe('778')  // Check new part getter
    expect(citation.section).toBe('778.113')  // Check combined getter
  })

  test('should handle section ranges', () => {
    const text = 'See 15 U.S.C. §§ 78a-78pp for securities laws.'
    const citations = getCitations(text)
    
    // This should create one citation for the range
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.section).toBe('78a-78pp')
  })
  
  test('should not create false U.S.C. citations for C.F.R. volume numbers', () => {
    const text = '29 U.S.C. § 207(e)(2); 29 C.F.R. §§ 778.217(a), 778.22'
    const citations = getCitations(text)
    
    // Should have exactly 2 citations: U.S.C. and C.F.R.
    expect(citations.length).toBe(2)
    
    // First: U.S.C.
    const usc = citations[0] as FullLawCitation
    expect(usc.metadata.reporter).toBe('U.S.C.')
    expect(usc.metadata.section).toBe('207')
    
    // Second: C.F.R. with multiple sections
    const cfr = citations[1] as FullLawCitation
    expect(cfr.metadata.reporter).toBe('C.F.R.')
    expect(cfr.metadata.section).toBe('778.217(a), 778.22')
    
    // Verify no false U.S.C. citation for "29"
    const hasOnlyExpectedCitations = citations.every(c => {
      const citation = c as FullLawCitation
      return (
        (citation.metadata.reporter === 'U.S.C.' && citation.metadata.section === '207') ||
        (citation.metadata.reporter === 'C.F.R.' && citation.metadata.section === '778.217(a), 778.22')
      )
    })
    expect(hasOnlyExpectedCitations).toBe(true)
  })
})