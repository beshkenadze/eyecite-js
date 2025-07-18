import { describe, expect, test } from 'bun:test'
import {
  CitationToken,
  FullCaseCitation,
  IdCitation,
  IdToken,
  Resource,
  ShortCaseCitation,
  SupraCitation,
  SupraToken,
} from '../src/models'
import { resolveCitations } from '../src/resolve'

describe('Citation Resolution', () => {
  describe('resolveCitations', () => {
    test('should resolve full citations to resources', () => {
      const fullCite = new FullCaseCitation(
        new CitationToken('1 U.S. 1', 0, 7, {
          volume: '1',
          reporter: 'U.S.',
          page: '1',
        }),
        0,
        [],
        [],
        { defendant: 'Bar', plaintiff: 'Foo' },
      )

      const resolutions = resolveCitations([fullCite])
      
      expect(resolutions.size).toBe(1)
      const resources = Array.from(resolutions.keys())
      expect(resources[0]).toBeInstanceOf(Resource)
      expect(resolutions.get(resources[0])).toEqual([fullCite])
    })

    test('should resolve short citations to matching full citations', () => {
      const fullCite = new FullCaseCitation(
        new CitationToken('1 U.S. 1', 0, 7, {
          volume: '1',
          reporter: 'U.S.',
          page: '1',
        }),
        0,
        [],
        [],
        { defendant: 'Bar', plaintiff: 'Foo' },
      )

      const shortCite = new ShortCaseCitation(
        new CitationToken('1 U.S. at 5', 10, 21, {
          volume: '1',
          reporter: 'U.S.',
          page: '5',
        }),
        1,
        [],
        [],
        { antecedentGuess: 'Bar' },
      )

      const resolutions = resolveCitations([fullCite, shortCite])
      
      expect(resolutions.size).toBe(1)
      const resources = Array.from(resolutions.keys())
      const citations = resolutions.get(resources[0])
      
      expect(citations).toHaveLength(2)
      expect(citations).toContain(fullCite)
      expect(citations).toContain(shortCite)
    })

    test('should resolve id citations to previous citation', () => {
      const fullCite = new FullCaseCitation(
        new CitationToken('1 U.S. 1', 0, 7, {
          volume: '1',
          reporter: 'U.S.',
          page: '1',
        }),
        0,
        [],
        [],
      )

      const idCite = new IdCitation(
        new IdToken('id.', 10, 13),
        1,
        { pinCite: 'at 5' },
      )

      const resolutions = resolveCitations([fullCite, idCite])
      
      expect(resolutions.size).toBe(1)
      const resources = Array.from(resolutions.keys())
      const citations = resolutions.get(resources[0])
      
      expect(citations).toHaveLength(2)
      expect(citations).toContain(fullCite)
      expect(citations).toContain(idCite)
    })

    test('should not resolve id citations with invalid pin cites', () => {
      const fullCite = new FullCaseCitation(
        new CitationToken('1 U.S. 100', 0, 10, {
          volume: '1',
          reporter: 'U.S.',
          page: '100',
        }),
        0,
        [],
        [],
      )

      // Pin cite is before the start page - should fail
      const idCite = new IdCitation(
        new IdToken('id.', 15, 18),
        1,
        { pinCite: 'at 50' },
      )

      const resolutions = resolveCitations([fullCite, idCite])
      
      expect(resolutions.size).toBe(1)
      const resources = Array.from(resolutions.keys())
      const citations = resolutions.get(resources[0])
      
      // Only the full citation should be resolved
      expect(citations).toHaveLength(1)
      expect(citations).toContain(fullCite)
      expect(citations).not.toContain(idCite)
    })

    test('should resolve supra citations by antecedent', () => {
      const fullCite = new FullCaseCitation(
        new CitationToken('1 U.S. 1', 0, 7, {
          volume: '1',
          reporter: 'U.S.',
          page: '1',
        }),
        0,
        [],
        [],
        { defendant: 'Smith', plaintiff: 'Jones' },
      )

      const supraCite = new SupraCitation(
        new SupraToken('supra', 15, 20),
        1,
        { antecedentGuess: 'Smith' },
      )

      const resolutions = resolveCitations([fullCite, supraCite])
      
      expect(resolutions.size).toBe(1)
      const resources = Array.from(resolutions.keys())
      const citations = resolutions.get(resources[0])
      
      expect(citations).toHaveLength(2)
      expect(citations).toContain(fullCite)
      expect(citations).toContain(supraCite)
    })

    test('should handle multiple resources', () => {
      const fullCite1 = new FullCaseCitation(
        new CitationToken('1 U.S. 1', 0, 7, {
          volume: '1',
          reporter: 'U.S.',
          page: '1',
        }),
        0,
        [],
        [],
        { defendant: 'Bar', plaintiff: 'Foo' },
      )

      const fullCite2 = new FullCaseCitation(
        new CitationToken('2 U.S. 100', 20, 30, {
          volume: '2',
          reporter: 'U.S.',
          page: '100',
        }),
        2,
        [],
        [],
        { defendant: 'Doe', plaintiff: 'Smith' },
      )

      const idCite = new IdCitation(
        new IdToken('id.', 35, 38),
        3,
        { pinCite: 'at 105' },
      )

      const resolutions = resolveCitations([fullCite1, fullCite2, idCite])
      
      expect(resolutions.size).toBe(2)
      
      // Check that id citation is grouped with the second full citation
      for (const [resource, citations] of resolutions) {
        if (citations.includes(fullCite2)) {
          expect(citations).toContain(idCite)
        }
      }
    })

    test('should handle unresolvable citations', () => {
      const supraCite = new SupraCitation(
        new SupraToken('supra', 0, 5),
        0,
        {}, // No antecedent guess - can't resolve
      )

      const resolutions = resolveCitations([supraCite])
      
      // Should be empty since the citation couldn't be resolved
      expect(resolutions.size).toBe(0)
    })
  })

  describe('Custom Resolution Functions', () => {
    test('should accept custom resolution functions', () => {
      const customResource = { id: 'custom-123' }
      
      const fullCite = new FullCaseCitation(
        new CitationToken('1 U.S. 1', 0, 7, {
          volume: '1',
          reporter: 'U.S.',
          page: '1',
        }),
        0,
        [],
        [],
      )

      const resolutions = resolveCitations([fullCite], {
        resolveFullCitation: () => customResource,
      })
      
      expect(resolutions.size).toBe(1)
      expect(resolutions.has(customResource)).toBe(true)
      expect(resolutions.get(customResource)).toEqual([fullCite])
    })
  })
})