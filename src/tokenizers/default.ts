import { JOURNALS, LAWS, REPORTERS } from '../data'
import type { Edition } from '../models'
import { Reporter } from '../models'
import { PAGE_NUMBER_REGEX, shortCiteRe } from '../regexes'
import { createLawCitationRegex, createReporterCitationRegex } from '../utils/regex-templates'
import type { TokenExtractor } from './base'
import { Tokenizer } from './base'
import {
  createCitationExtractor,
  createJournalCitationExtractor,
  createLawCitationExtractor,
  createSpecialExtractors,
} from './extractors'
import { fixNominativeReporterPattern } from './nominative-fix'

export class DefaultTokenizer extends Tokenizer {
  constructor() {
    // Initialize with special extractors
    const extractors = [
      ...createSpecialExtractors(),
      ...buildCitationExtractors(),
      ...buildLawCitationExtractors(),
      ...buildJournalCitationExtractors(),
    ]
    super(extractors)
  }
}

// Build citation extractors from reporters data
function buildCitationExtractors(): TokenExtractor[] {
  const extractors: TokenExtractor[] = []

  // For each reporter in the database
  for (const [_reporterStr, reporterList] of Object.entries(REPORTERS)) {
    for (const reporterData of reporterList) {
      // Create editions for this reporter
      const allEditions: Edition[] = []

      for (const [editionName, editionData] of Object.entries(reporterData.editions)) {
        const reporter = new Reporter(
          reporterData.cite_type,
          reporterData.name,
          editionName,
          editionName,
          editionData.start || undefined,
          editionData.end || undefined,
          reporterData.cite_type === 'federal' &&
            (reporterData.name.includes('United States Reports') ||
              reporterData.name.includes('Supreme Court')),
          reporterData.mlz_jurisdiction || [],
        )

        allEditions.push({
          reporter,
          reporterFound: editionName,
        } as Edition)
      }

      // Create extractors for each edition (including nested ones like F.2d, F.3d)
      for (const [editionName, editionData] of Object.entries(reporterData.editions)) {
        const escapedEdition = editionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        // Use ALL editions for this reporter to enable proper disambiguation
        // This matches the Python implementation where all editions are included
        // so that ambiguous reporters (with multiple editions) can be detected
        const editionsToUse = allEditions

        // Check if this edition has custom regex patterns
        if ((editionData as any).regexes && Array.isArray((editionData as any).regexes)) {
          // Process each custom regex pattern
          const rawPatterns = (editionData as any).regexes.map((p: string) => 
            fixNominativeReporterPattern(p, editionName)
          )
          const customPatterns = createReporterCitationRegex(editionName, rawPatterns)
          
          for (const pattern of customPatterns) {
            try {
              // Test pattern compilation
              new RegExp(pattern)
              
              // Create full citation extractor
              extractors.push(createCitationExtractor(pattern, editionsToUse, [], [editionName], false))
              
              // Create short citation extractor
              const shortPattern = shortCiteRe(pattern)
              extractors.push(createCitationExtractor(shortPattern, editionsToUse, [], [editionName], true))
            } catch (e) {
              console.error(`Invalid regex pattern for ${editionName}: ${pattern}`)
              console.error(`Error: ${e.message}`)
            }
          }
        } else {
          // No custom regex patterns, use standard format
          let fullRegex: string
          let shortRegex: string

          if ((editionData as any).regexes?.includes('$full_cite_year_page')) {
            // Special handling for year-page format (e.g., T.C. Memo. 2019-233)
            fullRegex = `(?<reporter>${escapedEdition})\\s+(?<volume>\\d{4})-(?<page>\\d+)`
            shortRegex = shortCiteRe(fullRegex)
          } else {
            // Standard volume-reporter-page format
            fullRegex = `(?<volume>\\d+)\\s+(?<reporter>${escapedEdition})\\s+(?<page>${PAGE_NUMBER_REGEX})`
            shortRegex = shortCiteRe(fullRegex)
          }

          // Create full citation extractor
          extractors.push(createCitationExtractor(fullRegex, editionsToUse, [], [editionName], false))

          // Create short citation extractor
          extractors.push(createCitationExtractor(shortRegex, editionsToUse, [], [editionName], true))
        }

        // For special reporters like NMCERT and Ohio, also create hyphen-separated patterns
        // This should be outside the else block to work for all editions
        if (editionName === 'NMCERT' || editionName === 'Ohio') {
          const hyphenRegex = `(?<volume>\\d+)-(?<reporter>${escapedEdition})-(?<page>${PAGE_NUMBER_REGEX})`
          extractors.push(
            createCitationExtractor(hyphenRegex, editionsToUse, [], [editionName], false),
          )
        }
      }

      // Add variations
      if (reporterData.variations) {
        for (const [variation, canonical] of Object.entries(reporterData.variations)) {
          const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

          // Check if the canonical edition has special regex patterns
          let varRegex: string
          let shortVarRegex: string

          const canonicalEditionData = reporterData.editions[canonical]
          if ((canonicalEditionData as any)?.regexes?.includes('$full_cite_year_page')) {
            // Special handling for year-page format variations
            varRegex = `(?<reporter>${escapedVariation})\\s+(?<volume>\\d{4})-(?<page>\\d+)`
            shortVarRegex = shortCiteRe(varRegex)
          } else {
            // Standard volume-reporter-page format
            varRegex = `(?<volume>\\d+)\\s+(?<reporter>${escapedVariation})\\s+(?<page>${PAGE_NUMBER_REGEX})`
            shortVarRegex = shortCiteRe(varRegex)
          }

          // Use ALL editions for this reporter to enable proper disambiguation
          // Variations should also include all editions so ambiguity can be detected
          const editionsToUse = allEditions

          // Full citation for variation
          extractors.push(createCitationExtractor(varRegex, [], editionsToUse, [variation], false))

          // Short citation for variation
          extractors.push(
            createCitationExtractor(shortVarRegex, [], editionsToUse, [variation], true),
          )
        }
      }
    }
  }

  return extractors
}

// Build law citation extractors from laws data
function buildLawCitationExtractors(): TokenExtractor[] {
  const extractors: TokenExtractor[] = []

  // For each law reporter in the database
  for (const [reporterStr, lawDataList] of Object.entries(LAWS)) {
    for (const lawData of lawDataList) {
      // Skip if no regexes defined
      if (!lawData.regexes || lawData.regexes.length === 0) {
        continue
      }

      // Create regex patterns for this law citation
      let patterns: string[]
      try {
        patterns = createLawCitationRegex(reporterStr, lawData.regexes)
      } catch (e) {
        console.error(`Error creating law citation regex for ${reporterStr}:`, e.message)
        continue
      }

      // Create extractor for each pattern
      for (const pattern of patterns) {
        try {
          // Test pattern compilation
          new RegExp(pattern)

          extractors.push(
            createLawCitationExtractor(
              pattern,
              reporterStr,
              lawData.cite_type,
              [reporterStr], // Strings to match for filtering
            ),
          )
        } catch (e) {
          console.error(`Invalid regex pattern for ${reporterStr}: ${pattern}`)
          console.error(`Error: ${e.message}`)
        }
      }

      // Also add variations if they exist
      if (lawData.variations && lawData.variations.length > 0) {
        for (const variation of lawData.variations) {
          const varPatterns = createLawCitationRegex(variation, lawData.regexes)
          for (const varPattern of varPatterns) {
            extractors.push(
              createLawCitationExtractor(
                varPattern,
                reporterStr, // Still use the canonical reporter name
                lawData.cite_type,
                [variation], // But filter on the variation string
              ),
            )
          }
        }
      }
    }
  }

  return extractors
}

// Build journal citation extractors from journals data
function buildJournalCitationExtractors(): TokenExtractor[] {
  const extractors: TokenExtractor[] = []

  // For each journal in the database
  for (const [journalStr, journalDataList] of Object.entries(JOURNALS)) {
    for (const journalData of journalDataList) {
      // Escape the journal abbreviation for regex
      const escapedJournal = journalStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Journal citation pattern with optional pin cite and year
      // Matches: "123 Harv. L. Rev. 456" or "123 Harv. L. Rev. 456, 478" or "123 Harv. L. Rev. 456 (2010)"
      const basicRegex = `(?<volume>\\d+)\\s+(?<journal>${escapedJournal})\\s+(?<page>${PAGE_NUMBER_REGEX})(?:,\\s*(?<pinCite>\\d+(?:-\\d+)?(?:\\s*n\\.\\s*\\d+)?(?:,\\s*\\d+(?:-\\d+)?)*)?)?(?:\\s*\\((?<year>\\d{4}(?:-\\d{2,4})?)\\))?`

      extractors.push(
        createJournalCitationExtractor(basicRegex, journalStr, journalData.name || journalStr, [
          journalStr,
        ]),
      )

      // Also add variations if they exist
      if (journalData.variations && journalData.variations.length > 0) {
        for (const variation of journalData.variations) {
          const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const varRegex = `(?<volume>\\d+)\\s+(?<journal>${escapedVariation})\\s+(?<page>${PAGE_NUMBER_REGEX})(?:,\\s*(?<pinCite>\\d+(?:-\\d+)?(?:\\s*n\\.\\s*\\d+)?(?:,\\s*\\d+(?:-\\d+)?)*)?)?(?:\\s*\\((?<year>\\d{4}(?:-\\d{2,4})?)\\))?`

          extractors.push(
            createJournalCitationExtractor(
              varRegex,
              journalStr, // Use canonical journal name
              journalData.name || journalStr,
              [variation], // But filter on the variation string
            ),
          )
        }
      }
    }
  }

  return extractors
}

// Export a singleton instance
export const defaultTokenizer = new DefaultTokenizer()

// Export a function to recreate the tokenizer (useful for testing)
export function createDefaultTokenizer(): DefaultTokenizer {
  return new DefaultTokenizer()
}

// Performance-optimized tokenizer using string matching
export class AhocorasickTokenizer extends Tokenizer {
  private unfilteredExtractors: Set<TokenExtractor>
  private caseSensitiveStrings: Map<string, TokenExtractor[]>
  private caseInsensitiveStrings: Map<string, TokenExtractor[]>

  constructor(extractors: TokenExtractor[] = []) {
    super(extractors)
    this.rebuildStringMaps()
  }

  /**
   * Rebuild the string mapping after extractors have been modified
   */
  private rebuildStringMaps(): void {
    // Build sets for filtering
    this.unfilteredExtractors = new Set()
    this.caseSensitiveStrings = new Map()
    this.caseInsensitiveStrings = new Map()

    for (const extractor of this.extractors) {
      if (!extractor.strings || extractor.strings.length === 0) {
        this.unfilteredExtractors.add(extractor)
      } else {
        const isCaseInsensitive = !!(extractor.flags && extractor.flags & 2) // re.I = 2
        const targetMap = isCaseInsensitive
          ? this.caseInsensitiveStrings
          : this.caseSensitiveStrings

        for (const str of extractor.strings) {
          const key = isCaseInsensitive ? str.toLowerCase() : str
          if (!targetMap.has(key)) {
            targetMap.set(key, [])
          }
          targetMap.get(key)?.push(extractor)
        }
      }
    }
  }

  /**
   * Override addExtractor to rebuild string maps
   */
  addExtractor(extractor: TokenExtractor): void {
    super.addExtractor(extractor)
    this.rebuildStringMaps()
  }

  /**
   * Override addExtractors to rebuild string maps
   */
  addExtractors(extractors: TokenExtractor[]): void {
    super.addExtractors(extractors)
    this.rebuildStringMaps()
  }

  /**
   * Override removeExtractor to rebuild string maps
   */
  removeExtractor(extractor: TokenExtractor): boolean {
    const result = super.removeExtractor(extractor)
    if (result) {
      this.rebuildStringMaps()
    }
    return result
  }

  /**
   * Override removeExtractors to rebuild string maps
   */
  removeExtractors(predicate: (extractor: TokenExtractor) => boolean): number {
    const result = super.removeExtractors(predicate)
    if (result > 0) {
      this.rebuildStringMaps()
    }
    return result
  }

  /**
   * Override setExtractors to rebuild string maps
   */
  setExtractors(extractors: TokenExtractor[]): void {
    super.setExtractors(extractors)
    this.rebuildStringMaps()
  }

  /**
   * Override clearExtractors to rebuild string maps
   */
  clearExtractors(): void {
    super.clearExtractors()
    this.rebuildStringMaps()
  }

  /**
   * Override modifyExtractorPatterns to rebuild string maps
   */
  modifyExtractorPatterns(
    modifier: (regex: string, extractor: TokenExtractor) => string,
    filter?: (extractor: TokenExtractor) => boolean,
  ): void {
    super.modifyExtractorPatterns(modifier, filter)
    this.rebuildStringMaps()
  }

  getExtractors(text: string): TokenExtractor[] {
    const uniqueExtractors = new Set(this.unfilteredExtractors)

    // Check case-sensitive strings
    for (const [str, extractors] of this.caseSensitiveStrings) {
      if (text.includes(str)) {
        for (const extractor of extractors) {
          uniqueExtractors.add(extractor)
        }
      }
    }

    // Check case-insensitive strings
    const lowerText = text.toLowerCase()
    for (const [str, extractors] of this.caseInsensitiveStrings) {
      if (lowerText.includes(str)) {
        for (const extractor of extractors) {
          uniqueExtractors.add(extractor)
        }
      }
    }

    return Array.from(uniqueExtractors)
  }
}
