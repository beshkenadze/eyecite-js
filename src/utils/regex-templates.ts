/**
 * Utilities for processing regex templates
 * Based on Python's eyecite regex processing
 */

import { REGEXES } from '../data'

/**
 * Convert Python regex named groups to JavaScript format
 * Python: (?P<name>pattern) -> JavaScript: (?<name>pattern)
 */
function pythonToJavaScriptRegex(pattern: string): string {
  return pattern.replace(/\(\?P<([^>]+)>/g, '(?<$1>')
}

/**
 * Recursively substitute template variables in a pattern
 * Handles nested variable references like $reporter, $law_section, etc.
 */
export function recursiveSubstitute(
  pattern: string,
  variables: Record<string, string>,
  maxDepth = 10
): string {
  let result = pattern
  let depth = 0
  let hasChanges = true
  
  while (hasChanges && depth < maxDepth) {
    const previous = result
    
    // Replace all $variable references
    result = result.replace(/\$([a-zA-Z_]+)/g, (match, varName) => {
      return variables[varName] || match
    })
    
    hasChanges = result !== previous
    depth++
  }
  
  // Convert Python-style named groups to JavaScript format
  result = pythonToJavaScriptRegex(result)
  
  return result
}

/**
 * Get regex variables with law-specific processing
 */
export function getLawRegexVariables(): Record<string, string> {
  const variables: Record<string, string> = {}
  
  // Extract base variables from REGEXES
  if (REGEXES.law) {
    // Process law section regex - handle multiple sections with §§
    const sectionRegex = pythonToJavaScriptRegex(
      REGEXES.law.section || REGEXES.law.section_regex || 
      '(?P<section>(?:\\d+(?:[\\-.:]\\d+){,3})|(?:\\d+(?:\\((?:[a-zA-Z]{1}|\\d{1,2})\\))+))'
    )
    
    // Fix the section regex to handle simple numbers like "2"
    // The original regex requires complex patterns, but we need to match simple sections too
    // This regex captures the base section number but not subsections (which go in pinCite)
    variables.law_section = pythonToJavaScriptRegex('(?P<section>\\d+(?:[\\-.:]\\d+)*)')
    
    // Other law variables
    variables.law_subject = pythonToJavaScriptRegex(REGEXES.law.subject || '(?P<subject>[A-Z][.\\-\'A-Za-z]*(?: [A-Z][.\\-\'A-Za-z]*| &){,4})')
    variables.law_subject_word = REGEXES.law.subject_word || '[A-Z][.\\-\'A-Za-z]*'
    variables.law_year = pythonToJavaScriptRegex(REGEXES.law.year || '(?P<year>1\\d{3}|20\\d{2})')
    variables.law_month = pythonToJavaScriptRegex(REGEXES.law.month || '(?P<month>[A-Z][a-z]+\\.?)')
    variables.law_day = pythonToJavaScriptRegex(REGEXES.law.day || '(?P<day>\\d{1,2}),?')
  }
  
  // Page and volume variables
  if (REGEXES.page) {
    variables.page = pythonToJavaScriptRegex(REGEXES.page[''] || '(?P<page>\\d+)')
    variables.page_with_commas = pythonToJavaScriptRegex('(?P<page>\\d{1,3}(?:,\\d{3})*)')
    variables.page_3_4 = pythonToJavaScriptRegex(REGEXES.page['3_4'] || '(?P<page>\\d{3,4})')
  }
  
  if (REGEXES.volume) {
    variables.volume = pythonToJavaScriptRegex(REGEXES.volume?.[''] || '(?P<volume>\\d+)')
    variables.volume_with_digit_suffix = pythonToJavaScriptRegex('(?P<volume>\\d+(?:-\\d)?)')
    variables.volume_year = pythonToJavaScriptRegex('(?P<volume>1[789]\\d{2}|20\\d{2})')
  }
  
  // Paragraph marker
  if (REGEXES.paragraph) {
    variables.paragraph_marker = REGEXES.paragraph?.marker || '¶'
    variables.paragraph_marker_optional = REGEXES.paragraph?.marker_optional || '¶?'
  }
  
  // Section marker (handle both section symbol § and text variants)
  if (REGEXES.section_marker) {
    // The regex from data is already properly formatted
    variables.section_marker = REGEXES.section_marker
  } else {
    variables.section_marker = '((§§?)|([Ss]((ec)(tion)?)?s?\\.?))'
  }
  
  // Full citation templates
  if (REGEXES.full_cite) {
    variables.full_cite = REGEXES.full_cite[''] || '$volume $reporter,? $page'
    variables.full_cite_paragraph = REGEXES.full_cite.cch || '(?:$volume_with_digit_suffix )?$reporter $paragraph_marker_optional$page_with_commas'
  }
  
  return variables
}

/**
 * Expand a law citation regex pattern with template substitution
 */
export function expandLawRegex(pattern: string, reporterName: string): string {
  const variables = getLawRegexVariables()
  
  // Add the reporter name as a variable - wrap in a named group to capture it
  variables.reporter = `(?<reporter>${reporterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
  
  // First, replace hardcoded § with $section_marker to handle §§
  // But be careful with character classes like [§|s]
  let preprocessedPattern = pattern
    .replace(/\[§\|([^\]]+)\]/g, '((§§?)|$1)') // Replace [§|s] with ((§§?)|s)
    .replace(/(?<!\[)§(?!\])/g, '$section_marker') // Replace other § not in brackets
  
  // Recursively substitute all variables
  let expandedPattern = recursiveSubstitute(preprocessedPattern, variables)
  
  // Add post-law citation pattern to capture year, publisher, etc.
  // This pattern handles various combinations of publisher, year, and parentheticals
  // It also handles "et seq." and other text before the parentheses
  const postLawPattern = `(?:\\s+et\\s+seq\\.)?(?:\\s*\\((?:(?<publisher>[A-Z][a-z]+\\.?(?:\\s+Supp\\.)?)\\s+)?(?<year>1\\d{3}|20\\d{2})(?:-\\d{2})?\\))?`
  
  // Check if year/month/day are already in the pattern to avoid duplicates
  const hasYear = expandedPattern.includes('(?<year>')
  const hasMonth = expandedPattern.includes('(?<month>')
  const hasDay = expandedPattern.includes('(?<day>')
  
  // Replace duplicate named groups with non-capturing groups
  let finalPostPattern = postLawPattern
  if (hasYear) finalPostPattern = finalPostPattern.replace(/\(\?<year>/g, '(?:')
  if (hasMonth) finalPostPattern = finalPostPattern.replace(/\(\?<month>/g, '(?:')
  if (hasDay) finalPostPattern = finalPostPattern.replace(/\(\?<day>/g, '(?:')
  
  return expandedPattern + finalPostPattern
}

/**
 * Create a law citation extractor regex
 */
export function createLawCitationRegex(
  reporterName: string,
  patterns: string[]
): string[] {
  return patterns.map(pattern => expandLawRegex(pattern, reporterName))
}