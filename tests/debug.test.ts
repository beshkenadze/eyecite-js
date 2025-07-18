import { test } from 'bun:test'
import { ID_REGEX, SUPRA_REGEX } from '../src/regexes'
import { defaultTokenizer } from '../src/tokenizers'

test('debug supra regex', () => {
  console.log('SUPRA_REGEX:', SUPRA_REGEX)
  const text = 'Bush, supra, at 100'
  
  // Check what extractors are being used
  const extractors = defaultTokenizer.getExtractors(text)
  console.log('Extractors count:', extractors.length)
  console.log('Extractors:', extractors.map(e => e.regex.slice(0, 50)))
  
  // Test supra regex directly  
  const regex = new RegExp(SUPRA_REGEX, 'gi')
  const matches = Array.from(text.matchAll(regex))
  console.log('Direct regex matches:', matches.map(m => ({ 
    fullMatch: m[0], 
    capture: m[1], 
    index: m.index 
  })))
  
  const [tokens, citationTokens] = defaultTokenizer.tokenize(text)
  console.log('All tokens:', tokens)
  console.log('Citation tokens:', citationTokens)
})

test('debug id regex', () => {
  console.log('ID_REGEX:', ID_REGEX)
  const text = 'Before id. after'
  
  const [tokens, citationTokens] = defaultTokenizer.tokenize(text)
  console.log('All tokens:', tokens)
  console.log('Token types:', tokens.map(t => typeof t === 'string' ? `"${t}"` : t.constructor.name))
})