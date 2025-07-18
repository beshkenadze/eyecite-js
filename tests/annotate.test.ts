import { describe, expect, test } from 'bun:test'
import { annotateCitations } from '../src/annotate'
import { getCitations } from '../src/find'
import { cleanText } from '../src/clean'

describe('Annotate Citations', () => {
  describe('Basic Annotation', () => {
    test('should annotate simple citation', () => {
      const text = 'See Lissner v. Test, 1 U.S. 1 (1982).'
      const annotated = annotateCitations(text)
      expect(annotated).toContain('<span class="citation"')
      expect(annotated).toContain('1 U.S. 1')
    })

    test('should annotate multiple citations', () => {
      const text = 'See 1 U.S. 1 and 2 F.3d 2.'
      const annotated = annotateCitations(text)
      const matches = annotated.match(/<span class="citation"/g)
      expect(matches).toHaveLength(2)
    })

    test('should preserve original text outside citations', () => {
      const text = 'Before 1 U.S. 1 and after.'
      const annotated = annotateCitations(text)
      expect(annotated).toContain('Before ')
      expect(annotated).toContain(' and after.')
    })
  })

  describe('HTML Handling', () => {
    test('should handle existing HTML tags', () => {
      const text = '<p>See <em>Lissner v. Test</em>, 1 U.S. 1 (1982).</p>'
      const annotated = annotateCitations(text)
      expect(annotated).toContain('<em>Lissner v. Test</em>')
      expect(annotated).toContain('<span class="citation"')
    })

    test('should handle unbalanced tags', () => {
      const text = '<p>See 1 U.S. 1</p> and more'
      const annotated = annotateCitations(text, { unbalancedTags: ['p'] })
      expect(annotated).toContain('<span class="citation"')
    })

    test('should not annotate inside script tags', () => {
      const text = '<script>var x = "1 U.S. 1";</script> But 1 U.S. 1 here.'
      const annotated = annotateCitations(text)
      const inScript = annotated.match(/<script>.*<span class="citation".*<\/script>/)
      expect(inScript).toBeNull()
    })
  })

  describe('Custom Annotation', () => {
    test('should support custom annotation function', () => {
      const text = 'See 1 U.S. 1.'
      const annotated = annotateCitations(text, {
        annotateFunc: (_citation, text) => `[CITE: ${text}]`
      })
      expect(annotated).toBe('See [CITE: 1 U.S. 1].')
    })

    test('should pass citation metadata to annotation function', () => {
      const text = 'Lissner v. Test, 1 U.S. 1 (1982)'
      let capturedCitation: any
      annotateCitations(text, {
        annotateFunc: (citation) => {
          capturedCitation = citation
          return ''
        }
      })
      expect(capturedCitation.metadata.plaintiff).toBe('Lissner')
      expect(capturedCitation.year).toBe(1982)
    })
  })

  describe('Clean Text Integration', () => {
    test('should annotate after cleaning text', () => {
      const text = 'See  1   U.S.   1  (double spaces)'
      const cleanedText = cleanText(text, ['all_whitespace'])
      const annotated = annotateCitations(cleanedText)
      expect(annotated).toContain('<span class="citation"')
      expect(annotated).toContain('1 U.S. 1')
    })

    test('should maintain correct spans after cleaning', () => {
      const text = 'See\n\n1 U.S. 1'
      const cleanedText = cleanText(text, ['all_whitespace'])
      const citations = getCitations(cleanedText)
      const annotated = annotateCitations(cleanedText, { citations })
      expect(annotated).toContain('See <span class="citation">1 U.S. 1</span>')
    })
  })
})

