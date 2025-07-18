// Main exports for eyecite TypeScript library

// Core models and types
export {
  CitationBase,
  FullCaseCitation,
  FullLawCitation,
  FullJournalCitation,
  ShortCaseCitation,
  SupraCitation,
  IdCitation,
  ReferenceCitation,
  UnknownCitation,
  ResourceCitation,
  CaseCitation,
  CitationToken,
  type IdToken,
  type SupraToken,
  type StopWordToken,
} from './models'

// Main functions
export { getCitations, extractReferenceCitations } from './find'
export { resolveCitations, resolveFullCitation } from './resolve'
export { cleanText, cleanersLookup } from './clean'

// Tokenizers
export { DefaultTokenizer, Tokenizer, CustomTokenizer, RegexPatternBuilder, AhocorasickTokenizer, BaseTokenExtractor } from './tokenizers'

// Data and utilities
export { REPORTERS, COURTS } from './data'
export { filterCitations, disambiguateReporters } from './helpers'

// Annotation functions
export { annotateCitations, annotateCitationsHtml, annotate } from './annotate'
export type { AnnotationOptions } from './annotate'

// Utilities
export { SpanUpdater, bisectLeft, bisectRight } from './span-updater'
