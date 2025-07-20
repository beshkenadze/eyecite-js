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
  maxDepth = 10,
  seenGroups = new Set<string>(),
): string {
  let result = pattern
  let depth = 0
  let hasChanges = true

  while (hasChanges && depth < maxDepth) {
    const previous = result

    // Replace all $variable references
    result = result.replace(/\$([a-zA-Z_]+)/g, (match, varName) => {
      const replacement = variables[varName]
      if (!replacement) return match
      
      // Check for duplicate named groups in the replacement
      const namedGroupMatches = replacement.match(/\(\?P?<(\w+)>/g)
      if (namedGroupMatches) {
        let modifiedReplacement = replacement
        for (const groupMatch of namedGroupMatches) {
          const groupName = groupMatch.match(/\(\?P?<(\w+)>/)?.[1]
          if (groupName && seenGroups.has(groupName)) {
            // Convert to non-capturing group if we've seen this name before
            modifiedReplacement = modifiedReplacement.replace(
              new RegExp(`\\(\\?P?<${groupName}>`, 'g'),
              '(?:'
            )
          } else if (groupName) {
            seenGroups.add(groupName)
          }
        }
        return modifiedReplacement
      }
      
      return replacement
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
    const _sectionRegex = pythonToJavaScriptRegex(
      REGEXES.law.section ||
        '(?P<section>(?:\\d+(?:[\\-.:]\\d+){,3})|(?:\\d+(?:\\((?:[a-zA-Z]{1}|\\d{1,2})\\))+))',
    )

    // Fix the section regex to handle simple numbers like "2"
    // The original regex requires complex patterns, but we need to match simple sections too
    // This regex captures the base section number but not subsections (which go in pinCite)
    variables.law_section = pythonToJavaScriptRegex('(?P<section>\\d+(?:[\\-.:]\\d+)*)')

    // Other law variables
    variables.law_subject = pythonToJavaScriptRegex(
      REGEXES.law.subject || "(?P<subject>[A-Z][.\\-'A-Za-z]*(?: [A-Z][.\\-'A-Za-z]*| &){,4})",
    )
    variables.law_subject_word = REGEXES.law.subject_word || "[A-Z][.\\-'A-Za-z]*"
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
  if (REGEXES.paragraph_marker) {
    variables.paragraph_marker = REGEXES.paragraph_marker || '¶'
    variables.paragraph_marker_optional = `${REGEXES.paragraph_marker}?` || '¶?'
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
    variables.full_cite_paragraph =
      REGEXES.full_cite.cch ||
      '(?:$volume_with_digit_suffix )?$reporter $paragraph_marker_optional$page_with_commas'
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

  // First, check if the pattern already has §§? (handles both single and double section symbols)
  // If it does, don't do any preprocessing
  let preprocessedPattern = pattern
  if (!pattern.includes('§§?')) {
    // Only replace hardcoded § with $section_marker if pattern doesn't already handle §§
    preprocessedPattern = pattern
      .replace(/\[§\|([^\]]+)\]/g, '((§§?)|$1)') // Replace [§|s] with ((§§?)|s)
      .replace(/(?<!\[)§(?!\])/g, '$section_marker') // Replace other § not in brackets
  }

  // Recursively substitute all variables
  const expandedPattern = recursiveSubstitute(preprocessedPattern, variables)

  // Add post-law citation pattern to capture year, publisher, etc.
  // This pattern handles various combinations of publisher, year, and parentheticals
  // It also handles "et seq." and other text before the parentheses
  const postLawPattern = `(?:\\s+et\\s+seq\\.)?(?:\\s*\\((?:(?<publisher>[A-Z][a-zA-Z&.\\s]+(?:Supp\\.)?)\\s+)?(?<year>1\\d{3}|20\\d{2})(?:-\\d{2})?\\))?`

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
 * Get regex variables for reporter citations
 */
export function getReporterRegexVariables(): Record<string, string> {
  const variables: Record<string, string> = {}

  // Extract base variables from REGEXES
  if (REGEXES.volume) {
    variables.volume = pythonToJavaScriptRegex(REGEXES.volume?.[''] || '(?P<volume>\\d+)')
    variables.volume_nominative = pythonToJavaScriptRegex(REGEXES.volume?.nominative || '(?:(?P<volume>\\d{1,2}) )?')
    variables.volume_with_digit_suffix = pythonToJavaScriptRegex(REGEXES.volume?.with_digit_suffix || '(?P<volume>\\d{1,4}(?:-\\d+)?)')
    variables.volume_year = pythonToJavaScriptRegex(REGEXES.volume?.year || '(?P<volume>1[789]\\d{2}|20\\d{2})')
    variables.volume_with_alpha_suffix = pythonToJavaScriptRegex(REGEXES.volume?.with_alpha_suffix || '(?P<volume>\\d{1,4}A?)')
  }

  if (REGEXES.page) {
    // Import PAGE_NUMBER_REGEX to support underscores and other special page numbers
    const { PAGE_NUMBER_REGEX } = require('../regexes')
    // Use PAGE_NUMBER_REGEX which includes support for underscores, roman numerals, etc.
    variables.page = `(?<page>${PAGE_NUMBER_REGEX})`
    variables.page_with_commas = pythonToJavaScriptRegex(REGEXES.page.with_commas || '(?P<page>\\d{1,3}(?:,\\d{3})*)')
    variables.page_3_4 = pythonToJavaScriptRegex(REGEXES.page['3_4'] || '(?P<page>\\d{3,4})')
    variables.page_with_commas_and_suffix = pythonToJavaScriptRegex(REGEXES.page.with_commas_and_suffix || '(?P<page>\\d(?:[\\d,]*\\d)?[A-Z]?)')
  }

  if (REGEXES.full_cite) {
    variables.full_cite = REGEXES.full_cite[''] || '$volume $reporter,? $page'
    variables.full_cite_paragraph = REGEXES.full_cite.cch || '(?:$volume_with_digit_suffix )?$reporter $paragraph_marker_optional$page_with_commas'
    variables.full_cite_year_page = REGEXES.full_cite.year_page || '$reporter $volume_year-$page'
    // Add format neutral citations
    variables.full_cite_format_neutral = REGEXES.full_cite.format_neutral?.[''] || '$volume_year-$reporter-$page'
    variables.full_cite_format_neutral_3_4 = REGEXES.full_cite.format_neutral?.['3_4'] || '$volume_year-$reporter-$page_3_4'
    // Add Illinois neutral citation
    variables.full_cite_illinois_neutral = REGEXES.full_cite.illinois_neutral?.[''] || '$volume_year $reporter (?P<page>\\d{6}(?:-[A-Z]|WC)?)'
  }

  if (REGEXES.paragraph_marker) {
    variables.paragraph_marker = REGEXES.paragraph_marker || '¶'
    variables.paragraph_marker_optional = `${REGEXES.paragraph_marker}?` || '¶?'
  }

  return variables
}

/**
 * Expand a reporter citation regex pattern with template substitution
 */
export function expandReporterRegex(pattern: string, reporterName: string): string {
  const variables = getReporterRegexVariables()

  // Add the reporter name as a variable - wrap in a named group to capture it
  variables.reporter = `(?<reporter>${reporterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`

  // Recursively substitute all variables - each pattern gets its own seenGroups set
  return recursiveSubstitute(pattern, variables, 10, new Set<string>())
}

/**
 * Create reporter citation regex patterns
 */
export function createReporterCitationRegex(reporterName: string, patterns: string[]): string[] {
  return patterns.map((pattern) => expandReporterRegex(pattern, reporterName))
}

/**
 * Create a law citation extractor regex
 */
export function createLawCitationRegex(reporterName: string, patterns: string[]): string[] {
  return patterns.map((pattern) => expandLawRegex(pattern, reporterName))
}
