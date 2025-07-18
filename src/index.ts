// Main exports for eyecite TypeScript library

export type { AnnotationOptions } from './annotate'
// Annotation functions
export { annotate, annotateCitations, annotateCitationsHtml } from './annotate'
export { cleanersLookup, cleanText } from './clean'
// Data and utilities
export { COURTS, REPORTERS } from './data'
// Main functions
export { extractReferenceCitations, getCitations } from './find'
export { disambiguateReporters, filterCitations } from './helpers'
// Core models and types
export {
  CaseCitation,
  CitationBase,
  CitationToken,
  FullCaseCitation,
  FullJournalCitation,
  FullLawCitation,
  IdCitation,
  type IdToken,
  ReferenceCitation,
  ResourceCitation,
  ShortCaseCitation,
  type StopWordToken,
  SupraCitation,
  type SupraToken,
  UnknownCitation,
} from './models'
export { resolveCitations, resolveFullCitation } from './resolve'
// Utilities
export { bisectLeft, bisectRight, SpanUpdater } from './span-updater'
// Tokenizers
export {
  AhocorasickTokenizer,
  BaseTokenExtractor,
  CustomTokenizer,
  DefaultTokenizer,
  RegexPatternBuilder,
  Tokenizer,
} from './tokenizers'
