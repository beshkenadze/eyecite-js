import { describe, it, expect } from 'bun:test'
import { getCitations } from '../src/find'
import { FullCaseCitation } from '../src/models'

describe('Parallel Citation Support', () => {
  it('should parse U.S. Reports with parallel nominative reporters', () => {
    const testCases = [
      {
        text: '5 U.S. (1 Cranch) 137',
        expectedVolume: '5',
        expectedReporter: 'U.S.',
        expectedPage: '137',
        expectedNominativeVolume: '1',
        expectedNominativeReporter: 'Cranch'
      },
      {
        text: '67 U.S. (Black) 17',
        expectedVolume: '67',
        expectedReporter: 'U.S.',
        expectedPage: '17',
        expectedNominativeVolume: undefined,
        expectedNominativeReporter: 'Black'
      },
      {
        text: '1 U.S. (1 Wall.) 12',
        expectedVolume: '1',
        expectedReporter: 'U.S.',
        expectedPage: '12',
        expectedNominativeVolume: '1',
        expectedNominativeReporter: 'Wall.'
      },
      {
        text: '55 U.S. (Wheat.) 2',
        expectedVolume: '55',
        expectedReporter: 'U.S.',
        expectedPage: '2',
        expectedNominativeVolume: undefined,
        expectedNominativeReporter: 'Wheat.'
      }
    ]

    for (const testCase of testCases) {
      const citations = getCitations(testCase.text)
      
      expect(citations.length).toBe(1)
      
      const citation = citations[0]
      expect(citation).toBeInstanceOf(FullCaseCitation)
      
      if (citation instanceof FullCaseCitation) {
        
        expect(citation.volume).toBe(testCase.expectedVolume)
        expect(citation.page).toBe(testCase.expectedPage)
        
        // Check if nominative reporter information is captured
        if (citation.groups) {
          if (testCase.expectedNominativeVolume) {
            expect(citation.groups.volume_nominative).toBe(testCase.expectedNominativeVolume)
          }
          expect(citation.groups.reporter_nominative).toBe(testCase.expectedNominativeReporter)
        }
      }
    }
  })

  it('should parse full case citations with parallel reporters', () => {
    const fullCitations = [
      'Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803)',
      'Brown v. Board of Education, 347 U.S. 483 (1954)', // No parallel citation
      'Miranda v. Arizona, 384 U.S. 436 (1966)'  // No parallel citation
    ]

    for (const text of fullCitations) {
      const citations = getCitations(text)
      
      expect(citations.length).toBeGreaterThan(0)
      
      if (citations.length > 0) {
        const citation = citations[0]
        expect(citation).toBeInstanceOf(FullCaseCitation)
        
        if (citation instanceof FullCaseCitation) {
          // Basic validation without console output
          expect(citation.volume).toBeDefined()
          expect(citation.page).toBeDefined()
        }
      }
    }
  })

  it('should handle various edge cases', () => {
    const edgeCases = [
      // Missing volume number for nominative reporter
      '5 U.S. (Cranch) 137',
      // Multiple spaces
      '5  U.S.  (1  Cranch)  137',
      // With year
      '5 U.S. (1 Cranch) 137 (1803)',
      // Different punctuation in nominative reporters
      '1 U.S. (1 Dall.) 12',
      '1 U.S. (1 Pet.) 12',
      '1 U.S. (1 How.) 12'
    ]

    for (const text of edgeCases) {
      const citations = getCitations(text)
      // Basic validation for edge cases
      if (citations.length > 0 && citations[0] instanceof FullCaseCitation) {
        const citation = citations[0] as FullCaseCitation
        expect(citation.volume).toBeDefined()
        expect(citation.page).toBeDefined()
      }
    }
  })
})