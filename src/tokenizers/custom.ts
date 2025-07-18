import type { TokenExtractor, Token } from './base'
import { Tokenizer, BaseTokenExtractor } from './base'
import { createCitationExtractor } from './extractors'
import { PAGE_NUMBER_REGEX } from '../regexes'
import type { Edition } from '../models'
import { Reporter } from '../models'

/**
 * CustomTokenizer extends the base Tokenizer with enhanced extensibility features
 * for dynamically creating and modifying citation extractors.
 */
export class CustomTokenizer extends Tokenizer {
  constructor(extractors: TokenExtractor[] = []) {
    super(extractors)
  }

  /**
   * Create a simple citation extractor for a reporter
   * @param reporterPattern The reporter pattern (e.g., "U.S." or "F.2d")
   * @param citeType The citation type
   * @param reporterName Human-readable name of the reporter
   * @param options Additional options for the extractor
   */
  addSimpleCitationPattern(
    reporterPattern: string,
    citeType: string = 'neutral',
    reporterName: string = reporterPattern,
    options: {
      yearPageFormat?: boolean
      hyphenFormat?: boolean
      caseSensitive?: boolean
      editionStr?: string
    } = {}
  ): TokenExtractor {
    const {
      yearPageFormat = false,
      hyphenFormat = false,
      caseSensitive = false,
      editionStr = reporterPattern
    } = options

    // Escape the reporter pattern for regex
    const escapedReporter = reporterPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    let regex: string
    
    if (yearPageFormat) {
      // Year-page format like "T.C. Memo. 2019-233"
      regex = `(?<reporter>${escapedReporter})\\s+(?<volume>\\d{4})-(?<page>\\d+)`
    } else if (hyphenFormat) {
      // Hyphen format like "1-NMCERT-123"
      regex = `(?<volume>\\d+)-(?<reporter>${escapedReporter})-(?<page>${PAGE_NUMBER_REGEX})`
    } else {
      // Standard volume-reporter-page format
      regex = `(?<volume>\\d+)\\s+(?<reporter>${escapedReporter})\\s+(?<page>${PAGE_NUMBER_REGEX})`
    }

    // Create a reporter instance
    const reporter = new Reporter(
      citeType,
      reporterName,
      editionStr,
      editionStr,
      undefined,
      undefined,
      false,
      []
    )

    const edition: Edition = {
      reporter,
      reporterFound: editionStr,
      start: null,
      end: null
    }

    // Create the extractor
    const extractor = createCitationExtractor(
      regex,
      [edition],
      [],
      [reporterPattern],
      false,
      caseSensitive ? 0 : 2 // 2 = case insensitive flag
    )

    this.addExtractor(extractor)
    return extractor
  }

  /**
   * Create a custom extractor with a specific regex pattern and token constructor
   * @param regex The regex pattern
   * @param tokenConstructor Constructor function for the token
   * @param extra Extra data to pass to the token constructor
   * @param options Additional options
   */
  addCustomExtractor(
    regex: string,
    tokenConstructor: typeof Token,
    extra: Record<string, any> = {},
    options: {
      flags?: number
      strings?: string[]
    } = {}
  ): TokenExtractor {
    const { flags = 0, strings = [] } = options

    const extractor = new BaseTokenExtractor(
      regex,
      tokenConstructor,
      extra,
      flags,
      strings
    )

    this.addExtractor(extractor)
    return extractor
  }

  /**
   * Modify all reporter patterns to accept alternative punctuation
   * @param originalChar Character to replace (e.g., '.')
   * @param replacement Replacement pattern (e.g., '[.,]')
   */
  modifyReporterPunctuation(originalChar: string, replacement: string): void {
    // Find the escaped version of the character in the regex
    const escapedChar = originalChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    this.modifyExtractorPatterns(
      (regex) => {
        // Replace the escaped version with the replacement
        return regex.replace(new RegExp(escapedChar.replace(/\\/g, '\\\\'), 'g'), replacement)
      },
      (extractor) => extractor.strings?.some(str => str.includes(originalChar)) || false
    )
  }

  /**
   * Create a batch of extractors for multiple reporter variations
   * @param reporters Array of reporter configurations
   */
  addMultipleReporters(
    reporters: Array<{
      pattern: string
      name?: string
      citeType?: string
      options?: Parameters<CustomTokenizer['addSimpleCitationPattern']>[3]
    }>
  ): TokenExtractor[] {
    return reporters.map(({ pattern, name, citeType, options }) =>
      this.addSimpleCitationPattern(pattern, citeType, name, options)
    )
  }

  /**
   * Clone this tokenizer with all its extractors
   */
  clone(): CustomTokenizer {
    const clonedExtractors = this.extractors.map(extractor => ({
      ...extractor,
      // Ensure compiled regex is not shared
      compiledRegex: undefined
    } as TokenExtractor))
    
    return new CustomTokenizer(clonedExtractors)
  }

  /**
   * Create a filtered version of this tokenizer that only includes extractors
   * matching certain criteria
   * @param predicate Function that returns true for extractors to include
   */
  createFilteredTokenizer(predicate: (extractor: TokenExtractor) => boolean): CustomTokenizer {
    const filteredExtractors = this.extractors.filter(predicate)
    return new CustomTokenizer(filteredExtractors)
  }

  /**
   * Get statistics about the extractors in this tokenizer
   */
  getExtractorStats(): {
    total: number
    withStrings: number
    withoutStrings: number
    byTokenType: Record<string, number>
  } {
    const stats = {
      total: this.extractors.length,
      withStrings: 0,
      withoutStrings: 0,
      byTokenType: {} as Record<string, number>
    }

    for (const extractor of this.extractors) {
      if (extractor.strings && extractor.strings.length > 0) {
        stats.withStrings++
      } else {
        stats.withoutStrings++
      }

      const tokenTypeName = extractor.tokenConstructor.name
      stats.byTokenType[tokenTypeName] = (stats.byTokenType[tokenTypeName] || 0) + 1
    }

    return stats
  }
}

/**
 * Utility functions for creating custom regex patterns
 */
export class RegexPatternBuilder {
  /**
   * Create a pattern that matches alternative punctuation
   * @param base Base pattern
   * @param charMap Map of characters to their alternatives
   */
  static withAlternativePunctuation(
    base: string,
    charMap: Record<string, string>
  ): string {
    let result = base
    for (const [original, replacement] of Object.entries(charMap)) {
      const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(escaped, 'g'), replacement)
    }
    return result
  }

  /**
   * Create a flexible reporter pattern that accepts various separators
   * @param reporterParts Array of reporter parts (e.g., ['U', 'S'])
   * @param separators Allowed separators (e.g., '[.,]')
   */
  static flexibleReporter(reporterParts: string[], separators: string = '[.,\\s]'): string {
    return reporterParts.join(`${separators}+`)
  }

  /**
   * Create a pattern for optional elements
   * @param pattern Pattern to make optional
   * @param greedy Whether to use greedy matching
   */
  static optional(pattern: string, greedy: boolean = true): string {
    const quantifier = greedy ? '?' : '??'
    return `(?:${pattern})${quantifier}`
  }

  /**
   * Create a pattern for year ranges
   * @param allowPartialYears Whether to allow 2-digit years
   */
  static yearPattern(allowPartialYears: boolean = false): string {
    if (allowPartialYears) {
      return '\\d{2,4}'
    }
    return '\\d{4}'
  }

  /**
   * Create a volume pattern with optional leading zeros
   */
  static volumePattern(): string {
    return '\\d+'
  }

  /**
   * Create a page pattern with various formats
   * @param allowRanges Whether to allow page ranges
   * @param allowRoman Whether to allow Roman numerals
   */
  static pagePattern(allowRanges: boolean = true, allowRoman: boolean = true): string {
    let pattern = '\\d+'
    
    if (allowRoman) {
      pattern = `(?:${pattern}|[ivxlcdm]+)`
    }
    
    if (allowRanges) {
      pattern = `${pattern}(?:-${pattern})?`
    }
    
    return pattern
  }
}