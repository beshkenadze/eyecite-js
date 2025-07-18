import { describe, expect, test } from 'bun:test'
import {
  CitationBase,
  FullCaseCitation,
  FullJournalCitation,
  FullLawCitation,
  IdCitation,
  ShortCaseCitation,
  SupraCitation,
  Token,
  UnknownCitation,
  createEdition,
  createReporter,
} from '../src/models'

describe('Models', () => {
  describe('Token', () => {
    test('should create a basic token', () => {
      const token = new Token('test', 0, 4, { volume: '123' })
      expect(token.data).toBe('test')
      expect(token.start).toBe(0)
      expect(token.end).toBe(4)
      expect(token.groups.volume).toBe('123')
    })

    test('should merge identical tokens', () => {
      const token1 = new Token('test', 0, 4)
      const token2 = new Token('test', 0, 4)
      const merged = token1.merge(token2)
      expect(merged).toBe(token1)
    })

    test('should not merge different tokens', () => {
      const token1 = new Token('test', 0, 4)
      const token2 = new Token('test', 0, 5) // Different end
      const merged = token1.merge(token2)
      expect(merged).toBeNull()
    })
  })

  describe('Reporter and Edition', () => {
    test('should create a reporter', () => {
      const reporter = createReporter('U.S.', 'United States Supreme Court Reports', 'federal', 'reporters')
      expect(reporter.shortName).toBe('U.S.')
      expect(reporter.name).toBe('United States Supreme Court Reports')
      expect(reporter.isScotus).toBe(true)
    })

    test('should create an edition', () => {
      const reporter = createReporter('S.W.', 'South Western Reporter', 'state', 'reporters')
      const edition = createEdition(reporter, 'S.W.2d', new Date('1999-01-01'), null)
      expect(edition.shortName).toBe('S.W.2d')
      expect(edition.reporter).toBe(reporter)
    })
  })

  describe('Citations', () => {
    test('should create a FullCaseCitation', () => {
      const token = new Token('1 U.S. 12', 0, 9, {
        volume: '1',
        reporter: 'U.S.',
        page: '12',
      })
      const citation = new FullCaseCitation(token, 0)
      expect(citation.groups.volume).toBe('1')
      expect(citation.groups.reporter).toBe('U.S.')
      expect(citation.groups.page).toBe('12')
    })

    test('should handle missing page numbers', () => {
      const token = new Token('1 U.S. ___', 0, 10, {
        volume: '1',
        reporter: 'U.S.',
        page: '___',
      })
      const citation = new FullCaseCitation(token, 0)
      // The CitationBase constructor converts "___" to null
      expect(citation.groups.page).toBeNull()
    })

    test('should create IdCitation with unique hash', () => {
      const token1 = new Token('Id.', 0, 3)
      const token2 = new Token('Id.', 0, 3)
      const citation1 = new IdCitation(token1, 0)
      const citation2 = new IdCitation(token2, 1)
      
      // Each IdCitation should have a unique hash
      expect(citation1.hash()).not.toBe(citation2.hash())
    })

    test('should format SupraCitation correctly', () => {
      const token = new Token('supra', 0, 5)
      const citation = new SupraCitation(token, 0, {
        antecedentGuess: 'Foo',
        pinCite: 'at 123',
      })
      expect(citation.formatted()).toBe('Foo, supra, at 123')
    })
  })
})