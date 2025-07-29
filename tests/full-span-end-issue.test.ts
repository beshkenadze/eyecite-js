import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { FullCaseCitation, IdCitation } from '../src/models'

describe('FullSpanEnd issue with signal phrases', () => {
  describe('Root cause: en-dash vs hyphen in pin cites', () => {
    test('FAILS: citation with en-dash in pin cite prevents metadata extraction', () => {
      const text = "Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)." // en-dash
      const citations = getCitations(text)
      
      const caseCitation = citations[0] as FullCaseCitation
      expect(caseCitation).toBeInstanceOf(FullCaseCitation)
      
      // These assertions should now pass with the fix
      expect(caseCitation.fullSpanEnd).toBeDefined()
      expect(caseCitation.metadata.court).toBe('dcd') // Court is normalized to lowercase
      expect(caseCitation.year).toBe(2006)
      expect(caseCitation.metadata.pinCite).toBe('58–59')
    })

    test('PASSES: citation with regular hyphen in pin cite works correctly', () => {
      const text = "Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58-59 (D.D.C. 2006)." // regular hyphen
      const citations = getCitations(text)
      
      const caseCitation = citations[0] as FullCaseCitation
      expect(caseCitation).toBeInstanceOf(FullCaseCitation)
      
      // These should pass with regular hyphen
      expect(caseCitation.fullSpanEnd).toBeDefined()
      expect(caseCitation.metadata.court).toBe('dcd') // Court is normalized to lowercase
      expect(caseCitation.year).toBe(2006)
      expect(caseCitation.metadata.pinCite).toBe('58-59')
    })

    test('demonstrates the regex issue', () => {
      // The regex patterns in addPostCitation only match hyphens (-), not en-dashes (–)
      const simpleRegex = /^(?:,\s*([0-9]+(?:-[0-9]+)?(?:\s*[&,]\s*[0-9]+(?:-[0-9]+)?)*))?\s*\(([^)]+)\)/
      
      const textWithEnDash = ", 58–59 (D.D.C. 2006)."
      const textWithHyphen = ", 58-59 (D.D.C. 2006)."
      
      expect(textWithEnDash.match(simpleRegex)).toBeNull()
      expect(textWithHyphen.match(simpleRegex)).toBeTruthy()
      
      // A flexible regex that handles both would work:
      const flexibleRegex = /^(?:,\s*([0-9]+(?:[-–][0-9]+)?(?:\s*[&,]\s*[0-9]+(?:[-–][0-9]+)?)*))?\s*\(([^)]+)\)/
      expect(textWithEnDash.match(flexibleRegex)).toBeTruthy()
      expect(textWithHyphen.match(flexibleRegex)).toBeTruthy()
    })
  })
  test('extracts court and year from citation with "Id.; see also" prefix', () => {
    const text = "Id.; see also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    
    // First citation should be IdCitation
    const idCitation = citations[0]
    expect(idCitation).toBeInstanceOf(IdCitation)
    expect(idCitation.matchedText()).toBe('Id.;')
    
    // Second citation should be FullCaseCitation
    const caseCitation = citations[1] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    expect(caseCitation.matchedText()).toBe('453 F. Supp. 2d 44')
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    expect(caseCitation.fullSpanEnd).toBeGreaterThan(caseCitation.span().end)
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
    expect(caseCitation.metadata.year).toBe('2006')
    
    // Check pin cite extraction
    expect(caseCitation.metadata.pinCite).toBe('58–59')
    
    // Check full span includes parenthetical
    const fullSpan = caseCitation.fullSpan()
    expect(text.substring(fullSpan.start, fullSpan.end)).toContain('(D.D.C. 2006)')
  })

  test('extracts court and year from citation with "See also" prefix', () => {
    const text = "See also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    expect(caseCitation.matchedText()).toBe('453 F. Supp. 2d 44')
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    expect(caseCitation.fullSpanEnd).toBeGreaterThan(caseCitation.span().end)
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
    expect(caseCitation.metadata.year).toBe('2006')
    
    // Check pin cite extraction
    expect(caseCitation.metadata.pinCite).toBe('58–59')
    
    // Check full span includes parenthetical
    const fullSpan = caseCitation.fullSpan()
    expect(text.substring(fullSpan.start, fullSpan.end)).toContain('(D.D.C. 2006)')
  })

  test('extracts court and year from citation with "But see" prefix', () => {
    const text = "But see Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
  })

  test('extracts court and year from citation with "Cf." prefix', () => {
    const text = "Cf. Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
  })

  test('extracts court and year from citation with "See generally" prefix', () => {
    const text = "See generally Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
  })

  test('extracts court and year from citation with "Id. at" prefix', () => {
    const text = "Id. at 58; see also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    
    // First citation should be IdCitation
    const idCitation = citations[0]
    expect(idCitation).toBeInstanceOf(IdCitation)
    
    // Second citation should be FullCaseCitation
    const caseCitation = citations[1] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
  })

  test('extracts court and year from citation without signal phrase', () => {
    const text = "Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
    
    // Check full span includes the entire citation
    const fullSpan = caseCitation.fullSpan()
    const fullText = text.substring(fullSpan.start, fullSpan.end)
    expect(fullText).toBe("Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)")
  })

  test('extracts multiple citations with various signal phrases', () => {
    const text = `
      See Hunter v. Sprint Corp., 453 F. Supp. 2d 44 (D.D.C. 2006).
      But see Smith v. Jones, 123 F.3d 456 (2d Cir. 2005).
      Cf. Johnson v. Williams, 789 F. Supp. 2d 100 (S.D.N.Y. 2010).
      Id.; see also Brown v. Davis, 456 U.S. 789 (1982).
    `
    const citations = getCitations(text)
    
    expect(citations.length).toBeGreaterThanOrEqual(4)
    
    // Check each FullCaseCitation has court and year
    citations.forEach(citation => {
      if (citation instanceof FullCaseCitation) {
        expect(citation.fullSpanEnd).toBeDefined()
        expect(citation.metadata.court).toBeTruthy()
        expect(citation.year).toBeTruthy()
      }
    })
  })

  test('handles citations with parentheticals after court/year', () => {
    const text = "See Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006) (holding that...)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined and includes parenthetical
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
    
    // Check parenthetical extraction
    expect(caseCitation.metadata.parenthetical).toContain('holding that')
  })

  test('handles citations with complex signal phrases', () => {
    const text = "See, e.g., Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    
    const caseCitation = citations[0] as FullCaseCitation
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    
    // Check that fullSpanEnd is defined
    expect(caseCitation.fullSpanEnd).toBeDefined()
    
    // Check that court and year are extracted
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
  })

  test('verifies the bug: fullSpanEnd undefined prevents metadata extraction', () => {
    const text = "Id.; see also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58–59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    const caseCitation = citations.find(c => c instanceof FullCaseCitation) as FullCaseCitation
    expect(caseCitation).toBeDefined()
    
    // This test demonstrates the bug:
    // When fullSpanEnd is undefined, the citation parser cannot properly extract
    // the court and year information from the parenthetical "(D.D.C. 2006)"
    
    // The following assertions will fail if the bug is present:
    if (!caseCitation.fullSpanEnd) {
      console.warn('BUG CONFIRMED: fullSpanEnd is undefined')
      console.warn('This prevents extraction of court:', caseCitation.metadata.court)
      console.warn('This prevents extraction of year:', caseCitation.year)
    }
    
    // These should pass when the bug is fixed:
    expect(caseCitation.fullSpanEnd).toBeDefined()
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.year).toBe(2006)
  })
})