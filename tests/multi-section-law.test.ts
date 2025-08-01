import { describe, test, expect } from 'bun:test'
import { getCitations } from '../src'
import type { FullLawCitation } from '../src/models/citations'

describe('Multi-section law citations', () => {
  test('should extract multiple sections from C.F.R. citations with §§', () => {
    const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(3)
    
    // First citation should span the entire multi-section reference
    const citation1 = citations[0] as FullLawCitation
    expect(citation1.metadata.reporter).toBe('C.F.R.')
    expect(citation1.metadata.chapter).toBe('29')
    expect(citation1.metadata.section).toBe('778.113')
    expect(citation1.span().start).toBe(4)
    expect(citation1.span().end).toBe(42)
    expect(text.substring(citation1.span().start, citation1.span().end)).toBe('29 C.F.R. §§ 778.113, 778.114, 778.115')
    
    // Second citation should span just the second section number
    const citation2 = citations[1] as FullLawCitation
    expect(citation2.metadata.reporter).toBe('C.F.R.')
    expect(citation2.metadata.chapter).toBe('29')
    expect(citation2.metadata.section).toBe('778.114')
    expect(citation2.span().start).toBe(26)
    expect(citation2.span().end).toBe(33)
    expect(text.substring(citation2.span().start, citation2.span().end)).toBe('778.114')
    
    // Third citation should span just the third section number
    const citation3 = citations[2] as FullLawCitation
    expect(citation3.metadata.reporter).toBe('C.F.R.')
    expect(citation3.metadata.chapter).toBe('29')
    expect(citation3.metadata.section).toBe('778.115')
    expect(citation3.span().start).toBe(35)
    expect(citation3.span().end).toBe(42)
    expect(text.substring(citation3.span().start, citation3.span().end)).toBe('778.115')
  })

  test('should handle U.S.C. multi-section citations', () => {
    const text = 'Under 42 U.S.C. §§ 1983, 1985, 1988, plaintiffs may sue.'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(3)
    
    const [cit1, cit2, cit3] = citations as FullLawCitation[]
    
    expect(cit1.metadata.section).toBe('1983')
    expect(cit2.metadata.section).toBe('1985')
    expect(cit3.metadata.section).toBe('1988')
    
    // All should have the same reporter and title
    citations.forEach((c) => {
      const citation = c as FullLawCitation
      expect(citation.metadata.reporter).toBe('U.S.C.')
      expect(citation.groups.title).toBe('42')  // For U.S.C., the number is stored as title
    })
  })

  test('should handle multi-section with parentheticals', () => {
    const text = '29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method)'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(2)
    
    const citation1 = citations[0] as FullLawCitation
    expect(citation1.metadata.section).toBe('778.113')
    expect(citation1.metadata.parenthetical).toBe('the "statutory method"')
    
    const citation2 = citations[1] as FullLawCitation
    expect(citation2.metadata.section).toBe('778.114')
    expect(citation2.metadata.parenthetical).toBe('the FWW method')
  })

  test('should not create multiple citations for single section with §', () => {
    const text = 'See 29 C.F.R. § 778.113 for details.'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.section).toBe('778.113')
  })

  test('should handle section ranges', () => {
    const text = 'See 15 U.S.C. §§ 78a-78pp for securities laws.'
    const citations = getCitations(text)
    
    // This should create one citation for the range
    expect(citations.length).toBe(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.metadata.section).toBe('78a-78pp')
  })
})