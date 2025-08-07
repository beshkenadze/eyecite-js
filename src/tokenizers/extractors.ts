import {
  CitationToken,
  CaseNameToken,
  DOLOpinionToken,
  type Edition,
  IdLawToken,
  IdToken,
  JournalCitationToken,
  LawCitationToken,
  ParagraphToken,
  PlaceholderCitationToken,
  SectionToken,
  StopWordToken,
  SupraToken,
} from '../models'
import {
  CASE_NAME_ONLY_REGEX,
  DOL_OPINION_REGEX,
  ID_AT_PAGE_REGEX,
  ID_LAW_REGEX,
  ID_REGEX,
  nonalphanumBoundariesRe,
  PARAGRAPH_REGEX,
  PLACEHOLDER_CITATIONS,
  SECTION_REGEX,
  STOP_WORD_REGEX,
  STOP_WORDS,
  SUPRA_REGEX,
} from '../regexes'
import { BaseTokenExtractor } from './base'
import { isNominativeInCaseNameContext } from './nominative-context'

// Nominative reporter names that need special handling
export const NOMINATIVE_REPORTER_NAMES = new Set([
  'Thompson',
  'Cooke',
  'Holmes',
  'Olcott',
  'Chase',
  'Gilmer',
  'Bee',
  'Deady',
  'Taney',
])

export function tokenIsFromNominativeReporter(token: any): boolean {
  if (!(token instanceof CitationToken)) {
    return false
  }

  let name: string
  if (token.exactEditions.length > 0) {
    name = token.exactEditions[0].reporter.shortName
  } else if (token.variationEditions.length > 0) {
    name = token.variationEditions[0].reporter.shortName
  } else {
    return false
  }

  return NOMINATIVE_REPORTER_NAMES.has(name)
}

// Create extractors for special token types
export function createSpecialExtractors(): BaseTokenExtractor[] {
  return [
    // Note: Case name only token extractor removed - case names will only be recognized as references when full citations exist
    
    // Id law token extractor - must come before regular Id token
    new BaseTokenExtractor(ID_LAW_REGEX, IdLawToken, {}, 2), // re.I = 2

    // Id at page token extractor - also before regular Id token
    new BaseTokenExtractor(ID_AT_PAGE_REGEX, IdToken, {}, 2), // re.I = 2

    // Id token extractor
    new BaseTokenExtractor(ID_REGEX, IdToken, {}, 2, ['id.', 'ibid.']), // re.I = 2

    // Supra token extractor
    new BaseTokenExtractor(SUPRA_REGEX, SupraToken, {}, 2, ['supra']), // re.I = 2

    // Paragraph token extractor
    new BaseTokenExtractor(PARAGRAPH_REGEX, ParagraphToken),

    // Stop word token extractor
    new BaseTokenExtractor(STOP_WORD_REGEX, StopWordToken, {}, 2, STOP_WORDS), // re.I = 2

    // Placeholder citation token extractor
    new BaseTokenExtractor(PLACEHOLDER_CITATIONS, PlaceholderCitationToken, {}, 2), // re.I = 2

    // Section token extractor
    new BaseTokenExtractor(SECTION_REGEX, SectionToken, {}, 0, ['§']),

    // DOL Opinion Letter token extractor
    new BaseTokenExtractor(DOL_OPINION_REGEX, DOLOpinionToken),
  ]
}

// Custom extractor that filters nominative reporters in case name contexts
class NominativeAwareCitationExtractor extends BaseTokenExtractor {
  constructor(
    regex: string,
    extra: Record<string, unknown> = {},
    flags = 0,
    strings: string[] = [],
  ) {
    super(regex, CitationToken, extra, flags, strings)
  }

  getMatches(text: string): RegExpExecArray[] {
    const matches = super.getMatches(text)
    
    // Filter out matches that are nominative reporters in case name contexts
    return matches.filter(match => {
      // Check if any edition is a nominative reporter
      const editions = [...(this.extra.exactEditions as Edition[] || []), 
                       ...(this.extra.variationEditions as Edition[] || [])]
      
      for (const edition of editions) {
        if (NOMINATIVE_REPORTER_NAMES.has(edition.reporter.shortName)) {
          // Check if this match is in a case name context
          if (isNominativeInCaseNameContext(
            text,
            match.index || 0,
            (match.index || 0) + match[0].length,
            edition.reporter.shortName
          )) {
            return false // Filter out this match
          }
        }
      }
      
      return true
    })
  }
}

// Helper to create citation extractors from reporter data
export function createCitationExtractor(
  regex: string,
  exactEditions: Edition[],
  variationEditions: Edition[],
  strings: string[],
  short = false,
): BaseTokenExtractor {
  // Check if any edition is a nominative reporter
  const hasNominative = [...exactEditions, ...variationEditions].some(
    edition => NOMINATIVE_REPORTER_NAMES.has(edition.reporter.shortName)
  )
  
  if (hasNominative) {
    // Use the nominative-aware extractor
    return new NominativeAwareCitationExtractor(
      nonalphanumBoundariesRe(regex),
      {
        exactEditions,
        variationEditions,
        short,
      },
      0,
      strings,
    )
  }
  
  // Use the standard extractor
  return new BaseTokenExtractor(
    nonalphanumBoundariesRe(regex),
    CitationToken,
    {
      exactEditions,
      variationEditions,
      short,
    },
    0,
    strings,
  )
}

// Helper to create law citation extractors
export function createLawCitationExtractor(
  regex: string,
  reporter: string,
  lawType: string,
  strings: string[],
): BaseTokenExtractor {
  return new BaseTokenExtractor(
    regex, // Law citations don't need nonalphanumBoundariesRe wrapper
    LawCitationToken,
    {
      reporter,
      lawType,
    },
    0,
    strings,
  )
}

// Helper to create journal citation extractors
export function createJournalCitationExtractor(
  regex: string,
  journal: string,
  journalName: string,
  strings: string[],
): BaseTokenExtractor {
  return new BaseTokenExtractor(
    nonalphanumBoundariesRe(regex),
    JournalCitationToken,
    {
      journal,
      journalName,
    },
    0,
    strings,
  )
}
