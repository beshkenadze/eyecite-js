import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { FullLawCitation } from '../src/models'

describe('Multiple Sections Parsing', () => {
  // Note: Multi-section law citations are now kept as single citations
  // with all sections in the section field. This prevents false positive
  // matches where volume numbers are incorrectly identified as separate citations.
  
  describe('Basic Multiple Sections', () => {
    test('should parse basic C.F.R. multiple sections as single citation', () => {
      const text = '29 C.F.R. §§ 778.113, 778.114'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('C.F.R.')
      expect(cite.section).toBe('778.113, 778.114')
      expect(cite.groups.chapter).toBe('29')
      expect(cite.groups.section).toBe('778.113, 778.114')
      
      const span = cite.span()
      expect(text.substring(span.start, span.end)).toBe('29 C.F.R. §§ 778.113, 778.114')
    })

    test('should parse U.S.C. multiple sections as single citation', () => {
      const text = '42 U.S.C. §§ 1983, 1985, 1988'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('U.S.C.')
      expect(cite.section).toBe('1983, 1985, 1988')
      expect(cite.groups.title).toBe('42')
      expect(cite.groups.section).toBe('1983, 1985, 1988')
    })

    test('should parse three or more sections as single citation', () => {
      const text = '15 U.S.C. §§ 78a, 78b, 78c, 78d'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('U.S.C.')
      expect(cite.section).toBe('78a, 78b, 78c, 78d')
      expect(cite.groups.title).toBe('15')
    })
  })

  describe('Sections with Descriptions/Parentheticals', () => {
    test('should parse CFR sections with parenthetical descriptions', () => {
      const text = '29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method)'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('C.F.R.')
      // The section should contain the full text including parentheticals
      expect(cite.groups.chapter).toBe('29')
      expect(cite.groups.reporter).toBe('C.F.R.')
    })

    test('should parse sections with mixed parentheticals', () => {
      const text = '42 U.S.C. §§ 1983 (civil rights), 1985(3) (conspiracy), 1988 (fees)'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('U.S.C.')
      expect(cite.groups.title).toBe('42')
    })

    test('should parse sections with complex parenthetical descriptions', () => {
      const text = '29 C.F.R. §§ 778.113 (the "statutory method" for calculating overtime), 778.114 (the FWW method (fluctuating workweek))'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('C.F.R.')
      expect(cite.groups.chapter).toBe('29')
    })
  })

  describe('Mixed Patterns and Subsections', () => {
    test('should parse mixed sections with subsections', () => {
      const text = '26 U.S.C. §§ 501(c)(3), 502(a), 503'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('U.S.C.')
      expect(cite.section).toBe('501(c)(3), 502(a), 503')
      expect(cite.groups.title).toBe('26')
    })

    test('should parse sections with various subsection formats', () => {
      const text = '18 U.S.C. §§ 981(a)(1)(C), 982, 985(e)(1)'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('U.S.C.')
      expect(cite.groups.title).toBe('18')
    })
  })

  describe('Real-World Complex Cases', () => {
    test('should parse complex citation with both U.S.C. and C.F.R.', () => {
      const text = '29 U.S.C. § 207(e)(2); 29 C.F.R. §§ 778.217(a), 778.22'
      const citations = getCitations(text)
      
      // Should have exactly 2 citations (not 3 or 4)
      expect(citations).toHaveLength(2)
      
      // First: U.S.C. citation
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      const usc = citations[0] as FullLawCitation
      expect(usc.reporter).toBe('U.S.C.')
      expect(usc.section).toBe('207')
      expect(usc.groups.title).toBe('29')
      
      // Second: C.F.R. citation with multiple sections
      expect(citations[1]).toBeInstanceOf(FullLawCitation)
      const cfr = citations[1] as FullLawCitation
      expect(cfr.reporter).toBe('C.F.R.')
      expect(cfr.section).toBe('778.217(a), 778.22')
      expect(cfr.groups.chapter).toBe('29')
    })

    test('should not create false U.S.C. citations for C.F.R. volume numbers', () => {
      const text = 'See regulations at 29 C.F.R. § 541.2'
      const citations = getCitations(text)
      
      // Should only have one C.F.R. citation
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('C.F.R.')
      expect(cite.groups.chapter).toBe('29')
      
      // No citation should incorrectly have "29" as a U.S.C. section
      const span = cite.span()
      expect(text.substring(span.start, span.end)).toBe('29 C.F.R. § 541.2')
    })
  })

  describe('Edge Cases', () => {
    test('should handle sections with semicolons', () => {
      const text = '42 U.S.C. §§ 1983; 1985; 1988'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('U.S.C.')
      expect(cite.groups.title).toBe('42')
    })

    test('should handle sections with ranges', () => {
      const text = '29 C.F.R. §§ 778.100-778.120'
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullLawCitation)
      
      const cite = citations[0] as FullLawCitation
      expect(cite.reporter).toBe('C.F.R.')
      expect(cite.groups.chapter).toBe('29')
    })
  })
})