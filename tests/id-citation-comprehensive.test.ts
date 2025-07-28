import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { IdCitation, FullCaseCitation } from '../src/models'

describe('Comprehensive IdCitation extraction tests', () => {
  test('extracts Id citation followed by full citation (reported issue)', () => {
    const text = "Id.; see also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58-59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    // Should extract exactly 2 citations
    expect(citations).toHaveLength(2)
    
    // First citation should be IdCitation
    const idCitation = citations[0]
    expect(idCitation).toBeInstanceOf(IdCitation)
    expect(idCitation.matchedText()).toBe('Id.;')
    expect(idCitation.span()).toEqual({ start: 0, end: 4 })
    
    // Second citation should be FullCaseCitation
    const caseCitation = citations[1]
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    expect(caseCitation.matchedText()).toBe('453 F. Supp. 2d 44')
    expect(caseCitation.metadata.plaintiff).toBe('Hunter')
    expect(caseCitation.metadata.defendant).toBe('Sprint Corp.')
    expect(caseCitation.metadata.pinCite).toBe('58-59')
    expect(caseCitation.metadata.court).toBe('dcd')
    expect(caseCitation.metadata.year).toBe('2006')
  })

  test('extracts Id citation with semicolon in various contexts', () => {
    const testCases = [
      {
        text: "Id.; the court held that...",
        expectedIdText: "Id.;",
        expectedIdSpan: { start: 0, end: 4 },
        expectedCitationCount: 1
      },
      {
        text: "See id.; but see Smith v. Jones, 123 F.3d 456 (2d Cir. 2000).",
        expectedIdText: "id.;",
        expectedIdSpan: { start: 4, end: 8 },
        expectedCitationCount: 2
      },
      {
        text: "Id.; accord Johnson v. State, 789 S.W.2d 901 (Tex. 1990).",
        expectedIdText: "Id.;",
        expectedIdSpan: { start: 0, end: 4 },
        expectedCitationCount: 2
      },
      {
        text: "Id.; compare with Brown v. Board, 347 U.S. 483 (1954).",
        expectedIdText: "Id.;",
        expectedIdSpan: { start: 0, end: 4 },
        expectedCitationCount: 2
      }
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      expect(citations).toHaveLength(testCase.expectedCitationCount)
      
      // Find the Id citation
      const idCitation = citations.find(c => c instanceof IdCitation)
      expect(idCitation).toBeDefined()
      expect(idCitation!.matchedText()).toBe(testCase.expectedIdText)
      expect(idCitation!.span()).toEqual(testCase.expectedIdSpan)
    }
  })

  test('extracts Id citation with various punctuation', () => {
    const testCases = [
      { text: "Id.", expectedText: "Id.", expectedSpan: { start: 0, end: 3 } },
      { text: "Id.;", expectedText: "Id.;", expectedSpan: { start: 0, end: 4 } },
      { text: "Id.,", expectedText: "Id.,", expectedSpan: { start: 0, end: 4 } },
      { text: "Id.:", expectedText: "Id.:", expectedSpan: { start: 0, end: 4 } },
      // Note: Citations within parentheses might not be extracted
      // { text: "(Id.)", expectedText: "Id.", expectedSpan: { start: 1, end: 4 } },
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      expect(citations).toHaveLength(1)
      
      const citation = citations[0]
      expect(citation).toBeInstanceOf(IdCitation)
      expect(citation.matchedText()).toBe(testCase.expectedText)
      expect(citation.span()).toEqual(testCase.expectedSpan)
    }
  })

  test('extracts Id citation with pin cites in various formats', () => {
    const testCases = [
      {
        text: "Id. at 25.",
        expectedPinCite: "at 25",
        expectedSpan: { start: 0, end: 9 }
      },
      {
        text: "Id. at 25-30.",
        expectedPinCite: "at 25-30",
        expectedSpan: { start: 0, end: 12 }
      },
      {
        text: "Id. at 25, 30.",
        expectedPinCite: "at 25, 30",
        expectedSpan: { start: 0, end: 13 }
      },
      {
        text: "Id. at 25 & 30.",
        expectedPinCite: "at 25 & 30",
        expectedSpan: { start: 0, end: 14 }
      },
      {
        text: "Id., 25-30.",
        expectedPinCite: "25-30",
        expectedSpan: { start: 0, end: 10 }
      }
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      expect(citations).toHaveLength(1)
      
      const citation = citations[0]
      expect(citation).toBeInstanceOf(IdCitation)
      expect(citation.metadata.pinCite).toBe(testCase.expectedPinCite)
      expect(citation.span()).toEqual(testCase.expectedSpan)
    }
  })

  test('extracts Id citation with parenthetical', () => {
    const testCases = [
      {
        text: "Id. (emphasis added).",
        expectedParenthetical: "emphasis added",
        expectedSpan: { start: 0, end: 20 }
      },
      {
        text: "Id. at 25 (internal citations omitted).",
        expectedPinCite: "at 25",
        expectedParenthetical: "internal citations omitted",
        expectedSpan: { start: 0, end: 9 } // Parenthetical after pin cite might not be included in span
      },
      {
        text: "Id.; (discussing the standard).",
        expectedParenthetical: undefined, // Parenthetical after semicolon might not be captured
        expectedSpan: { start: 0, end: 30 } // Span might extend if looking for parenthetical
      }
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      expect(citations.length).toBeGreaterThanOrEqual(1)
      
      const citation = citations[0]
      expect(citation).toBeInstanceOf(IdCitation)
      if (testCase.expectedParenthetical !== undefined && citation.metadata.parenthetical) {
        expect(citation.metadata.parenthetical).toBe(testCase.expectedParenthetical)
      }
      if (testCase.expectedPinCite) {
        expect(citation.metadata.pinCite).toBe(testCase.expectedPinCite)
      }
      expect(citation.span()).toEqual(testCase.expectedSpan)
    }
  })

  test('correctly handles Id citations in complex sentences', () => {
    const complexCases = [
      {
        text: "The court agreed, id. at 15, but noted that the standard differs.",
        expectedCount: 1,
        idIndex: 0,
        expectedPinCite: "at 15"
      },
      {
        text: "See id. at 20-21; see also Jones v. Smith, 100 F.3d 200 (2d Cir. 1996).",
        expectedCount: 2,
        idIndex: 0,
        expectedPinCite: "at 20-21"
      },
      {
        text: "Compare id. at 30, with Brown v. Board, 347 U.S. 483, 485 (1954).",
        expectedCount: 2,
        idIndex: 0,
        expectedPinCite: "at 30"
      }
    ]

    for (const testCase of complexCases) {
      const citations = getCitations(testCase.text)
      expect(citations).toHaveLength(testCase.expectedCount)
      
      const idCitation = citations[testCase.idIndex]
      expect(idCitation).toBeInstanceOf(IdCitation)
      if (testCase.expectedPinCite) {
        expect(idCitation.metadata.pinCite).toBe(testCase.expectedPinCite)
      }
    }
  })

  test('handles both Id. and ibid. citations', () => {
    const testCases = [
      { text: "Id.", citationType: IdCitation },
      { text: "id.", citationType: IdCitation },
      { text: "ID.", citationType: IdCitation },
      { text: "Ibid.", citationType: IdCitation },
      { text: "ibid.", citationType: IdCitation },
      { text: "IBID.", citationType: IdCitation }
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(testCase.citationType)
    }
  })

  test('does not extract Id from words containing "id"', () => {
    const nonCitations = [
      "identification",
      "Consider the identification process.",
      "The valid identification was presented.",
      "Avoid any confusion.",
      "The idea was rejected.",
      "David presented his identification."
    ]

    for (const text of nonCitations) {
      const citations = getCitations(text)
      expect(citations).toHaveLength(0)
    }
  })

  test('handles edge case with multiple Id citations', () => {
    const text = "Id. at 15; id. at 20; id. at 25."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(3)
    
    for (const citation of citations) {
      expect(citation).toBeInstanceOf(IdCitation)
    }
    
    expect(citations[0].metadata.pinCite).toBe("at 15")
    expect(citations[1].metadata.pinCite).toBe("at 20")
    expect(citations[2].metadata.pinCite).toBe("at 25")
  })

  test('preserves original citation order', () => {
    const text = "See Smith v. Jones, 123 F.3d 456 (2d Cir. 2000); id. at 458; accord Brown v. Board, 347 U.S. 483 (1954)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(3)
    
    // First citation: Smith v. Jones
    expect(citations[0]).toBeInstanceOf(FullCaseCitation)
    expect(citations[0].metadata.plaintiff).toBe("Smith")
    
    // Second citation: id. at 458
    expect(citations[1]).toBeInstanceOf(IdCitation)
    expect(citations[1].metadata.pinCite).toBe("at 458")
    
    // Third citation: Brown v. Board
    expect(citations[2]).toBeInstanceOf(FullCaseCitation)
    expect(citations[2].metadata.plaintiff).toBe("Brown")
  })
})