// Main exports for eyecite TypeScript library

export type { AnnotationOptions } from './annotate'
// Annotation functions
export { annotate, annotateCitations, annotateCitationsHtml } from './annotate'
export { cleanersLookup, cleanText } from './clean'
// Data and utilities
export { COURTS, REPORTERS } from './data'
// Main functions
export { extractReferenceCitations, getCitations, type OverlapHandling, type GetCitationsOptions } from './find'
export { disambiguateReporters, filterCitations } from './helpers'
// Core models and types
export {
  CaseCitation,
  CitationBase,
  CitationToken,
  DOLOpinionCitation,
  FullCaseCitation,
  FullCitation,
  FullJournalCitation,
  FullLawCitation,
  IdCitation,
  IdLawCitation,
  IdLawToken,
  IdToken,
  Metadata,
  ReferenceCitation,
  ResourceCitation,
  ShortCaseCitation,
  StopWordToken,
  SupraCitation,
  SupraToken,
  UnknownCitation,
  // Base types
  type Document,
  type Groups,
  type Span,
  type Token,
  type TokenOrStr,
  type Tokens,
  type ResourceType,
  // Token classes
  SectionToken,
  ParagraphToken,
  LawCitationToken,
  JournalCitationToken,
  DOLOpinionToken,
  PlaceholderCitationToken,
  // Reporter types
  type Edition,
  type ReporterInterface,
} from './models'
export { resolveCitations, resolveFullCitation, resolveCitationsWithIdSubstitution } from './resolve'
// Utilities
export { bisectLeft, bisectRight, SpanUpdater } from './span-updater'
// Bluebook formatting utilities
export { 
  formatBluebook, 
  reorderParallelCitations, 
  areParallelCitations,
  getReporterRank,
  getReporterType,
  ReporterType,
  type BluebookOptions 
} from './utils/bluebook'
// Tokenizers
export {
  AhocorasickTokenizer,
  BaseTokenExtractor,
  CustomTokenizer,
  DefaultTokenizer,
  RegexPatternBuilder,
  Tokenizer,
} from './tokenizers'
