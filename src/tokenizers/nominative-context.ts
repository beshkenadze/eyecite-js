/**
 * Check if a potential nominative reporter match is actually part of a case name
 */
export function isNominativeInCaseNameContext(
  text: string,
  matchStart: number,
  matchEnd: number,
  reporterName: string
): boolean {
  // Get text before the match (up to 50 chars)
  const beforeStart = Math.max(0, matchStart - 50)
  const beforeText = text.substring(beforeStart, matchStart).trim()
  
  // Get text after the match (up to 50 chars)
  // Trim the match itself to handle trailing spaces in the regex match
  const matchText = text.substring(matchStart, matchEnd)
  const actualMatchEnd = matchStart + matchText.trimEnd().length
  const afterText = text.substring(actualMatchEnd, Math.min(text.length, actualMatchEnd + 50))
  
  // Check for case name patterns that indicate this is NOT a citation
  
  // Pattern 1: "v. <Nominative>," - defendant name
  if (beforeText.endsWith('v.') || beforeText.endsWith('vs.')) {
    return true
  }
  
  // Pattern 2: "<Nominative>, <number> <real reporter>" - antecedent to real citation
  // e.g., "Gilmer, 500 U.S." or "Thompson, 394 U. S."
  const afterPattern = /^\s*,?\s*\d+\s+[A-Z]/
  if (afterPattern.test(afterText)) {
    // Check if what follows looks like a real reporter
    const realReporterPattern = /^\s*,?\s*\d+\s+(U\.\s*S\.|F\.\d?d|[A-Z]\.\d?d|[A-Z][a-z]+\.(\s+App\.)?)/
    if (realReporterPattern.test(afterText)) {
      return true
    }
  }
  
  // Pattern 3: "In re <Nominative>," - case name
  if (beforeText.endsWith('In re') || beforeText.endsWith('in re')) {
    return true
  }
  
  // Pattern 4: Beginning of text followed by comma and number (likely case name)
  if (matchStart === 0 && afterText.match(/^\s*,/)) {
    return true
  }
  
  // Pattern 5: Nominative reporter at start followed by short form citation pattern
  // e.g., "Gilmer, 500 U.S. at"
  const shortFormPattern = /^\s+[A-Z]\.\s*[A-Z]?\.\s+at\s+/
  if (matchStart === 0 && shortFormPattern.test(afterText)) {
    return true
  }
  
  return false
}