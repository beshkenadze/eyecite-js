import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
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
    expect(citation.span()).toEqual({ start: 0, end: 47 })
  })

  test('should extract DOL Opinion Letters with different subjects', () => {
    const testCases = [
      { 
        text: 'DOL Opinion Letter FLSA 2008-12 (Nov. 3, 2008)', 
        subject: 'FLSA',
        year: '2008',
        number: '12'
      },
      { 
        text: 'DOL Opinion Letter FMLA 2019-01 (Mar. 14, 2019)', 
        subject: 'FMLA',
        year: '2019',
        number: '01'
      },
      { 
        text: 'DOL Opinion Letter WH 2020-5 (May 19, 2020)', 
        subject: 'WH',
        year: '2020',
        number: '5'
      },
      { 
        text: 'DOL Opinion Letter ERISA 2021-03 (Dec. 1, 2021)', 
        subject: 'ERISA',
        year: '2021',
        number: '03'
      }
    ]

    testCases.forEach(({ text, subject, year, number }) => {
      const citations = getCitations(text)
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
      
      const citation = citations[0] as DOLOpinionCitation
      expect(citation.subject).toBe(subject)
      expect(citation.year).toBe(year)
      expect(citation.number).toBe(number)
    })
  })

  test('should extract DOL Opinion Letters in context', () => {
    const text = 'According to DOL Opinion Letter FLSA 2019-01 (Mar. 14, 2019), the employer must comply with wage requirements.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.matchedText()).toBe('DOL Opinion Letter FLSA 2019-01 (Mar. 14, 2019)')
    expect(citation.span()).toEqual({ start: 13, end: 60 })
  })

  test('should handle single-digit opinion numbers', () => {
    const text = 'DOL Opinion Letter WH 2020-5 (May 19, 2020)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.number).toBe('5')
    expect(citation.year).toBe('2020')
  })

  test('should handle double-digit opinion numbers', () => {
    const text = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.number).toBe('19')
    expect(citation.year).toBe('2009')
  })

  test('should handle zero-padded opinion numbers', () => {
    const text = 'DOL Opinion Letter FMLA 2019-01 (Mar. 14, 2019)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.number).toBe('01')
    expect(citation.year).toBe('2019')
  })

  test('should extract multiple DOL Opinion citations', () => {
    const text = 'See DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009) and DOL Opinion Letter FMLA 2019-01 (Mar. 14, 2019) for guidance.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    expect(citations[1]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation1 = citations[0] as DOLOpinionCitation
    const citation2 = citations[1] as DOLOpinionCitation
    
    expect(citation1.subject).toBe('FLSA')
    expect(citation1.year).toBe('2009')
    expect(citation2.subject).toBe('FMLA')
    expect(citation2.year).toBe('2019')
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

  test('should handle different date formats', () => {
    const testCases = [
      {
        text: 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)',
        expectedDate: 'Jan. 16, 2009'
      },
      {
        text: 'DOL Opinion Letter FMLA 2020-05 (December 1, 2020)',
        expectedDate: 'December 1, 2020'
      },
      {
        text: 'DOL Opinion Letter WH 2021-8 (Feb. 28, 2021)',
        expectedDate: 'Feb. 28, 2021'
      }
    ]

    testCases.forEach(({ text, expectedDate }) => {
      const citations = getCitations(text)
      expect(citations).toHaveLength(1)
      const citation = citations[0] as DOLOpinionCitation
      expect(citation.date).toBe(expectedDate)
    })
  })

  test('should handle different subject matter codes', () => {
    const subjectCodes = [
      'FLSA',
      'FMLA', 
      'WH',
      'ERISA',
      'OSHA',
      'WARN'
    ]

    subjectCodes.forEach(subject => {
      const text = `DOL Opinion Letter ${subject} 2020-01 (Jan. 1, 2020)`
      const citations = getCitations(text)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
      
      const citation = citations[0] as DOLOpinionCitation
      expect(citation.subject).toBe(subject)
    })
  })

  test('should preserve span accuracy with surrounding text', () => {
    const testCases = [
      {
        text: 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)',
        expectedSpan: { start: 0, end: 47 }
      },
      {
        text: 'Per DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009), overtime is required.',
        expectedSpan: { start: 4, end: 51 }
      },
      {
        text: 'The guidance in DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009) is clear.',
        expectedSpan: { start: 16, end: 63 }
      }
    ]

    testCases.forEach(({ text, expectedSpan }) => {
      const citations = getCitations(text)
      expect(citations).toHaveLength(1)
      expect(citations[0].span()).toEqual(expectedSpan)
    })
  })

  test('should handle year variations correctly', () => {
    const yearTestCases = [
      { text: 'DOL Opinion Letter FLSA 2005-01 (Jan. 1, 2005)', year: '2005' },
      { text: 'DOL Opinion Letter FMLA 2010-15 (Jun. 15, 2010)', year: '2010' },
      { text: 'DOL Opinion Letter WH 2015-08 (Aug. 30, 2015)', year: '2015' },
      { text: 'DOL Opinion Letter ERISA 2020-12 (Dec. 31, 2020)', year: '2020' },
      { text: 'DOL Opinion Letter FLSA 2023-03 (Mar. 15, 2023)', year: '2023' }
    ]

    yearTestCases.forEach(({ text, year }) => {
      const citations = getCitations(text)
      expect(citations).toHaveLength(1)
      const citation = citations[0] as DOLOpinionCitation
      expect(citation.year).toBe(year)
    })
  })

  test('should extract metadata correctly from groups', () => {
    const text = 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0] as DOLOpinionCitation
    
    // Test that basic properties are accessible
    expect(typeof citation.subject).toBe('string')
    expect(typeof citation.year).toBe('string')
    expect(typeof citation.number).toBe('string')
    expect(typeof citation.date).toBe('string')
  })

  test('should handle edge cases with whitespace and punctuation', () => {
    const text = 'According to DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009), the requirements are clear.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(DOLOpinionCitation)
    
    const citation = citations[0] as DOLOpinionCitation
    expect(citation.matchedText()).toBe('DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)')
    // The comma should not be included in the citation span
    expect(citation.span().end).toBe(60)
  })
})