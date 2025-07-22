import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src'
import { DOLOpinionCitation } from '../src/models'

describe('DOL Opinion Letter Citations', () => {
  test('should extract basic DOL Opinion Letter citations', () => {
    const text = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.subject).toBe('FLSA')
    expect(citation.year).toBe('2009')
    expect(citation.number).toBe('19')
    expect(citation.date).toBe('Jan. 16, 2009')
  })

  test('should extract DOL Opinion Letters with different subjects', () => {
    const testCases = [
      { text: 'DOL Opinion Letter FLSA 2008-12 (Nov. 3, 2008)', subject: 'FLSA' },
      { text: 'DOL Opinion Letter FMLA 2019-01 (Mar. 14, 2019)', subject: 'FMLA' },
      { text: 'DOL Opinion Letter WH 2020-5 (May 19, 2020)', subject: 'WH' },
    ]

    testCases.forEach(({ text, subject }) => {
      const citations = getCitations(text)
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
      expect((citations[0] as DOLOpinionCitation).subject).toBe(subject)
    })
  })

  test('should extract DOL Opinion Letters in context', () => {
    const text = 'According to DOL Opinion Letter FLSA 2019-01 (Mar. 14, 2019), the employer must comply.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.matchedText()).toBe('DOL Opinion Letter FLSA 2019-01 (Mar. 14, 2019)')
  })

  test('should handle single-digit opinion numbers', () => {
    const text = 'DOL Opinion Letter WH 2020-5 (May 19, 2020)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.number).toBe('5')
  })

  test('should handle double-digit opinion numbers', () => {
    const text = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.number).toBe('19')
  })

  test('should extract multiple DOL Opinion citations', () => {
    const text = 'See DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009) and DOL Opinion Letter FMLA 2019-01 (Mar. 14, 2019).'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    expect(citations[1]).toBeInstanceOf(DOLOpinionCitation)
    
    expect((citations[0] as DOLOpinionCitation).subject).toBe('FLSA')
    expect((citations[1] as DOLOpinionCitation).subject).toBe('FMLA')
  })

  test('should generate correct hash for DOL Opinion citations', () => {
    const text1 = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const text2 = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const text3 = 'DOL Opinion Letter FLSA 2009-20 (Jan. 16, 2009)'
    
    const citations1 = getCitations(text1)
    const citations2 = getCitations(text2)
    const citations3 = getCitations(text3)
    
    // Same citations should have same hash
    expect(citations1[0].hash()).toBe(citations2[0].hash())
    
    // Different citations should have different hash
    expect(citations1[0].hash()).not.toBe(citations3[0].hash())
  })

  test('should format DOL Opinion citation correctly', () => {
    const text = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const citations = getCitations(text)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.correctedCitationFull()).toBe('DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)')
  })
})