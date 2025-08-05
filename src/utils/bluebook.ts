/**
 * Bluebook citation formatting utilities
 * 
 * These utilities help format citations according to The Bluebook: A Uniform System of Citation.
 * They are optional and do not affect the core citation extraction functionality.
 */

import { CitationBase, FullCaseCitation } from '../models'

/**
 * Reporter types for Bluebook hierarchy
 */
export enum ReporterType {
  OFFICIAL = 'official',
  REGIONAL = 'regional', 
  SPECIALTY = 'specialty',
  ELECTRONIC_WESTLAW = 'electronic_westlaw',
  ELECTRONIC_LEXIS = 'electronic_lexis',
  ELECTRONIC_OTHER = 'electronic_other',
  UNKNOWN = 'unknown'
}

/**
 * Options for Bluebook formatting
 */
export interface BluebookOptions {
  /** Reorder parallel citations according to Bluebook hierarchy */
  reorderParallel?: boolean
  /** Format abbreviations according to Bluebook style */
  abbreviationStyle?: 'bluebook' | 'original'
}

/**
 * Reporter ranking for Bluebook citation ordering
 * Lower numbers = higher priority
 */
const REPORTER_RANKINGS: Record<string, number> = {
  // Official reporters (priority 1)
  'U.S.': 1,
  'S. Ct.': 1,
  'L. Ed.': 1,
  'L. Ed. 2d': 1,
  'F.': 1,
  'F.2d': 1,
  'F.3d': 1,
  'F.4th': 1,
  'F. Supp.': 1,
  'F. Supp. 2d': 1,
  'F. Supp. 3d': 1,
  'F.R.D.': 1,
  'B.R.': 1,
  'T.C.': 1,
  'Cl. Ct.': 1,
  'Fed. Cl.': 1,
  'Vet. App.': 1,
  
  // Regional reporters (priority 2)
  'A.': 2,
  'A.2d': 2,
  'A.3d': 2,
  'N.E.': 2,
  'N.E.2d': 2,
  'N.E.3d': 2,
  'N.W.': 2,
  'N.W.2d': 2,
  'N.W.3d': 2,
  'P.': 2,
  'P.2d': 2,
  'P.3d': 2,
  'S.E.': 2,
  'S.E.2d': 2,
  'S.W.': 2,
  'S.W.2d': 2,
  'S.W.3d': 2,
  'So.': 2,
  'So. 2d': 2,
  'So. 3d': 2,
  
  // Specialty reporters (priority 3)
  'Cal. App.': 3,
  'Cal. App. 2d': 3,
  'Cal. App. 3d': 3,
  'Cal. App. 4th': 3,
  'Cal. App. 5th': 3,
  'N.Y.': 3,
  'N.Y.2d': 3,
  'N.Y.3d': 3,
  'A.D.': 3,
  'A.D.2d': 3,
  'A.D.3d': 3,
  'N.Y.S.': 3,
  'N.Y.S.2d': 3,
  'N.Y.S.3d': 3,
  
  // Electronic databases
  'WL': 4,  // Westlaw (priority 4)
  'LEXIS': 5,  // Lexis (priority 5)
}

/**
 * Check if citations are parallel (refer to the same case)
 */
export function areParallelCitations(a: CitationBase, b: CitationBase): boolean {
  if (!(a instanceof FullCaseCitation) || !(b instanceof FullCaseCitation)) {
    return false
  }
  
  const metaA = a.metadata
  const metaB = b.metadata
  
  // Must have matching plaintiff and defendant
  if (metaA.plaintiff !== metaB.plaintiff || metaA.defendant !== metaB.defendant) {
    return false
  }
  
  // Must have matching year and court
  if (metaA.year !== metaB.year || metaA.court !== metaB.court) {
    return false
  }
  
  // If all key metadata matches, they're parallel citations
  return true
}

/**
 * Get the Bluebook ranking for a reporter
 */
export function getReporterRank(citation: FullCaseCitation): number {
  // Check if it's a Westlaw citation
  if (citation.groups.volume && citation.groups.page && 
      citation.matchedText().includes('WL')) {
    return REPORTER_RANKINGS['WL'] || 6
  }
  
  // Check if it's a LEXIS citation
  if (citation.groups.volume && citation.groups.page && 
      citation.matchedText().includes('LEXIS')) {
    return REPORTER_RANKINGS['LEXIS'] || 6
  }
  
  // Check standard reporters
  const reporter = citation.groups.reporter || citation.reporter
  if (reporter && reporter !== 'undefined' && REPORTER_RANKINGS[reporter]) {
    return REPORTER_RANKINGS[reporter]
  }
  
  // Unknown reporter gets lowest priority
  return 6
}

/**
 * Group citations by case based on metadata
 */
function groupCitationsByCase(citations: CitationBase[]): CitationBase[][] {
  const groups: CitationBase[][] = []
  const processed = new Set<number>()
  
  citations.forEach((citation, idx) => {
    if (processed.has(idx)) return
    
    // Start a new group with this citation
    const group = [citation]
    processed.add(idx)
    
    // Only look for parallels if this is a FullCaseCitation
    if (citation instanceof FullCaseCitation) {
      // Look for other citations that are parallel to this one
      citations.forEach((other, otherIdx) => {
        if (otherIdx <= idx || processed.has(otherIdx)) return
        
        if (other instanceof FullCaseCitation && areParallelCitations(citation, other)) {
          group.push(other)
          processed.add(otherIdx)
        }
      })
    }
    
    groups.push(group)
  })
  
  return groups
}

/**
 * Reorder parallel citations according to Bluebook hierarchy
 */
export function reorderParallelCitations(citations: CitationBase[]): CitationBase[] {
  const groups = groupCitationsByCase(citations)
  const result: CitationBase[] = []
  
  // Process each group
  groups.forEach(group => {
    if (group.length === 1) {
      // Single citation, no reordering needed
      result.push(...group)
      return
    }
    
    // Separate case citations from others
    const caseCitations = group.filter(c => c instanceof FullCaseCitation) as FullCaseCitation[]
    const otherCitations = group.filter(c => !(c instanceof FullCaseCitation))
    
    // Sort case citations by Bluebook hierarchy
    caseCitations.sort((a, b) => {
      const rankA = getReporterRank(a)
      const rankB = getReporterRank(b)
      
      if (rankA !== rankB) {
        return rankA - rankB
      }
      
      // If same rank, maintain original order
      return a.index - b.index
    })
    
    // Add sorted case citations first, then others
    result.push(...caseCitations, ...otherCitations)
  })
  
  // Don't re-sort the final result - keep the Bluebook ordering we just created
  return result
}

/**
 * Format citations according to Bluebook style
 */
export function formatBluebook(
  citations: CitationBase[], 
  options: BluebookOptions = {}
): CitationBase[] {
  let result = [...citations]  // Create a copy
  
  if (options.reorderParallel) {
    result = reorderParallelCitations(result)
  }
  
  // Future: Add abbreviation formatting if needed
  // if (options.abbreviationStyle === 'bluebook') {
  //   result = formatAbbreviations(result)
  // }
  
  return result
}

/**
 * Get the reporter type for categorization
 */
export function getReporterType(citation: FullCaseCitation): ReporterType {
  const text = citation.matchedText()
  
  // Electronic databases
  if (text.includes('WL')) return ReporterType.ELECTRONIC_WESTLAW
  if (text.includes('LEXIS')) return ReporterType.ELECTRONIC_LEXIS
  
  // Check against known reporters
  const reporter = citation.groups.reporter || citation.reporter
  if (!reporter) return ReporterType.UNKNOWN
  
  const rank = REPORTER_RANKINGS[reporter]
  switch (rank) {
    case 1: return ReporterType.OFFICIAL
    case 2: return ReporterType.REGIONAL
    case 3: return ReporterType.SPECIALTY
    default: return ReporterType.UNKNOWN
  }
}