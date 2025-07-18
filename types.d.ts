// Temporary type declarations for @beshkenadze/eyecite
// Remove this file after updating to @alpha version

declare module '@beshkenadze/eyecite' {
  // Main types
  export interface Metadata {
    plaintiff?: string
    defendant?: string
    pinCite?: string
    court?: string
    year?: number
    parenthetical?: string
    volume?: string
    reporter?: string
    page?: string
    [key: string]: any
  }

  export interface CitationBase {
    matchedText(): string
    metadata: Metadata
    groups: Record<string, any>
    index: number
    span(): [number, number]
  }

  export interface FullCaseCitation extends CitationBase {
    volume: string
    reporter: string
    page: string
    year?: number
  }

  export interface ShortCaseCitation extends CitationBase {
    volume: string
    reporter: string
    page: string
  }

  export interface FullLawCitation extends CitationBase {
    title?: string
    section?: string
  }

  export interface FullJournalCitation extends CitationBase {
    volume: string
    journal: string
    page: string
  }

  export interface SupraCitation extends CitationBase {}
  export interface IdCitation extends CitationBase {}
  export interface ReferenceCitation extends CitationBase {}
  export interface UnknownCitation extends CitationBase {}

  // Main functions
  export function getCitations(
    text: string,
    removeAmbiguous?: boolean,
    tokenizer?: any,
    markupText?: string,
    cleanSteps?: string[]
  ): CitationBase[]

  export function cleanText(
    text: string,
    steps: Array<string | ((text: string) => string)>
  ): string

  export function resolveCitations<T extends CitationBase>(
    citations: T[],
    resolutionDict?: Record<string, any>
  ): T[]

  export function filterCitations<T extends CitationBase>(citations: T[]): T[]

  export function annotateCitations(
    text: string,
    citations: CitationBase[],
    options?: {
      annotator?: (citation: CitationBase, index: number) => string
      unbalancedTags?: string[]
    }
  ): string

  export function extractReferenceCitations(
    text: string,
    resolvedCitations: CitationBase[]
  ): ReferenceCitation[]

  // Re-export all models
  export * from '@beshkenadze/eyecite'
}