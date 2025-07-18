import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { CitationToken, type Edition, FullCaseCitation, Reporter } from '../src/models'
import { BaseTokenExtractor, Tokenizer } from '../src/tokenizers/base'
import { CustomTokenizer, RegexPatternBuilder } from '../src/tokenizers/custom'
import { AhocorasickTokenizer } from '../src/tokenizers/default'
import { createCitationExtractor, createSpecialExtractors } from '../src/tokenizers/extractors'

describe('Tokenizer Extensibility', () => {
  describe('Base Tokenizer Extension Methods', () => {
    test('should add single extractor', () => {
      const tokenizer = new Tokenizer([])
      const extractors = createSpecialExtractors()

      expect(tokenizer.extractors).toHaveLength(0)

      tokenizer.addExtractor(extractors[0])
      expect(tokenizer.extractors).toHaveLength(1)
      expect(tokenizer.extractors[0]).toBe(extractors[0])
    })

    test('should add multiple extractors', () => {
      const tokenizer = new Tokenizer([])
      const extractors = createSpecialExtractors()

      tokenizer.addExtractors(extractors)
      expect(tokenizer.extractors).toHaveLength(extractors.length)
    })

    test('should remove specific extractor', () => {
      const extractors = createSpecialExtractors()
      const tokenizer = new Tokenizer([...extractors]) // Create new array to avoid shared reference
      const initialLength = tokenizer.extractors.length
      const extractorToRemove = tokenizer.extractors[0] // Get reference from tokenizer

      const removed = tokenizer.removeExtractor(extractorToRemove)
      expect(removed).toBe(true)
      expect(tokenizer.extractors).toHaveLength(initialLength - 1)
      expect(tokenizer.extractors).not.toContain(extractorToRemove)

      // Removing non-existent extractor should return false
      const notRemoved = tokenizer.removeExtractor(extractorToRemove)
      expect(notRemoved).toBe(false)
    })

    test('should remove extractors by predicate', () => {
      const extractors = createSpecialExtractors()
      const tokenizer = new Tokenizer(extractors)

      // Remove extractors that have strings containing 'id'
      const removedCount = tokenizer.removeExtractors(
        (extractor) => extractor.strings?.some((str) => str.toLowerCase().includes('id')) || false,
      )

      expect(removedCount).toBeGreaterThan(0)
      expect(tokenizer.extractors.length).toBeLessThan(extractors.length)
    })

    test('should clear all extractors', () => {
      const extractors = createSpecialExtractors()
      const tokenizer = new Tokenizer(extractors)

      expect(tokenizer.extractors.length).toBeGreaterThan(0)
      tokenizer.clearExtractors()
      expect(tokenizer.extractors).toHaveLength(0)
    })

    test('should get copy of extractors', () => {
      const extractors = createSpecialExtractors()
      const tokenizer = new Tokenizer(extractors)

      const copy = tokenizer.getExtractorsCopy()
      expect(copy).toEqual(tokenizer.extractors)
      expect(copy).not.toBe(tokenizer.extractors) // Should be different reference

      // Modifying copy should not affect original
      copy.pop()
      expect(copy.length).toBeLessThan(tokenizer.extractors.length)
    })

    test('should set new extractors', () => {
      const initialExtractors = createSpecialExtractors()
      const newExtractors = initialExtractors.slice(0, 2)
      const tokenizer = new Tokenizer(initialExtractors)

      tokenizer.setExtractors(newExtractors)
      expect(tokenizer.extractors).toHaveLength(2)
      expect(tokenizer.extractors).not.toBe(newExtractors) // Should be copy
    })
  })

  describe('Pattern Modification', () => {
    test('should modify extractor patterns', () => {
      // Create a simple custom extractor that we can modify
      const customExtractor = new BaseTokenExtractor(
        'TEST\\s+(?<number>\\d+)',
        CitationToken,
        { testData: true },
        0,
        ['TEST'],
      )

      const tokenizer = new Tokenizer([customExtractor])

      // Test original pattern
      let tokens = Array.from(tokenizer.extractTokens('TEST 123'))
      expect(tokens).toHaveLength(1)

      // Modify pattern to accept different keyword
      tokenizer.modifyExtractorPatterns(
        (regex) => regex.replace('TEST', 'MODIFIED'),
        (extractor) => extractor.strings?.includes('TEST') || false,
      )

      // Update the strings too for completeness
      customExtractor.strings = ['MODIFIED']

      // Should now match modified pattern
      tokens = Array.from(tokenizer.extractTokens('MODIFIED 123'))
      expect(tokens).toHaveLength(1)

      // Should not match original
      tokens = Array.from(tokenizer.extractTokens('TEST 123'))
      expect(tokens).toHaveLength(0)
    })

    test('should find extractors by pattern', () => {
      const extractors = createSpecialExtractors()
      const tokenizer = new Tokenizer(extractors)

      // Find extractors with 'id' in their regex
      const idExtractors = tokenizer.findExtractorsByPattern(/id/i)
      expect(idExtractors.length).toBeGreaterThan(0)

      // Each found extractor should have 'id' in its regex
      idExtractors.forEach((extractor) => {
        expect(extractor.regex.toLowerCase()).toMatch(/id/)
      })
    })

    test('should find extractors by string', () => {
      const extractors = createSpecialExtractors()
      const tokenizer = new Tokenizer(extractors)

      // Find extractors that match 'supra' strings
      const sutraExtractors = tokenizer.findExtractorsByString('supra')
      expect(sutraExtractors.length).toBeGreaterThan(0)

      // Each found extractor should have 'supra' in one of its strings
      sutraExtractors.forEach((extractor) => {
        expect(extractor.strings?.some((str) => str.includes('supra'))).toBe(true)
      })
    })
  })

  describe('CustomTokenizer', () => {
    test('should create simple citation patterns', () => {
      const tokenizer = new CustomTokenizer()

      // Add a custom reporter
      const extractor = tokenizer.addSimpleCitationPattern('CUSTOM', 'neutral', 'Custom Reporter')

      expect(tokenizer.extractors).toHaveLength(1)
      expect(extractor.strings).toContain('CUSTOM')

      // Test the custom pattern
      const citations = getCitations('123 CUSTOM 456', false, tokenizer)
      expect(citations).toHaveLength(1)
      expect(citations[0]).toBeInstanceOf(FullCaseCitation)
      expect(citations[0].groups.volume).toBe('123')
      expect(citations[0].groups.reporter).toBe('CUSTOM')
      expect(citations[0].groups.page).toBe('456')
    })

    test('should create year-page format patterns', () => {
      const tokenizer = new CustomTokenizer()

      tokenizer.addSimpleCitationPattern('T.C. Memo.', 'tax', 'Tax Court Memorandum', {
        yearPageFormat: true,
      })

      const citations = getCitations('T.C. Memo. 2019-233', false, tokenizer)
      expect(citations).toHaveLength(1)
      expect(citations[0].groups.volume).toBe('2019')
      expect(citations[0].groups.page).toBe('233')
    })

    test('should create hyphen format patterns', () => {
      const tokenizer = new CustomTokenizer()

      tokenizer.addSimpleCitationPattern('HYPHEN', 'neutral', 'Hyphen Reporter', {
        hyphenFormat: true,
      })

      const citations = getCitations('1-HYPHEN-123', false, tokenizer)
      expect(citations).toHaveLength(1)
      expect(citations[0].groups.volume).toBe('1')
      expect(citations[0].groups.reporter).toBe('HYPHEN')
      expect(citations[0].groups.page).toBe('123')
    })

    test('should add custom extractors', () => {
      const tokenizer = new CustomTokenizer()

      const extractor = tokenizer.addCustomExtractor(
        '(?<test>TEST\\s+\\d+)',
        CitationToken,
        { customData: 'test' },
        { strings: ['TEST'] },
      )

      expect(tokenizer.extractors).toHaveLength(1)
      expect(extractor.extra.customData).toBe('test')
      expect(extractor.strings).toContain('TEST')
    })

    test('should modify reporter punctuation', () => {
      const tokenizer = new CustomTokenizer()

      // Create a simple test extractor using the proper pattern
      const testExtractor = new BaseTokenExtractor(
        '(?<volume>\\d+)\\s+TEST\\.PATTERN\\s+(?<page>\\d+)',
        CitationToken,
        { testData: true },
        0,
        ['TEST.PATTERN'],
      )

      tokenizer.addExtractor(testExtractor)

      // Should find standard citation
      let tokens = Array.from(tokenizer.extractTokens('123 TEST.PATTERN 456'))
      expect(tokens).toHaveLength(1)

      // Test a more targeted replacement - replace only specific pattern
      tokenizer.modifyExtractorPatterns(
        (regex) => regex.replace('TEST\\.PATTERN', 'TEST[.,]PATTERN'),
        (extractor) => extractor.strings?.includes('TEST.PATTERN') || false,
      )

      // Should now find comma version
      tokens = Array.from(tokenizer.extractTokens('123 TEST,PATTERN 456'))
      expect(tokens).toHaveLength(1)
    })

    test('should add multiple reporters at once', () => {
      const tokenizer = new CustomTokenizer()

      const extractors = tokenizer.addMultipleReporters([
        { pattern: 'REPORTER1', name: 'Reporter One' },
        { pattern: 'REPORTER2', name: 'Reporter Two', citeType: 'neutral' },
        { pattern: 'HYPHEN-RPT', name: 'Hyphen Reporter', options: { hyphenFormat: true } },
      ])

      expect(extractors).toHaveLength(3)
      expect(tokenizer.extractors).toHaveLength(3)

      // Test each pattern works
      const citations1 = getCitations('1 REPORTER1 2', false, tokenizer)
      expect(citations1).toHaveLength(1)

      const citations2 = getCitations('3 REPORTER2 4', false, tokenizer)
      expect(citations2).toHaveLength(1)

      const citations3 = getCitations('5-HYPHEN-RPT-6', false, tokenizer)
      expect(citations3).toHaveLength(1)
    })

    test('should clone tokenizer', () => {
      const tokenizer = new CustomTokenizer()
      tokenizer.addSimpleCitationPattern('TEST', 'neutral', 'Test Reporter')

      const cloned = tokenizer.clone()

      expect(cloned).toBeInstanceOf(CustomTokenizer)
      expect(cloned.extractors).toHaveLength(tokenizer.extractors.length)
      expect(cloned.extractors).not.toBe(tokenizer.extractors)

      // Modifications to clone should not affect original
      cloned.clearExtractors()
      expect(cloned.extractors).toHaveLength(0)
      expect(tokenizer.extractors.length).toBeGreaterThan(0)
    })

    test('should create filtered tokenizer', () => {
      const tokenizer = new CustomTokenizer()
      tokenizer.addMultipleReporters([
        { pattern: 'KEEP', name: 'Keep This' },
        { pattern: 'REMOVE', name: 'Remove This' },
      ])

      const filtered = tokenizer.createFilteredTokenizer(
        (extractor) => extractor.strings?.includes('KEEP') || false,
      )

      expect(filtered).toBeInstanceOf(CustomTokenizer)
      expect(filtered.extractors).toHaveLength(1)
      expect(filtered.extractors[0].strings).toContain('KEEP')
    })

    test('should provide extractor statistics', () => {
      const tokenizer = new CustomTokenizer()
      tokenizer.addMultipleReporters([{ pattern: 'REPORTER1' }, { pattern: 'REPORTER2' }])

      // Add an extractor without strings
      tokenizer.addCustomExtractor('test', CitationToken, {}, { strings: [] })

      const stats = tokenizer.getExtractorStats()

      expect(stats.total).toBe(3)
      expect(stats.withStrings).toBe(2)
      expect(stats.withoutStrings).toBe(1)
      expect(stats.byTokenType).toHaveProperty('CitationToken')

      // Check that we have the correct token types
      expect(stats.byTokenType.CitationToken).toBeGreaterThanOrEqual(1)
    })
  })

  describe('RegexPatternBuilder', () => {
    test('should create patterns with alternative punctuation', () => {
      const base = 'U.S. 123'
      const pattern = RegexPatternBuilder.withAlternativePunctuation(base, {
        '.': '[.,]',
      })

      expect(pattern).toBe('U[.,]S[.,] 123')
    })

    test('should create flexible reporter patterns', () => {
      const pattern = RegexPatternBuilder.flexibleReporter(['U', 'S'], '[.,\\s]')
      expect(pattern).toBe('U[.,\\s]+S')
    })

    test('should create optional patterns', () => {
      const greedy = RegexPatternBuilder.optional('test')
      const nonGreedy = RegexPatternBuilder.optional('test', false)

      expect(greedy).toBe('(?:test)?')
      expect(nonGreedy).toBe('(?:test)??')
    })

    test('should create year patterns', () => {
      const fullYear = RegexPatternBuilder.yearPattern()
      const partialYear = RegexPatternBuilder.yearPattern(true)

      expect(fullYear).toBe('\\d{4}')
      expect(partialYear).toBe('\\d{2,4}')
    })

    test('should create volume patterns', () => {
      const pattern = RegexPatternBuilder.volumePattern()
      expect(pattern).toBe('\\d+')
    })

    test('should create page patterns', () => {
      const basic = RegexPatternBuilder.pagePattern(false, false)
      const withRanges = RegexPatternBuilder.pagePattern(true, false)
      const withRoman = RegexPatternBuilder.pagePattern(false, true)
      const withBoth = RegexPatternBuilder.pagePattern(true, true)

      expect(basic).toBe('\\d+')
      expect(withRanges).toBe('\\d+(?:-\\d+)?')
      expect(withRoman).toBe('(?:\\d+|[ivxlcdm]+)')
      expect(withBoth).toBe('(?:\\d+|[ivxlcdm]+)(?:-(?:\\d+|[ivxlcdm]+))?')
    })
  })

  describe('AhocorasickTokenizer Dynamic Updates', () => {
    test('should rebuild string maps when extractors are added', () => {
      const tokenizer = new AhocorasickTokenizer()
      const initialExtractorsCount = tokenizer.getExtractors('test').length

      // Add a new extractor
      const reporter = new Reporter('neutral', 'Test', 'TEST', 'TEST')
      const edition: Edition = { reporter, reporterFound: 'TEST', start: null, end: null }
      const extractor = createCitationExtractor(
        '(?<volume>\\d+)\\s+(?<reporter>TEST)\\s+(?<page>\\d+)',
        [edition],
        [],
        ['TEST'],
        false,
      )

      tokenizer.addExtractor(extractor)

      // Should now include the new extractor when relevant strings are present
      const extractorsForTest = tokenizer.getExtractors('1 TEST 2')
      expect(extractorsForTest.length).toBeGreaterThan(initialExtractorsCount)

      // Should include our new extractor
      expect(extractorsForTest).toContain(extractor)
    })

    test('should rebuild string maps when extractors are removed', () => {
      const tokenizer = new AhocorasickTokenizer()

      // Add a test extractor
      const reporter = new Reporter('neutral', 'Test', 'TEST', 'TEST')
      const edition: Edition = { reporter, reporterFound: 'TEST', start: null, end: null }
      const extractor = createCitationExtractor(
        '(?<volume>\\d+)\\s+(?<reporter>TEST)\\s+(?<page>\\d+)',
        [edition],
        [],
        ['TEST'],
        false,
      )

      tokenizer.addExtractor(extractor)

      // Verify it's included
      let extractorsForTest = tokenizer.getExtractors('1 TEST 2')
      expect(extractorsForTest).toContain(extractor)

      // Remove it
      const removed = tokenizer.removeExtractor(extractor)
      expect(removed).toBe(true)

      // Should no longer be included
      extractorsForTest = tokenizer.getExtractors('1 TEST 2')
      expect(extractorsForTest).not.toContain(extractor)
    })

    test('should handle pattern modifications', () => {
      const tokenizer = new AhocorasickTokenizer()

      // Add a simple test extractor
      const testExtractor = new BaseTokenExtractor(
        'TEST\\s+(?<number>\\d+)',
        CitationToken,
        { testData: true },
        0,
        ['TEST'],
      )

      tokenizer.addExtractor(testExtractor)

      // Should find standard format
      const extractorsForTest = tokenizer.getExtractors('TEST 123')
      expect(extractorsForTest).toContain(testExtractor)

      // Should not find modified format initially
      let extractorsForModified = tokenizer.getExtractors('MODIFIED 123')
      expect(extractorsForModified).not.toContain(testExtractor)

      // Modify pattern
      tokenizer.modifyExtractorPatterns(
        (regex) => regex.replace('TEST', 'MODIFIED'),
        (ext) => ext.strings?.includes('TEST') || false,
      )

      // Update strings for the extractor to match new pattern
      testExtractor.strings = ['MODIFIED']

      // Manually rebuild maps since we changed strings
      tokenizer.addExtractor(new BaseTokenExtractor('dummy', CitationToken, {}, 0, []))
      tokenizer.removeExtractors((ext) => ext.regex === 'dummy')

      // Should now find modified format
      extractorsForModified = tokenizer.getExtractors('MODIFIED 123')
      expect(extractorsForModified).toContain(testExtractor)
    })
  })

  describe('Integration with getCitations', () => {
    test('should work with custom tokenizers in getCitations', () => {
      const tokenizer = new CustomTokenizer()

      // Add multiple custom patterns
      tokenizer.addMultipleReporters([
        { pattern: 'CUSTOM1', name: 'Custom Reporter 1' },
        { pattern: 'CUSTOM2', name: 'Custom Reporter 2' },
      ])

      const text = 'See 123 CUSTOM1 456 and also 789 CUSTOM2 101.'
      const citations = getCitations(text, false, tokenizer)

      expect(citations).toHaveLength(2)
      expect(citations[0].groups.reporter).toBe('CUSTOM1')
      expect(citations[1].groups.reporter).toBe('CUSTOM2')
    })

    test('should work with modified patterns', () => {
      const tokenizer = new CustomTokenizer()

      // Use the standard method to add a reporter pattern
      const extractor = tokenizer.addSimpleCitationPattern(
        'TEST.PATTERN',
        'neutral',
        'Test Pattern Reporter',
      )

      // Verify initial pattern works
      let citations = getCitations('123 TEST.PATTERN 456', false, tokenizer)
      expect(citations).toHaveLength(1)
      expect(citations[0].groups.reporter).toBe('TEST.PATTERN')

      // Modify to accept commas manually for this test
      tokenizer.modifyExtractorPatterns(
        (regex) => regex.replace('TEST\\.PATTERN', 'TEST[.,]PATTERN'),
        (ext) => ext.strings?.includes('TEST.PATTERN') || false,
      )

      // Update strings to include comma version for proper filtering
      if (extractor.strings?.includes('TEST.PATTERN')) {
        extractor.strings.push('TEST,PATTERN')
      }

      const text = 'See 123 TEST,PATTERN 456 for reference.'
      citations = getCitations(text, false, tokenizer)

      expect(citations).toHaveLength(1)
      expect(citations[0].groups.reporter).toBe('TEST,PATTERN')
    })
  })
})
