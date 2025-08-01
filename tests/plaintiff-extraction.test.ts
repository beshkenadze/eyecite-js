import { describe, test, expect } from 'bun:test'
import { getCitations } from '../src'
import type { FullCaseCitation } from '../src/models/citations'

describe('Plaintiff extraction', () => {
  test('should not include preceding text in plaintiff name', () => {
    const testCases = [
      {
        text: 'Your test text with Brown v. Board, 347 U.S. 483 (1954)',
        expectedPlaintiff: 'Brown',
        expectedDefendant: 'Board',
        expectedFullSpanStart: 19  // Includes space before Brown
      },
      {
        text: 'See Brown v. Board of Education, 347 U.S. 483 (1954).',
        expectedPlaintiff: 'Brown',
        expectedDefendant: 'Board of Education',
        expectedFullSpanStart: 3  // Includes space before Brown
      },
      {
        text: 'The court in Brown v. Board, 347 U.S. 483 (1954) held that...',
        expectedPlaintiff: 'Brown',
        expectedDefendant: 'Board',
        expectedFullSpanStart: 12  // Includes space before Brown
      },
      {
        text: 'As discussed in United States v. Microsoft, 253 F.3d 34 (D.C. Cir. 2001)...',
        expectedPlaintiff: 'United States',
        expectedDefendant: 'Microsoft',
        expectedFullSpanStart: 15  // Includes space before United States
      },
      {
        text: 'This follows Roe v. Wade, 410 U.S. 113 (1973) and its progeny.',
        expectedPlaintiff: 'Roe',
        expectedDefendant: 'Wade',
        expectedFullSpanStart: 12  // Includes space before Roe
      }
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      expect(citations.length).toBe(1)
      
      const citation = citations[0] as FullCaseCitation
      expect(citation.metadata.plaintiff).toBe(testCase.expectedPlaintiff)
      expect(citation.metadata.defendant).toBe(testCase.expectedDefendant)
      expect(citation.fullSpan().start).toBe(testCase.expectedFullSpanStart)
    }
  })

  test('should handle complex case names correctly', () => {
    const cases = [
      {
        text: 'In United States ex rel. Smith v. Jones, 123 F.3d 456 (2d Cir. 1999)...',
        expectedPlaintiff: 'United States ex rel. Smith',
        expectedDefendant: 'Jones'
      },
      {
        text: 'The Matter of Baby M, 109 N.J. 396 (1988) established...',
        expectedPlaintiff: 'Matter of Baby M',
        expectedDefendant: ''
      },
      {
        text: 'See In re Enron Corp., 123 B.R. 456 (Bankr. S.D. Tex. 2002).',
        expectedPlaintiff: 'In re Enron Corp.',
        expectedDefendant: ''
      }
    ]

    for (const testCase of cases) {
      const citations = getCitations(testCase.text)
      expect(citations.length).toBe(1)
      
      const citation = citations[0] as FullCaseCitation
      expect(citation.metadata.plaintiff).toBe(testCase.expectedPlaintiff)
      expect(citation.metadata.defendant).toBe(testCase.expectedDefendant)
    }
  })

  test('should handle sentence boundaries properly', () => {
    const text = 'This is a sentence. Brown v. Board, 347 U.S. 483 (1954) is important.'
    const citations = getCitations(text)
    
    expect(citations.length).toBe(1)
    const citation = citations[0] as FullCaseCitation
    expect(citation.metadata.plaintiff).toBe('Brown')
    expect(citation.metadata.defendant).toBe('Board')
    expect(citation.fullSpan().start).toBe(19) // Starts at space before "Brown"
  })
})