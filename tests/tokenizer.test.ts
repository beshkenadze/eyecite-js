import { describe, expect, test } from 'bun:test'
import { IdToken, SectionToken, StopWordToken, SupraToken, Token } from '../src/models'
import { BaseTokenExtractor, defaultTokenizer } from '../src/tokenizers'

describe('Tokenizer', () => {
  describe('BaseTokenExtractor', () => {
    test('should extract simple matches', () => {
      const extractor = new BaseTokenExtractor('test', Token)
      const matches = extractor.getMatches('this is a test string')
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toBe('test')
      expect(matches[0].index).toBe(10)
    })

    test('should handle case-insensitive matching', () => {
      const extractor = new BaseTokenExtractor('test', Token, {}, 2) // re.I = 2
      const matches = extractor.getMatches('this is a TEST string')
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toBe('TEST')
    })

    test('should create tokens from matches', () => {
      const extractor = new BaseTokenExtractor('(\\w+)', Token)
      const match = extractor.getMatches('hello')[0]
      const token = extractor.getToken(match)
      expect(token).toBeInstanceOf(Token)
      expect(token.data).toBe('hello')
      expect(token.start).toBe(0)
      expect(token.end).toBe(5)
    })
  })

  describe('DefaultTokenizer', () => {
    test('should tokenize text with Id citations', () => {
      const text = 'See id. at 123'
      const [_tokens, citationTokens] = defaultTokenizer.tokenize(text)

      // Should have: "See", " ", "id.", " ", "at", " ", "123"
      expect(_tokens.length).toBeGreaterThanOrEqual(5)

      // Should find the Id token
      const idTokens = citationTokens.filter(([_, token]) => token instanceof IdToken)
      expect(idTokens).toHaveLength(1)
      expect(idTokens[0][1].data).toBe('id.')
    })

    test('should tokenize text with Supra citations', () => {
      const text = 'Bush, supra, at 100'
      const [_tokens, citationTokens] = defaultTokenizer.tokenize(text)

      const supraTokens = citationTokens.filter(([_, token]) => token instanceof SupraToken)
      expect(supraTokens).toHaveLength(1)
      expect(supraTokens[0][1].data).toBe('supra')
    })

    test('should tokenize text with stop words', () => {
      const text = 'Foo v. Bar'
      const [_tokens, citationTokens] = defaultTokenizer.tokenize(text)

      const stopTokens = citationTokens.filter(([_, token]) => token instanceof StopWordToken)
      expect(stopTokens).toHaveLength(1)
      expect(stopTokens[0][1].data).toBe('v')
    })

    test('should tokenize text with section symbols', () => {
      const text = 'See § 123'
      const [_tokens, citationTokens] = defaultTokenizer.tokenize(text)

      const sectionTokens = citationTokens.filter(([_, token]) => token instanceof SectionToken)
      expect(sectionTokens).toHaveLength(1)
      expect(sectionTokens[0][1].data).toBe('§')
    })

    test('should handle overlapping tokens', () => {
      const text = 'id. id.'
      const [_tokens, citationTokens] = defaultTokenizer.tokenize(text)

      const idTokens = citationTokens.filter(([_, token]) => token instanceof IdToken)
      expect(idTokens).toHaveLength(2)
    })

    test('should preserve text between tokens', () => {
      const text = 'Before id. after'
      const [tokens] = defaultTokenizer.tokenize(text)

      // Should preserve all text including spaces
      const reconstructed = tokens.map((t) => (typeof t === 'string' ? t : t.data)).join('')
      expect(reconstructed).toBe(text)
    })
  })
})
