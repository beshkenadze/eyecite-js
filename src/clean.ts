import { parseDocument } from 'htmlparser2'

type CleaningStep = string | ((text: string) => string)

/**
 * Apply a list of cleaning functions to text in sequence
 * 
 * @param text The text to clean
 * @param steps Array of cleaning function names or custom functions
 * @returns The cleaned text
 */
export function cleanText(text: string, steps: Iterable<CleaningStep>): string {
  let result = text
  
  for (const step of steps) {
    let stepFunc: (text: string) => string
    
    if (typeof step === 'string' && step in cleanersLookup) {
      stepFunc = cleanersLookup[step]
    } else if (typeof step === 'function') {
      stepFunc = step
    } else {
      throw new Error(
        `clean_text steps must be callable or one of ${Object.keys(cleanersLookup).join(', ')}`
      )
    }
    
    result = stepFunc(result)
  }
  
  return result
}

/**
 * Extract visible text from HTML markup
 * 
 * @param htmlContent The HTML string
 * @returns Only the visible text content
 */
export function html(htmlContent: string): string {
  // Parse HTML
  const document = parseDocument(htmlContent)
  
  // Tags to skip
  const skipTags = new Set(['style', 'link', 'head', 'script', 'page-number'])
  
  // Extract text recursively
  const textNodes: string[] = []
  
  function extractText(node: any): void {
    if (node.type === 'text') {
      // Check if any parent is a skip tag
      let parent = node.parent
      let shouldSkip = false
      
      while (parent) {
        if (parent.name && skipTags.has(parent.name.toLowerCase())) {
          shouldSkip = true
          break
        }
        parent = parent.parent
      }
      
      if (!shouldSkip) {
        const text = node.data.trim()
        if (text) {
          textNodes.push(text)
        }
      }
    } else if (node.children) {
      for (const child of node.children) {
        extractText(child)
      }
    }
  }
  
  extractText(document)
  
  return textNodes.join(' ')
}

/**
 * Collapse multiple spaces or tabs into one space
 * 
 * @param text The input string
 * @returns Text with collapsed spaces and tabs
 */
export function inlineWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, ' ')
}

/**
 * Collapse all whitespace characters into one space
 * 
 * @param text The input string
 * @returns Text with collapsed whitespace
 */
export function allWhitespace(text: string): string {
  // \u200b is zero-width space
  return text.replace(/[\u200b\s]+/g, ' ')
}

/**
 * Remove underscores (common in PDF extractions)
 * 
 * @param text The input string
 * @returns Text without consecutive underscores
 */
export function underscores(text: string): string {
  return text.replace(/__+/g, ' ')
}

/**
 * Remove XML declaration tag
 * 
 * @param text The input string
 * @returns Text without XML opening tag
 */
export function xml(text: string): string {
  return text.replace(/^\s*<\?xml.*?\?>/i, '')
}

/**
 * Lookup table for cleaning functions
 */
export const cleanersLookup: Record<string, (text: string) => string> = {
  html,
  inline_whitespace: inlineWhitespace,
  all_whitespace: allWhitespace,
  underscores,
  xml,
}