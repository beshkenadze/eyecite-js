import {
  CitationToken,
  type Edition,
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
  ]
}

// Helper to create citation extractors from reporter data
export function createCitationExtractor(
  regex: string,
  exactEditions: Edition[],
  variationEditions: Edition[],
  strings: string[],
  short = false,
): BaseTokenExtractor {
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
