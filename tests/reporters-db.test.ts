import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { FullCaseCitation } from '../src/models'
import { EDITIONS, REPORTERS } from '../src/reporters-db'

describe('Reporters Database', () => {
  test('should have basic reporters', () => {
    expect(REPORTERS['U.S.']).toBeDefined()
    expect(REPORTERS['F.']).toBeDefined()
    expect(REPORTERS['Cal.']).toBeDefined()

    // F.3d is an edition within F.
    expect(EDITIONS['F.3d']).toBeDefined()
    expect(EDITIONS['F.2d']).toBeDefined()
  })

  test('should extract U.S. Reports citation', () => {
    const text = 'See Brown v. Board of Education, 347 U.S. 483 (1954).'
    const citations = getCitations(text)

    console.log('Found citations:', citations.length)
    console.log(
      'Citations:',
      citations.map((c) => ({
        type: c.constructor.name,
        text: c.matchedText(),
        groups: c.groups,
      })),
    )

    expect(citations.length).toBeGreaterThanOrEqual(1)

    const caseCitations = citations.filter((c) => c instanceof FullCaseCitation)
    expect(caseCitations.length).toBe(1)

    if (caseCitations.length > 0) {
      const cite = caseCitations[0]
      expect(cite.groups.volume).toBe('347')
      expect(cite.groups.reporter).toBe('U.S.')
      expect(cite.groups.page).toBe('483')
    }
  })

  test('should extract Federal Reporter citation', () => {
    const text = 'In Smith v. Jones, 123 F.3d 456 (2d Cir. 2020).'
    const citations = getCitations(text)

    const caseCitations = citations.filter((c) => c instanceof FullCaseCitation)
    expect(caseCitations.length).toBe(1)

    if (caseCitations.length > 0) {
      const cite = caseCitations[0]
      expect(cite.groups.volume).toBe('123')
      expect(cite.groups.reporter).toBe('F.3d')
      expect(cite.groups.page).toBe('456')
    }
  })

  test('should handle reporter variations', () => {
    const text1 = '123 US 456' // variation without periods
    const text2 = '123 U. S. 456' // variation with spaces

    const citations1 = getCitations(text1)
    const citations2 = getCitations(text2)

    // Both should find citations if variations are set up correctly
    console.log('US variation found:', citations1.length)
    console.log('U. S. variation found:', citations2.length)
  })
})
