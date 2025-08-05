import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { 
  formatBluebook, 
  reorderParallelCitations, 
  areParallelCitations,
  getReporterType,
  ReporterType
} from '../src/utils/bluebook'
import { FullCaseCitation } from '../src/models'

describe('Bluebook Formatting Utilities', () => {
  describe('reorderParallelCitations', () => {
    test('should reorder parallel citations with LEXIS and WL', () => {
      const text = 'Brown v. Nipper Auto Parts & Supplies, Inc., 2009 U.S. Dist. LEXIS 43213, 2009 WL 1437836 (W.D. Va. May 21, 2009)'
      const citations = getCitations(text)
      
      // Original order: LEXIS, WL
      expect(citations[0].matchedText()).toContain('LEXIS')
      expect(citations[1].matchedText()).toContain('WL')
      
      // After reordering: WL should come before LEXIS
      const reordered = reorderParallelCitations(citations)
      expect(reordered[0].matchedText()).toContain('WL')
      expect(reordered[1].matchedText()).toContain('LEXIS')
    })
    
    test('should place official reporters before electronic databases', () => {
      const text = 'Smith v. Jones, 2020 WL 123456, 123 F. Supp. 3d 456 (S.D.N.Y. 2020)'
      const citations = getCitations(text)
      
      // Original order: WL, F. Supp. 3d
      expect(citations[0].matchedText()).toContain('WL')
      expect(citations[1].reporter).toBe('F. Supp. 3d')
      
      // After reordering: F. Supp. 3d should come first
      const reordered = reorderParallelCitations(citations)
      expect(reordered[0].reporter).toBe('F. Supp. 3d')
      expect(reordered[1].matchedText()).toContain('WL')
    })
    
    test('should maintain order of non-parallel citations', () => {
      const text = 'See Brown v. Board, 347 U.S. 483 (1954); Roe v. Wade, 410 U.S. 113 (1973)'
      const citations = getCitations(text)
      
      const reordered = reorderParallelCitations(citations)
      
      // Order should remain the same (different cases)
      expect(reordered[0].matchedText()).toBe('347 U.S. 483')
      expect(reordered[1].matchedText()).toBe('410 U.S. 113')
    })
    
    test('should handle mixed citation types', () => {
      const text = 'See 42 U.S.C. § 1983; Brown v. Board, 347 U.S. 483, 2020 WL 123456 (1954)'
      const citations = getCitations(text)
      
      const reordered = reorderParallelCitations(citations)
      
      // Law citation should stay first
      expect(reordered[0].matchedText()).toBe('42 U.S.C. § 1983')
      // Case citations should be reordered (official before WL)
      expect(reordered[1].matchedText()).toBe('347 U.S. 483')
      expect(reordered[2].matchedText()).toContain('WL')
    })
  })
  
  describe('areParallelCitations', () => {
    test('should identify parallel citations with same metadata', () => {
      const text = 'Brown v. Nipper, 2009 U.S. Dist. LEXIS 43213, 2009 WL 1437836 (W.D. Va. May 21, 2009)'
      const citations = getCitations(text)
      
      if (citations[0] instanceof FullCaseCitation && citations[1] instanceof FullCaseCitation) {
        expect(areParallelCitations(citations[0], citations[1])).toBe(true)
      }
    })
    
    test('should not identify different cases as parallel', () => {
      const text = 'Brown v. Board, 347 U.S. 483 (1954); Roe v. Wade, 410 U.S. 113 (1973)'
      const citations = getCitations(text)
      
      if (citations[0] instanceof FullCaseCitation && citations[1] instanceof FullCaseCitation) {
        expect(areParallelCitations(citations[0], citations[1])).toBe(false)
      }
    })
    
    test('should handle non-case citations', () => {
      const text = '42 U.S.C. § 1983; Brown v. Board, 347 U.S. 483 (1954)'
      const citations = getCitations(text)
      
      expect(areParallelCitations(citations[0], citations[1])).toBe(false)
    })
  })
  
  describe('getReporterType', () => {
    test('should identify official reporters', () => {
      const text = 'Brown v. Board, 347 U.S. 483 (1954)'
      const citations = getCitations(text)
      const caseCitation = citations[0] as FullCaseCitation
      
      expect(getReporterType(caseCitation)).toBe(ReporterType.OFFICIAL)
    })
    
    test('should identify regional reporters', () => {
      const text = 'State v. Smith, 123 N.W.2d 456 (2020)'
      const citations = getCitations(text)
      const caseCitation = citations[0] as FullCaseCitation
      
      expect(getReporterType(caseCitation)).toBe(ReporterType.REGIONAL)
    })
    
    test('should identify Westlaw citations', () => {
      const text = 'Brown v. Jones, 2020 WL 123456 (S.D.N.Y. 2020)'
      const citations = getCitations(text)
      const caseCitation = citations[0] as FullCaseCitation
      
      expect(getReporterType(caseCitation)).toBe(ReporterType.ELECTRONIC_WESTLAW)
    })
    
    test('should identify LEXIS citations', () => {
      const text = 'Brown v. Jones, 2020 U.S. Dist. LEXIS 12345 (S.D.N.Y. 2020)'
      const citations = getCitations(text)
      const caseCitation = citations[0] as FullCaseCitation
      
      expect(getReporterType(caseCitation)).toBe(ReporterType.ELECTRONIC_LEXIS)
    })
  })
  
  describe('formatBluebook', () => {
    test('should reorder when option is enabled', () => {
      const text = 'Brown v. Nipper, 2009 U.S. Dist. LEXIS 43213, 2009 WL 1437836 (W.D. Va. 2009)'
      const citations = getCitations(text)
      
      const formatted = formatBluebook(citations, { reorderParallel: true })
      
      // WL should come before LEXIS
      expect(formatted[0].matchedText()).toContain('WL')
      expect(formatted[1].matchedText()).toContain('LEXIS')
    })
    
    test('should not reorder when option is disabled', () => {
      const text = 'Brown v. Nipper, 2009 U.S. Dist. LEXIS 43213, 2009 WL 1437836 (W.D. Va. 2009)'
      const citations = getCitations(text)
      
      const formatted = formatBluebook(citations, { reorderParallel: false })
      
      // Order should remain unchanged
      expect(formatted[0].matchedText()).toContain('LEXIS')
      expect(formatted[1].matchedText()).toContain('WL')
    })
    
    test('should handle empty options', () => {
      const text = 'Brown v. Board, 347 U.S. 483 (1954)'
      const citations = getCitations(text)
      
      const formatted = formatBluebook(citations)
      
      expect(formatted).toEqual(citations)
    })
  })
  
  describe('Complex real-world example', () => {
    test('should correctly reorder the provided complex citation string', () => {
      const text = `Brown v. Nipper Auto Parts & Supplies, Inc., 2009 U.S. Dist. LEXIS 43213, 2009 WL 1437836 (W.D. Va. May 21, 2009); Russell v. Wells Fargo & Co., 672 F. Supp. 2d 1008 (N.D. Cal. 2009); Rainey v. Am. Forest & Paper Ass'n, 26 F. Supp. 2d 82, 100-01 (D.D.C. 1998).`
      
      const citations = getCitations(text)
      const formatted = formatBluebook(citations, { reorderParallel: true })
      
      // First case: WL should come before LEXIS
      const brownCitations = formatted.filter(c => 
        c instanceof FullCaseCitation && c.metadata.plaintiff === 'Brown'
      )
      expect(brownCitations[0].matchedText()).toContain('WL')
      expect(brownCitations[1].matchedText()).toContain('LEXIS')
      
      // Other cases should maintain their positions
      const russellCitation = formatted.find(c => 
        c instanceof FullCaseCitation && c.metadata.plaintiff === 'Russell'
      )
      expect(russellCitation?.matchedText()).toBe('672 F. Supp. 2d 1008')
      
      const raineyCitation = formatted.find(c => 
        c instanceof FullCaseCitation && c.metadata.plaintiff === 'Rainey'
      )
      expect(raineyCitation?.matchedText()).toBe('26 F. Supp. 2d 82')
    })
  })
})