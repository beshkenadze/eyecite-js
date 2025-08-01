import type { Element, Node, Text } from 'domhandler'
import { parseDocument } from 'htmlparser2'
import { getCitations } from './find'
import type { CitationBase } from './models'
import type { Tokenizer } from './tokenizers'

// Type definitions
export interface AnnotationOptions {
  // Function to generate annotation markup
  annotateFunc?: (citation: CitationBase, text: string) => string
  // List of unbalanced HTML tags to handle
  unbalancedTags?: string[]
  // Citations to annotate (if not provided, will extract from text)
  citations?: CitationBase[]
  // Tokenizer to use for citation extraction
  tokenizer?: Tokenizer
}

/**
 * Default annotation function - wraps citation in a span with class "citation"
 */
function defaultAnnotateFunc(_citation: CitationBase, text: string): string {
  return `<span class="citation">${text}</span>`
}

/**
 * Structure to handle nested/overlapping citations
 */
interface CitationNode {
  citation: CitationBase
  start: number
  end: number
  children: CitationNode[]
  parent?: CitationNode
}

/**
 * Build a tree structure from overlapping citations
 */
function buildCitationTree(citations: CitationBase[]): CitationNode[] {
  // Create nodes for all citations
  const nodes: CitationNode[] = citations.map(citation => {
    const span = citation.span()
    return {
      citation,
      start: span.start,
      end: span.end,
      children: []
    }
  })

  // Sort by start position, then by end position (larger spans first)
  nodes.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start
    }
    return b.end - a.end
  })

  // Build the tree structure
  const roots: CitationNode[] = []
  
  for (const node of nodes) {
    // Find the smallest parent that contains this node
    let parent: CitationNode | null = null
    
    // Check existing roots and their descendants
    function findParent(candidates: CitationNode[]): CitationNode | null {
      for (const candidate of candidates) {
        // Check if this candidate contains the node
        if (candidate.start <= node.start && candidate.end >= node.end && candidate !== node) {
          // Check if any child is a better (smaller) parent
          const childParent = findParent(candidate.children)
          return childParent || candidate
        }
      }
      return null
    }
    
    parent = findParent(roots)
    
    if (parent) {
      parent.children.push(node)
      node.parent = parent
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * Apply annotations with proper nesting
 */
function applyAnnotations(
  text: string,
  nodes: CitationNode[],
  annotateFunc: (citation: CitationBase, text: string) => string
): string {
  // Process nodes from innermost to outermost (bottom-up)
  // First, collect all nodes in a flat list with their depth
  interface FlatNode {
    node: CitationNode
    depth: number
  }
  
  const flatNodes: FlatNode[] = []
  
  function collectNodes(nodes: CitationNode[], depth: number = 0): void {
    for (const node of nodes) {
      flatNodes.push({ node, depth })
      if (node.children.length > 0) {
        collectNodes(node.children, depth + 1)
      }
    }
  }
  
  collectNodes(nodes)
  
  // Sort by depth (deepest first) and then by position (right to left)
  flatNodes.sort((a, b) => {
    if (a.depth !== b.depth) {
      return b.depth - a.depth // Process deeper nodes first
    }
    return b.node.start - a.node.start // Process right to left at same depth
  })
  
  // Track replacements
  const replacements: Array<{ start: number; end: number; text: string; processed: boolean }> = []
  
  for (const { node } of flatNodes) {
    // Check if this node has already been processed as part of a parent
    const alreadyProcessed = replacements.some(r => 
      r.processed && r.start <= node.start && r.end >= node.end
    )
    
    if (alreadyProcessed) {
      continue
    }
    
    // Get the current text for this citation
    let citationText = text.substring(node.start, node.end)
    
    // Apply any child replacements within this citation
    const childReplacements = replacements.filter(r => 
      !r.processed && r.start >= node.start && r.end <= node.end
    )
    
    // Sort child replacements right to left
    childReplacements.sort((a, b) => b.start - a.start)
    
    // Apply child replacements to get the text with nested annotations
    for (const child of childReplacements) {
      const relativeStart = child.start - node.start
      const relativeEnd = child.end - node.start
      citationText = citationText.substring(0, relativeStart) + child.text + citationText.substring(relativeEnd)
      child.processed = true
    }
    
    // Apply annotation to this citation
    const annotated = annotateFunc(node.citation, citationText)
    
    replacements.push({
      start: node.start,
      end: node.end,
      text: annotated,
      processed: false
    })
  }
  
  // Apply all top-level replacements (those not marked as processed)
  const topLevelReplacements = replacements.filter(r => !r.processed)
  topLevelReplacements.sort((a, b) => b.start - a.start)
  
  let result = text
  for (const replacement of topLevelReplacements) {
    result = result.substring(0, replacement.start) + replacement.text + result.substring(replacement.end)
  }
  
  return result
}

/**
 * Annotate citations in text with HTML markup
 *
 * @param plainText The plain text containing citations
 * @param options Annotation options
 * @returns Text with citations wrapped in HTML markup
 */
export function annotateCitations(plainText: string, options: AnnotationOptions = {}): string {
  // Check if this is HTML and redirect to HTML handler
  if (/<[^>]+>/.test(plainText)) {
    return annotateCitationsHtml(plainText, options)
  }

  const {
    annotateFunc = defaultAnnotateFunc,
    citations = getCitations(plainText, { 
      removeAmbiguous: false,
      tokenizer: options.tokenizer 
    }),
  } = options

  if (citations.length === 0) {
    return plainText
  }

  // Build citation tree to handle overlaps
  const citationTree = buildCitationTree(citations)
  
  // Apply annotations with proper nesting
  const result = applyAnnotations(plainText, citationTree, annotateFunc)
  
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
    const selfClosing = [
      'br',
      'hr',
      'img',
      'input',
      'meta',
      'link',
      'area',
      'base',
      'col',
      'embed',
      'source',
      'track',
      'wbr',
    ]
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
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        html += serializeNode(child)
      }
    }
    return html
  } else if (node.type === 'comment') {
    return `<!--${'data' in node ? node.data : ''}-->`
  } else if (node.type === 'directive') {
    return `<${'data' in node ? node.data : ''}>`
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
export function annotateCitationsHtml(htmlText: string, options: AnnotationOptions = {}): string {
  const { annotateFunc = defaultAnnotateFunc, citations, tokenizer } = options

  // Parse HTML
  const doc = parseDocument(htmlText)

  // Tags to skip content extraction
  const skipTags = new Set(['script', 'style', 'noscript'])

  // First pass: extract plain text from non-skip elements
  const plainTextParts: Array<{ text: string; node: Node; inSkipTag: boolean }> = []
  const _plainTextOffset = 0

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
    } else if (node.type === 'root' && 'children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        extractText(child, false)
      }
    }
  }

  extractText(doc)

  // Build plain text from extracted parts (only non-skip content)
  const plainText = plainTextParts
    .filter((p) => !p.inSkipTag)
    .map((p) => p.text)
    .join('')

  // Get citations from plain text
  const citationsToUse = citations || getCitations(plainText, { 
    removeAmbiguous: false,
    tokenizer 
  })

  if (citationsToUse.length === 0) {
    return htmlText
  }

  // Build citation tree to handle overlaps
  const citationTree = buildCitationTree(citationsToUse)

  // Group citations by text node
  let currentOffset = 0
  const nodeAnnotations = new Map<Node, CitationNode[]>()

  for (const part of plainTextParts) {
    if (part.inSkipTag) {
      continue
    }

    const partStart = currentOffset
    const partEnd = currentOffset + part.text.length

    // Find root citations that overlap with this text node
    const relevantRoots: CitationNode[] = []
    
    function collectRelevantNodes(nodes: CitationNode[]): void {
      for (const node of nodes) {
        if (node.start < partEnd && node.end > partStart) {
          relevantRoots.push(node)
        }
      }
    }
    
    collectRelevantNodes(citationTree)

    if (relevantRoots.length > 0) {
      nodeAnnotations.set(part.node, relevantRoots)
    }

    currentOffset += part.text.length
  }

  // Apply annotations to each text node
  currentOffset = 0
  for (const part of plainTextParts) {
    if (part.inSkipTag) {
      continue
    }

    const roots = nodeAnnotations.get(part.node)
    if (roots && roots.length > 0) {
      // Adjust node positions relative to this text part
      const partStart = currentOffset
      
      function adjustNodePositions(nodes: CitationNode[]): CitationNode[] {
        return nodes.map(node => {
          const adjusted: CitationNode = {
            citation: node.citation,
            start: Math.max(0, node.start - partStart),
            end: Math.min(part.text.length, node.end - partStart),
            children: [],
            parent: node.parent
          }
          
          if (node.children.length > 0) {
            adjusted.children = adjustNodePositions(node.children)
          }
          
          return adjusted
        }).filter(node => node.start < node.end) // Only keep nodes that have content in this part
      }

      const adjustedRoots = adjustNodePositions(roots)
      
      if (adjustedRoots.length > 0) {
        const result = applyAnnotations(part.text, adjustedRoots, annotateFunc)
        ;(part.node as Text).data = result
      }
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
export function annotate(text: string, options: AnnotationOptions = {}): string {
  // Simple HTML detection
  const isHtml = /<[^>]+>/.test(text)

  if (isHtml) {
    return annotateCitationsHtml(text, options)
  } else {
    return annotateCitations(text, options)
  }
}