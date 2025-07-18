/**
 * Clean verbose regex patterns from Python to JavaScript format
 * Handles escaped spaces, comments, and multi-line formatting
 */
export function cleanVerboseRegex(regex: string): string {
  // First, replace escaped spaces with actual spaces
  let cleaned = regex.replace(/\\\s/g, ' ')
  
  // Remove comments while preserving structure
  // Match # followed by anything except newline, but stop before closing parens
  cleaned = cleaned.replace(/#[^)\n]*/g, '')
  
  // Now collapse multiple spaces to single space
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Trim the result
  return cleaned.trim()
}