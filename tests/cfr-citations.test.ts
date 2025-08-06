import { describe, expect, test } from 'bun:test'
import { getCitations, FullLawCitation, FullCaseCitation } from '../src'

describe('C.F.R. Citation Parsing', () => {
  test('should correctly parse mixed U.S.C. and C.F.R. citations', () => {
    const text = '29 U.S.C. § 207(e)(2); 29 C.F.R. §§ 778.217(a), 778.22; Berry v. Excel Grp. Inc., 288 F.3d 252 (5th Cir. 2002)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(3)
    
    // First citation: U.S.C.
    expect(citations[0]).toBeInstanceOf(FullLawCitation)
    expect(citations[0].groups.reporter).toBe('U.S.C.')
    expect(citations[0].groups.title).toBe('29')
    expect(citations[0].groups.section).toBe('207')
    const span1 = citations[0].span()
    expect(text.substring(span1.start, span1.end)).toBe('29 U.S.C. § 207')
    
    // Second citation: C.F.R. with multiple sections
    expect(citations[1]).toBeInstanceOf(FullLawCitation)
    expect(citations[1].groups.reporter).toBe('C.F.R.')
    expect(citations[1].groups.chapter).toBe('29')
    expect(citations[1].groups.section).toBe('778.217(a), 778.22')
    const span2 = citations[1].span()
    expect(text.substring(span2.start, span2.end)).toBe('29 C.F.R. §§ 778.217(a), 778.22')
    
    // Third citation: Case citation
    expect(citations[2]).toBeInstanceOf(FullCaseCitation)
    expect(citations[2].groups.volume).toBe('288')
    expect(citations[2].groups.reporter).toBe('F.3d')
    expect(citations[2].groups.page).toBe('252')
  })
  
  test('should parse simple C.F.R. citation', () => {
    const text = '29 C.F.R. § 778.217'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(FullLawCitation)
    expect(citations[0].groups.reporter).toBe('C.F.R.')
    expect(citations[0].groups.chapter).toBe('29')
    expect(citations[0].groups.section).toBe('778.217')
  })
  
  test('should parse multiple C.F.R. sections as single citation', () => {
    const text = '29 C.F.R. §§ 778.217(a), 778.22'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(FullLawCitation)
    expect(citations[0].groups.reporter).toBe('C.F.R.')
    expect(citations[0].groups.chapter).toBe('29')
    expect(citations[0].groups.section).toBe('778.217(a), 778.22')
    
    const span = citations[0].span()
    expect(text.substring(span.start, span.end)).toBe('29 C.F.R. §§ 778.217(a), 778.22')
  })
  
  test('should parse mixed U.S.C. and C.F.R. citations', () => {
    const text = 'See 42 U.S.C. § 1983 and 29 C.F.R. § 778.217'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    
    // U.S.C. citation
    expect(citations[0]).toBeInstanceOf(FullLawCitation)
    expect(citations[0].groups.reporter).toBe('U.S.C.')
    expect(citations[0].groups.title).toBe('42')
    expect(citations[0].groups.section).toBe('1983')
    
    // C.F.R. citation
    expect(citations[1]).toBeInstanceOf(FullLawCitation)
    expect(citations[1].groups.reporter).toBe('C.F.R.')
    expect(citations[1].groups.chapter).toBe('29')
    expect(citations[1].groups.section).toBe('778.217')
  })
  
  test('should parse C.F.R. after semicolon correctly', () => {
    const text = 'statute law; 29 C.F.R. § 541.2'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(FullLawCitation)
    expect(citations[0].groups.reporter).toBe('C.F.R.')
    expect(citations[0].groups.chapter).toBe('29')
    expect(citations[0].groups.section).toBe('541.2')
    
    // Ensure no false U.S.C. citation is created for "29"
    const span = citations[0].span()
    expect(text.substring(span.start, span.end)).toBe('29 C.F.R. § 541.2')
  })
  
  test('should not create false U.S.C. citations for C.F.R. volume numbers', () => {
    const text = '29 C.F.R. § 778.217'
    const citations = getCitations(text)
    
    // Should only have one citation
    expect(citations).toHaveLength(1)
    
    // And it should be C.F.R., not U.S.C.
    expect(citations[0].groups.reporter).toBe('C.F.R.')
    
    // No citation should have U.S.C. as reporter
    const uscCitations = citations.filter(c => c.groups.reporter === 'U.S.C.')
    expect(uscCitations).toHaveLength(0)
  })
})