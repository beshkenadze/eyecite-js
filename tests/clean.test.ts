import { describe, expect, test } from 'bun:test'
import { allWhitespace, cleanText, html, inlineWhitespace, underscores, xml } from '../src/clean'

describe('Text Cleaning Utilities', () => {
  describe('cleanText', () => {
    test('should apply cleaning steps in order', () => {
      const text = '  Hello    World  '
      const result = cleanText(text, ['inline_whitespace'])
      expect(result).toBe(' Hello World ')
    })

    test('should accept custom functions', () => {
      const text = 'hello world'
      const customStep = (t: string) => t.toUpperCase()
      const result = cleanText(text, [customStep])
      expect(result).toBe('HELLO WORLD')
    })

    test('should apply multiple steps', () => {
      const text = '__Hello__    World__'
      const result = cleanText(text, ['underscores', 'inline_whitespace'])
      expect(result).toBe(' Hello World ')
    })

    test('should throw error for invalid steps', () => {
      expect(() => {
        cleanText('test', ['invalid_step'])
      }).toThrow()
    })
  })

  describe('html', () => {
    test('should extract visible text from HTML', () => {
      const htmlContent = `
        <html>
          <head>
            <title>Test</title>
            <style>body { color: red; }</style>
          </head>
          <body>
            <p>Hello World</p>
            <script>console.log('test')</script>
          </body>
        </html>
      `
      const result = html(htmlContent)
      expect(result).toBe('Hello World')
    })

    test('should handle nested elements', () => {
      const htmlContent = '<div>Hello <span>nested <b>world</b></span>!</div>'
      const result = html(htmlContent)
      expect(result).toBe('Hello nested world !')
    })

    test('should skip style and script content', () => {
      const htmlContent = `
        <p>Visible</p>
        <style>.hidden { display: none; }</style>
        <script>var hidden = true;</script>
        <p>Also visible</p>
      `
      const result = html(htmlContent)
      expect(result).toBe('Visible Also visible')
    })
  })

  describe('inlineWhitespace', () => {
    test('should collapse multiple spaces', () => {
      expect(inlineWhitespace('Hello    World')).toBe('Hello World')
    })

    test('should collapse tabs', () => {
      expect(inlineWhitespace('Hello\t\tWorld')).toBe('Hello World')
    })

    test('should handle mixed spaces and tabs', () => {
      expect(inlineWhitespace('Hello  \t  World')).toBe('Hello World')
    })

    test('should preserve newlines', () => {
      expect(inlineWhitespace('Hello\n  World')).toBe('Hello\n World')
    })
  })

  describe('allWhitespace', () => {
    test('should collapse all whitespace including newlines', () => {
      expect(allWhitespace('Hello\n\n  World')).toBe('Hello World')
    })

    test('should handle zero-width spaces', () => {
      expect(allWhitespace('Hello\u200b\u200bWorld')).toBe('Hello World')
    })

    test('should handle mixed whitespace', () => {
      expect(allWhitespace('Hello  \n\t  \u200b World')).toBe('Hello World')
    })
  })

  describe('underscores', () => {
    test('should replace double underscores with spaces', () => {
      expect(underscores('Hello__World')).toBe('Hello World')
    })

    test('should replace multiple underscores with spaces', () => {
      expect(underscores('Hello____World')).toBe('Hello World')
    })

    test('should preserve single underscores', () => {
      expect(underscores('Hello_World')).toBe('Hello_World')
    })

    test('should handle multiple occurrences', () => {
      expect(underscores('__Hello__World__')).toBe(' Hello World ')
    })
  })

  describe('xml', () => {
    test('should remove XML declaration', () => {
      const text = '<?xml version="1.0" encoding="UTF-8"?><doc>content</doc>'
      expect(xml(text)).toBe('<doc>content</doc>')
    })

    test('should handle different XML declarations', () => {
      const text = '<?xml version="1.0"?><root>test</root>'
      expect(xml(text)).toBe('<root>test</root>')
    })

    test('should not affect text without XML declaration', () => {
      const text = '<doc>content</doc>'
      expect(xml(text)).toBe('<doc>content</doc>')
    })

    test('should only remove first XML declaration', () => {
      const text = '<?xml version="1.0"?>test<?xml version="1.0"?>test'
      expect(xml(text)).toBe('test<?xml version="1.0"?>test')
    })
  })
})
