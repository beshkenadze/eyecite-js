import { NOMINATIVE_REPORTER_NAMES } from './extractors'

/**
 * Check if a reporter is a nominative reporter (named after a person)
 */
export function isNominativeReporter(reporterName: string): boolean {
  // Check if the base name (without periods) is in the nominative list
  const baseName = reporterName.replace(/\./g, '')
  return NOMINATIVE_REPORTER_NAMES.has(baseName) || NOMINATIVE_REPORTER_NAMES.has(reporterName)
}

/**
 * Fix nominative reporter regex patterns to prevent incorrect matches
 * 
 * Nominative reporters should only match in specific contexts:
 * 1. When preceded by a volume number (e.g., "3 Cooke 123")
 * 2. When in parentheses after another reporter (e.g., "123 Tenn. (3 Cooke) 456")
 * 3. NOT when followed by a comma and number in case name context (e.g., "In re Cooke, 93 Wn. App.")
 */
export function fixNominativeReporterPattern(pattern: string, reporterName: string): string {
  // Check if this is a nominative reporter
  if (!isNominativeReporter(reporterName)) {
    return pattern
  }

  // Special handling for Thompson - it should not match in "v. Thompson" contexts
  if (reporterName === 'Thompson' && pattern.includes('$full_cite')) {
    // For Thompson, require a volume number before it
    return '$volume $reporter,? $page'
  }

  // For nominative reporters, we need to ensure they don't match in case name contexts
  // The pattern "$volume_nominative ?$reporter,? $page" is too broad
  
  // If the pattern contains "$volume_nominative", it needs special handling
  if (pattern.includes('$volume_nominative')) {
    // This pattern allows optional volume, which causes issues
    // We should require either:
    // 1. A volume number before the reporter name
    // 2. The reporter to be in parentheses (for embedded citations)
    
    // For now, return a pattern that requires a volume or parenthetical context
    // This prevents matching "Cooke, 93" in "In re Cooke, 93 Wn. App. 526"
    return '$volume $reporter,? $page'
  }

  // Handle single volume patterns (like Gilmer)
  if (pattern.includes('$full_cite_single_volume') || pattern.includes('single_volume')) {
    // For single volume nominative reporters, we need to be more careful
    // They should not match at the beginning of a short form citation
    // Pattern should require the reporter to be at start of text or after specific punctuation
    return '(?:^|\\s{2,}|[;:]\\s*)$reporter,? $page'
  }

  // Handle patterns like "$reporter,? $page" for Bee
  if (pattern === '$reporter,? $page') {
    // This pattern is too broad for nominative reporters
    // Require a clearer citation context - not after party names
    return '(?:^|[;:]\\s+|\\d+\\s+)$reporter,? $page'
  }

  return pattern
}

/**
 * Create a negative lookahead pattern to prevent matching nominative reporters
 * in case name contexts
 */
export function createNominativeLookahead(reporterName: string): string {
  if (!isNominativeReporter(reporterName)) {
    return ''
  }

  // Create a negative lookahead that prevents matching when:
  // 1. Preceded by "v." (versus)
  // 2. Preceded by "In re" 
  // 3. Followed by " v." (defendant name)
  return `(?<!\\bv\\.\\s{0,5})(?<!\\bIn\\s+re\\s+)(?!\\s*v\\.)`
}