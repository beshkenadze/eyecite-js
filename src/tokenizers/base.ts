import type { Token, Tokens } from '../models'
export type { Token } from '../models'

export interface TokenExtractor {
  regex: string
  tokenConstructor: typeof Token
  extra: Record<string, any>
  flags?: number
  strings?: string[]
  compiledRegex?: RegExp

  getMatches(text: string): RegExpExecArray[]
  getToken(match: RegExpExecArray, offset?: number): Token
}

export class BaseTokenExtractor implements TokenExtractor {
  regex: string
  tokenConstructor: typeof Token
  extra: Record<string, any>
  flags: number
  strings: string[]
  private _compiledRegex?: RegExp

  constructor(
    regex: string,
    tokenConstructor: typeof Token,
    extra: Record<string, any> = {},
    flags = 0,
    strings: string[] = [],
  ) {
    this.regex = regex
    this.tokenConstructor = tokenConstructor
    this.extra = extra
    this.flags = flags
    this.strings = strings
  }

  get compiledRegex(): RegExp {
    if (!this._compiledRegex) {
      // Convert flags from Python re module to JS
      let jsFlags = 'g' // always global for finditer behavior
      if (this.flags & 2) {
        // re.I = 2
        jsFlags += 'i'
      }
      if (this.flags & 8) {
        // re.M = 8
        jsFlags += 'm'
      }
      if (this.flags & 16) {
        // re.S = 16
        jsFlags += 's'
      }
      this._compiledRegex = new RegExp(this.regex, jsFlags)
    }
    return this._compiledRegex
  }

  getMatches(text: string): RegExpExecArray[] {
    const matches: RegExpExecArray[] = []
    const regex = this.compiledRegex
    regex.lastIndex = 0 // Reset regex state
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      matches.push(match)
      // Prevent infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++
      }
    }

    return matches
  }

  getToken(match: RegExpExecArray, offset = 0): Token {
    // @ts-ignore - We know tokenConstructor is a Token subclass
    return this.tokenConstructor.fromMatch(match, this.extra, offset)
  }
}

export abstract class Tokenizer {
  extractors: TokenExtractor[]

  constructor(extractors: TokenExtractor[] = []) {
    this.extractors = extractors
  }

  /**
   * Add a new extractor to the tokenizer
   * @param extractor The extractor to add
   */
  addExtractor(extractor: TokenExtractor): void {
    this.extractors.push(extractor)
  }

  /**
   * Add multiple extractors to the tokenizer
   * @param extractors Array of extractors to add
   */
  addExtractors(extractors: TokenExtractor[]): void {
    this.extractors.push(...extractors)
  }

  /**
   * Remove an extractor from the tokenizer
   * @param extractor The extractor to remove
   * @returns true if the extractor was removed, false if not found
   */
  removeExtractor(extractor: TokenExtractor): boolean {
    const index = this.extractors.indexOf(extractor)
    if (index !== -1) {
      this.extractors.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Remove extractors based on a filter function
   * @param predicate Function that returns true for extractors to remove
   * @returns number of extractors removed
   */
  removeExtractors(predicate: (extractor: TokenExtractor) => boolean): number {
    const initialLength = this.extractors.length
    this.extractors = this.extractors.filter((extractor) => !predicate(extractor))
    return initialLength - this.extractors.length
  }

  /**
   * Clear all extractors
   */
  clearExtractors(): void {
    this.extractors = []
  }

  /**
   * Get a copy of all extractors
   */
  getExtractorsCopy(): TokenExtractor[] {
    return [...this.extractors]
  }

  /**
   * Replace all extractors with new ones
   * @param extractors New extractors to use
   */
  setExtractors(extractors: TokenExtractor[]): void {
    this.extractors = [...extractors]
  }

  /**
   * Modify regex patterns in existing extractors
   * @param modifier Function that takes the current regex and returns a new one
   * @param filter Optional filter to only modify specific extractors
   */
  modifyExtractorPatterns(
    modifier: (regex: string, extractor: TokenExtractor) => string,
    filter?: (extractor: TokenExtractor) => boolean,
  ): void {
    for (const extractor of this.extractors) {
      if (!filter || filter(extractor)) {
        const newRegex = modifier(extractor.regex, extractor)
        if (newRegex !== extractor.regex) {
          extractor.regex = newRegex
          // Clear compiled regex so it gets recompiled with new pattern
          if ('_compiledRegex' in extractor) {
            ;(extractor as any)._compiledRegex = undefined
          }
          // Force recompilation by accessing the getter to clear internal state
          if (extractor instanceof BaseTokenExtractor) {
            ;(extractor as any)._compiledRegex = undefined
          }
        }
      }
    }
  }

  /**
   * Find extractors by regex pattern
   * @param pattern Regular expression or string to match against extractor regex
   * @returns Array of matching extractors
   */
  findExtractorsByPattern(pattern: string | RegExp): TokenExtractor[] {
    const searchRegex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    return this.extractors.filter((extractor) => searchRegex.test(extractor.regex))
  }

  /**
   * Find extractors by strings they match
   * @param searchString String to look for in extractor strings
   * @returns Array of matching extractors
   */
  findExtractorsByString(searchString: string): TokenExtractor[] {
    return this.extractors.filter((extractor) =>
      extractor.strings?.some((str) => str.includes(searchString)),
    )
  }

  tokenize(text: string): [Tokens, Array<[number, Token]>] {
    // Sort all matches by start offset ascending, then end offset descending
    const citationTokens: Array<[number, Token]> = []
    const allTokens: Tokens = []

    const tokens = Array.from(this.extractTokens(text))
      .filter((t) => t.data !== null && t.data !== undefined)
      .sort((a, b) => {
        if (a.start !== b.start) {
          return a.start - b.start
        }
        return b.end - a.end
      })

    let lastToken: Token | null = null
    let offset = 0

    for (const token of tokens) {
      if (lastToken) {
        // Try to merge identical tokens
        const merged = lastToken.merge(token)
        if (merged) {
          continue
        }
      }

      if (offset > token.start) {
        // Skip overlaps
        continue
      }

      if (offset < token.start) {
        // Capture plain text before each match
        const beforeText = text.slice(offset, token.start)
        if (beforeText) {
          Tokenizer.appendText(allTokens, beforeText)
        }
      }

      // Capture match
      citationTokens.push([allTokens.length, token])
      allTokens.push(token)
      offset = token.end
      lastToken = token
    }

    // Capture plain text after final match
    if (offset < text.length) {
      Tokenizer.appendText(allTokens, text.slice(offset))
    }

    return [allTokens, citationTokens]
  }

  getExtractors(_text: string): TokenExtractor[] {
    // Subclasses can override this to filter extractors based on text
    return this.extractors
  }

  *extractTokens(text: string): Generator<Token> {
    for (const extractor of this.getExtractors(text)) {
      for (const match of extractor.getMatches(text)) {
        yield extractor.getToken(match)
      }
    }
  }

  static appendText(tokens: Tokens, text: string): void {
    // Split text into words, treating whitespace as a word
    if (text === '') return

    const parts = text.split(' ')
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part) {
        tokens.push(part)
      }
      // Add space after each part except the last
      if (i < parts.length - 1) {
        tokens.push(' ')
      }
    }
  }
}
