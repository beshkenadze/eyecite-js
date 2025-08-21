import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/index'
import { FullLawCitation } from '../src/models/citations'

describe('C.F.R. Part and Section Parsing', () => {
  test('should parse basic C.F.R. citation with part and section', () => {
    const text = '29 C.F.R. § 778.113'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation).toBeInstanceOf(FullLawCitation)
    expect(citation.volume).toBe('29')  // chapter/title
    expect(citation.reporter).toBe('C.F.R.')
    expect(citation.part).toBe('778')
    expect(citation.sectionOnly).toBe('113')
    expect(citation.section).toBe('778.113')  // Combined for backward compatibility
  })

  test('should parse C.F.R. citation with subsection pinCite', () => {
    const text = '29 C.F.R. § 778.113(a)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('29')
    expect(citation.part).toBe('778')
    expect(citation.sectionOnly).toBe('113')
    expect(citation.section).toBe('778.113')
    expect(citation.metadata.pinCite).toBe('(a)')
  })

  test('should parse C.F.R. citation with complex subsection', () => {
    const text = '29 C.F.R. § 778.217(b)(1)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('29')
    expect(citation.part).toBe('778')
    expect(citation.sectionOnly).toBe('217')
    expect(citation.section).toBe('778.217')
    expect(citation.metadata.pinCite).toBe('(b)(1)')
  })

  test('should parse different title C.F.R. citation', () => {
    const text = '48 C.F.R. § 38.48'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('48')
    expect(citation.part).toBe('38')
    expect(citation.sectionOnly).toBe('48')
    expect(citation.section).toBe('38.48')
  })

  test('should parse C.F.R. citation with nested section numbers', () => {
    const text = '40 C.F.R. § 260.10'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('40')
    expect(citation.part).toBe('260')
    expect(citation.sectionOnly).toBe('10')
    expect(citation.section).toBe('260.10')  // Combined for backward compatibility
  })

  test('should parse C.F.R. citation with multi-level section', () => {
    const text = '29 C.F.R. § 1910.1200'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('29')
    expect(citation.part).toBe('1910')
    expect(citation.sectionOnly).toBe('1200')
    expect(citation.section).toBe('1910.1200')  // Combined for backward compatibility
  })

  test('should handle multiple C.F.R. citations', () => {
    const text = '29 C.F.R. §§ 778.113, 778.114'
    const citations = getCitations(text)
    
    // This might be parsed as one or multiple citations depending on regex
    expect(citations.length).toBeGreaterThanOrEqual(1)
    
    const firstCitation = citations[0] as FullLawCitation
    expect(firstCitation.volume).toBe('29')
    // Multiple sections don't separate part and section
    expect(firstCitation.part).toBe('')
    expect(firstCitation.section).toContain('778.113')
    expect(firstCitation.section).toContain('778.114')
  })

  test('should maintain backward compatibility - access via groups', () => {
    const text = '29 C.F.R. § 778.113'
    const citations = getCitations(text)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.groups.chapter).toBe('29')
    expect(citation.groups.part).toBe('778')
    expect(citation.groups.section).toBe('113')
    expect(citation.groups.reporter).toBe('C.F.R.')
  })

  test('should generate correct citation text', () => {
    const text = '29 C.F.R. § 778.113(a)'
    const citations = getCitations(text)
    
    const citation = citations[0] as FullLawCitation
    const corrected = citation.correctedCitation()
    expect(corrected).toContain('29')
    expect(corrected).toContain('C.F.R.')
    expect(corrected).toContain('778')
    expect(corrected).toContain('113')
  })

  test('should handle edge case with single digit section', () => {
    const text = '17 C.F.R. § 230.1'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('17')
    expect(citation.part).toBe('230')
    expect(citation.sectionOnly).toBe('1')
    expect(citation.section).toBe('230.1')  // Combined for backward compatibility
  })

  test('should parse citation in context', () => {
    const text = 'According to 29 C.F.R. § 778.113(a), the regular rate calculation must include all remuneration.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const citation = citations[0] as FullLawCitation
    expect(citation.volume).toBe('29')
    expect(citation.part).toBe('778')
    expect(citation.sectionOnly).toBe('113')
    expect(citation.section).toBe('778.113')
    expect(citation.metadata.pinCite).toBe('(a)')
  })
})