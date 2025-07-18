/**
 * Utilities for processing reporter variables and patterns
 */

/**
 * Process variables in regex patterns
 * Replace template variables with their values
 */
export function processVariables(pattern: string, variables: Record<string, string>): string {
  let result = pattern

  // Replace variables in the pattern
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
    result = result.replace(regex, value)
  }

  return result
}

/**
 * Recursively substitute variables in patterns
 * Handles nested variable references
 */
export function recursiveSubstitute(
  pattern: string,
  variables: Record<string, string>,
  maxDepth = 10,
): string {
  let result = pattern
  let depth = 0
  let hasChanges = true

  while (hasChanges && depth < maxDepth) {
    const previous = result
    result = processVariables(result, variables)
    hasChanges = result !== previous
    depth++
  }

  return result
}

/**
 * Build regex pattern for reporter citations
 */
export function buildReporterRegex(
  reporters: string[],
  pageVar = '\\d+',
  volumeVar = '\\d+',
): string {
  // Escape special regex characters in reporter names
  const escapedReporters = reporters.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  // Build pattern with named groups
  return `(?<volume>${volumeVar})\\s+(?<reporter>${escapedReporters.join('|')})\\s+(?<page>${pageVar})`
}

/**
 * Normalize reporter string for comparison
 */
export function normalizeReporter(reporter: string): string {
  return reporter
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\./g, '') // Remove periods
    .toLowerCase() // Convert to lowercase
    .trim()
}
