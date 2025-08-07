import { test, expect } from 'bun:test'
import { ID_REGEX, SUPRA_REGEX } from '../src/regexes'
import { defaultTokenizer } from '../src/tokenizers'

test('debug supra regex', () => {
  const text = 'Bush, supra, at 100'

  // Check what extractors are being used
  const extractors = defaultTokenizer.getExtractors(text)

  // Test supra regex directly
  const regex = new RegExp(SUPRA_REGEX, 'gi')
  const matches = Array.from(text.matchAll(regex))

  const [tokens, citationTokens] = defaultTokenizer.tokenize(text)
  
  // Basic assertions to ensure the test still validates functionality
  expect(extractors.length).toBeGreaterThan(0)
  expect(matches.length).toBeGreaterThan(0)
  expect(citationTokens.length).toBeGreaterThan(0)
})

test('debug id regex', () => {
  const text = 'Before id. after'

  const [tokens, citationTokens] = defaultTokenizer.tokenize(text)
  
  // Basic assertions to ensure the test still validates functionality
  expect(tokens.length).toBeGreaterThan(0)
  expect(citationTokens.length).toBeGreaterThan(0)
})
