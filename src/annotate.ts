import type { CitationBase } from './models'
import { getCitations } from './find'
import { parseDocument, DomHandler } from 'htmlparser2'
import type { Node, Element, Text } from 'domhandler'
import { textContent } from 'domutils'

// Type definitions
export interface AnnotationOptions {
  // Function to generate annotation markup
  annotateFunc?: (citation: CitationBase, text: string) => string
  // List of unbalanced HTML tags to handle
  unbalancedTags?: string[]
  // Citations to annotate (if not provided, will extract from text)
  citations?: CitationBase[]
  // Tokenizer to use for citation extraction
  tokenizer?: any
}

/**
 * Default annotation function - wraps citation in a span with class "citation"
 */
function defaultAnnotateFunc(citation: CitationBase, text: string): string {
  return `<span class="citation">${text}</span>`
}

/**
 * Annotate citations in text with HTML markup
 * 
 * @param plainText The plain text containing citations
 * @param options Annotation options
 * @returns Text with citations wrapped in HTML markup
 */
export function annotateCitations(
  plainText: string,
  options: AnnotationOptions = {}
): string {
  // Check if this is HTML and redirect to HTML handler
  if (/<[^>]+>/.test(plainText)) {
    return annotateCitationsHtml(plainText, options)
  }
  
  const {
    annotateFunc = defaultAnnotateFunc,
    unbalancedTags = [],
    citations = getCitations(plainText, false, options.tokenizer),
  } = options

  if (citations.length === 0) {
    return plainText
  }

  // Sort citations by start position (reverse order for correct insertion)
  const sortedCitations = [...citations].sort((a, b) => b.span().start - a.span().start)

  // Apply annotations
  let result = plainText
  let offset = 0

  // Keep track of changes for HTML handling
  const changes: Array<{ start: number; end: number; replacement: string }> = []

  for (const citation of sortedCitations) {
    const span = citation.span()
    const citationText = plainText.substring(span.start, span.end)
    const annotated = annotateFunc(citation, citationText)
    
    changes.push({
      start: span.start,
      end: span.end,
      replacement: annotated,
    })
  }

  // Apply changes in reverse order
  changes.sort((a, b) => b.start - a.start)
  
  for (const change of changes) {
    result = result.substring(0, change.start) + 
             change.replacement + 
             result.substring(change.end)
  }

  return result
}

/**
 * Simple HTML serialization function
 */
function serializeNode(node: Node): string {
  if (node.type === 'text') {
    return (node as Text).data
  } else if (node.type === 'tag' || node.type === 'script' || node.type === 'style') {
    const elem = node as Element
    let html = `<${elem.name}`
    
    // Add attributes
    for (const [key, value] of Object.entries(elem.attribs || {})) {
      html += ` ${key}="${value}"`
    }
    
    // Self-closing tags
    const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']
    if (selfClosing.includes(elem.name.toLowerCase())) {
      html += ' />'
      return html
    }
    
    html += '>'
    
    // Add children
    if (elem.children) {
      for (const child of elem.children) {
        html += serializeNode(child)
      }
    }
    
    html += `</${elem.name}>`
    return html
  } else if (node.type === 'root') {
    let html = ''
    if ((node as any).children) {
      for (const child of (node as any).children) {
        html += serializeNode(child)
      }
    }
    return html
  } else if (node.type === 'comment') {
    return `<!--${(node as any).data}-->`
  } else if (node.type === 'directive') {
    return `<${(node as any).data}>`
  }
  
  return ''
}

/**
 * Annotate citations while preserving HTML structure
 * 
 * @param htmlText HTML text containing citations
 * @param options Annotation options
 * @returns HTML text with citations wrapped in markup
 */
export function annotateCitationsHtml(
  htmlText: string,
  options: AnnotationOptions = {}
): string {
  const {
    annotateFunc = defaultAnnotateFunc,
    unbalancedTags = [],
    citations,
    tokenizer,
  } = options

  // Parse HTML
  const doc = parseDocument(htmlText)
  
  // Tags to skip content extraction
  const skipTags = new Set(['script', 'style', 'noscript'])

  // First pass: extract plain text from non-skip elements
  const plainTextParts: Array<{ text: string; node: Node; inSkipTag: boolean }> = []
  let plainTextOffset = 0
  
  function extractText(node: Node, inSkipTag = false): void {
    if (node.type === 'text') {
      plainTextParts.push({ text: (node as Text).data, node, inSkipTag })
    } else if (node.type === 'tag') {
      const elem = node as Element
      const tagName = elem.name.toLowerCase()
      const shouldSkip = skipTags.has(tagName) || inSkipTag
      
      if (elem.children) {
        for (const child of elem.children) {
          extractText(child, shouldSkip)
        }
      }
    } else if (node.type === 'root' && (node as any).children) {
      for (const child of (node as any).children) {
        extractText(child, false)
      }
    }
  }
  
  extractText(doc)
  
  // Build plain text from extracted parts (only non-skip content)
  const plainText = plainTextParts.filter(p => !p.inSkipTag).map(p => p.text).join('')
  
  // Get citations from plain text
  const citationsToUse = citations || getCitations(plainText, false, tokenizer)
  
  if (citationsToUse.length === 0) {
    return htmlText
  }

  // Sort citations by position (reverse for easier replacement)
  const sortedCitations = [...citationsToUse].sort((a, b) => b.span().start - a.span().start)
  
  // Second pass: annotate text nodes
  let currentOffset = 0
  for (const part of plainTextParts) {
    // Skip text nodes in skip tags
    if (part.inSkipTag) {
      continue
    }
    
    const partStart = currentOffset
    const partEnd = currentOffset + part.text.length
    
    // Find citations in this text node
    const nodeCitations = sortedCitations.filter(citation => {
      const span = citation.span()
      return span.start < partEnd && span.end > partStart
    })
    
    if (nodeCitations.length > 0) {
      // Apply annotations to this text node
      let newText = part.text
      
      for (const citation of nodeCitations) {
        const span = citation.span()
        const relativeStart = Math.max(0, span.start - partStart)
        const relativeEnd = Math.min(part.text.length, span.end - partStart)
        
        if (relativeStart < relativeEnd) {
          const citationText = newText.substring(relativeStart, relativeEnd)
          const annotated = annotateFunc(citation, citationText)
          
          newText = newText.substring(0, relativeStart) + 
                   annotated + 
                   newText.substring(relativeEnd)
        }
      }
      
      // Update the text node
      (part.node as Text).data = newText
    }
    
    currentOffset += part.text.length
  }
  
  // Serialize back to HTML
  return serializeNode(doc)
}

/**
 * Main entry point for annotating citations
 * Detects if input is HTML and uses appropriate method
 */
export function annotate(
  text: string,
  options: AnnotationOptions = {}
): string {
  // Simple HTML detection
  const isHtml = /<[^>]+>/.test(text)
  
  if (isHtml) {
    return annotateCitationsHtml(text, options)
  } else {
    return annotateCitations(text, options)
  }
}