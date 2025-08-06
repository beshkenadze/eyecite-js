import { cleanText } from './clean'
import { jokeCite } from './constants'
import {
  disambiguateReporters,
  extractPinCite,
  filterCitations,
  findCaseName,
  findCaseNameInHtml,
  isValidName,
} from './helpers'
import type { CaseCitation, CitationBase, Document, FullCitation, Tokens } from './models'
import {
  CaseReferenceToken,
  CitationToken,
  DOLOpinionCitation,
  DOLOpinionToken,
  FullCaseCitation,
  FullJournalCitation,
  FullLawCitation,
  IdCitation,
  IdLawCitation,
  IdLawToken,
  IdToken,
  JournalCitationToken,
  LawCitationToken,
  ReferenceCitation,
  type ResourceCitation,
  SectionToken,
  ShortCaseCitation,
  SupraCitation,
  SupraToken,
  UnknownCitation,
} from './models'
import {
  type Edition,
  includesYear,
  includesYearRange,
  parseYearRange,
  validateDateComponents,
} from './models/reporters'
import { referencePinCiteRe } from './regexes'
import { SpanUpdater } from './span-updater'
import type { Tokenizer } from './tokenizers'
import { defaultTokenizer } from './tokenizers'
import { placeholderMarkup } from './utils'

/**
 * Identify emphasis tags in HTML markup
 * @param markupText The HTML markup text
 * @returns Array of [text, start, end] tuples for emphasis tags
 */
function identifyEmphasisTags(markupText: string): Array<[string, number, number]> {
  // Use 's' flag to make . match newlines
  const pattern = /<(em|i|strong|b)[^>]*>([\s\S]*?)<\/\1>/gi
  const tags: Array<[string, number, number]> = []

  let match: RegExpExecArray | null
  while ((match = pattern.exec(markupText)) !== null) {
    const text = match[2].trim()
    if (text) {
      // Store the full match positions (including tags)
      tags.push([text, match.index, match.index + match[0].length])
    }
  }

  return tags
}

/**
 * Options for handling overlapping citations
 */
export type OverlapHandling = 'all' | 'parent-only' | 'children-only'

/**
 * Options for getCitations function
 */
export interface GetCitationsOptions {
  /** Remove ambiguous citations (default: false) */
  removeAmbiguous?: boolean
  /** Custom tokenizer instance */
  tokenizer?: Tokenizer
  /** Original markup text for enhanced extraction */
  markupText?: string
  /** Text cleaning steps to apply */
  cleanSteps?: Array<string | ((text: string) => string)>
  /** How to handle overlapping citations (default: 'all') */
  overlapHandling?: OverlapHandling
}

/**
 * Main function to extract citations from text
 * 
 * @param plainText - The text to extract citations from
 * @param options - Optional configuration object
 * @returns Array of citation objects
 */
export function getCitations(
  plainText: string,
  options?: GetCitationsOptions
): CitationBase[]

/**
 * Main function to extract citations from text (legacy signature for backward compatibility)
 * @deprecated Use the options object signature instead
 */
export function getCitations(
  plainText: string,
  removeAmbiguous?: boolean,
  tokenizer?: Tokenizer,
  markupText?: string,
  cleanSteps?: Array<string | ((text: string) => string)>,
  overlapHandling?: OverlapHandling
): CitationBase[]

/**
 * Main function to extract citations from text (implementation)
 */
export function getCitations(
  plainText = '',
  optionsOrRemoveAmbiguous?: GetCitationsOptions | boolean,
  tokenizer?: Tokenizer,
  markupText?: string,
  cleanSteps?: Array<string | ((text: string) => string)>,
  overlapHandling?: OverlapHandling
): CitationBase[] {
  // Handle both old and new signatures
  let options: GetCitationsOptions = {}
  
  if (typeof optionsOrRemoveAmbiguous === 'object' && optionsOrRemoveAmbiguous !== null) {
    // New signature with options object
    options = optionsOrRemoveAmbiguous
  } else {
    // Legacy signature with individual parameters
    options = {
      removeAmbiguous: optionsOrRemoveAmbiguous as boolean,
      tokenizer: tokenizer || defaultTokenizer,
      markupText: markupText || '',
      cleanSteps,
      overlapHandling: overlapHandling || 'all'
    }
  }
  
  // Set defaults
  const {
    removeAmbiguous = false,
    tokenizer: customTokenizer = defaultTokenizer,
    markupText: markup = '',
    cleanSteps: cleaning,
    overlapHandling: overlap = 'all'
  } = options
  if (plainText === 'eyecite') {
    return jokeCite
  }

  // If no plainText but markupText is provided with cleanSteps, extract plainText
  if (!plainText && markup && cleaning) {
    plainText = cleanText(markup, cleaning)
  }

  // Create document object
  const document: Document = {
    plainText,
    markupText: markup,
    cleanSteps: cleaning,
    citationTokens: [],
    words: [],
    emphasisTags: [],
    sourceText: markup || plainText,
    plainToMarkup: undefined,
    markupToPlain: undefined,
  }

  // Process markup text if provided
  if (markup) {
    // Identify emphasis tags
    document.emphasisTags = identifyEmphasisTags(markup)

    // Create SpanUpdaters for position mapping
    const placeholder = placeholderMarkup(markup)
    document.plainToMarkup = new SpanUpdater(plainText, placeholder)
    document.markupToPlain = new SpanUpdater(markup, plainText)
  }

  // Tokenize the document
  const [words, citationTokens] = customTokenizer.tokenize(document.plainText)
  document.words = words
  document.citationTokens = citationTokens

  const citations: CitationBase[] = []

  for (const [i, token] of document.citationTokens) {
    let citation: CitationBase | null = null

    // CASE 1: Token is a CitationToken
    if (token instanceof CitationToken) {
      if (token.short) {
        citation = extractShortformCitation(document, i)
      } else {
        citation = extractFullCitation(document, i)
      }
    }
    // CASE 2: Token is a LawCitationToken
    else if (token instanceof LawCitationToken) {
      const lawCitations = extractLawCitations(document, i)
      if (lawCitations.length > 0) {
        citation = lawCitations[0]
        // If there are additional citations, add them after the main loop
        if (lawCitations.length > 1) {
          for (let j = 1; j < lawCitations.length; j++) {
            lawCitations[j].document = document
            citations.push(lawCitations[j])
          }
        }
      }
    }
    // CASE 3: Token is a JournalCitationToken
    else if (token instanceof JournalCitationToken) {
      citation = extractJournalCitation(document, i)
    }
    // CASE 4: Token is an IdLawToken
    else if (token instanceof IdLawToken) {
      citation = extractIdLawCitation(document.words, i)
    }
    // CASE 5: Token is an Id citation
    else if (token instanceof IdToken) {
      citation = extractIdCitation(document.words, i)
    }
    // CASE 6: Token is a Supra citation
    else if (token instanceof SupraToken) {
      citation = extractSupraCitation(document.words, i)
    }
    // CASE 7: Token is a Section token
    else if (token instanceof SectionToken) {
      citation = new UnknownCitation(token, i)
    }
    // CASE 8: Token is a DOLOpinionToken
    else if (token instanceof DOLOpinionToken) {
      citation = new DOLOpinionCitation(token, i)
    }
    // CASE 9: Not a citation
    else {
      continue
    }

    if (citation) {
      citation.document = document
      citations.push(citation)
    }
  }

  // Handle parallel citations - share metadata from the last citation in a group
  handleParallelCitations(citations)

  // Filter citations first (before adding references)
  let filteredCitations = filterCitations(citations)

  // After filtering, extract reference citations from markup
  if (document.markupText) {
    const fullCitations = filteredCitations.filter(
      (c) => c instanceof FullCaseCitation,
    ) as FullCaseCitation[]
    const references = findReferenceCitationsFromMarkup(document, fullCitations)

    // Add references and filter again to handle any new overlaps
    if (references.length > 0) {
      filteredCitations.push(...references)
      filteredCitations = filterCitations(filteredCitations)
    }
  }

  if (removeAmbiguous) {
    filteredCitations = disambiguateReporters(filteredCitations)
  }
  
  // Handle overlapping citations based on user preference
  if (overlap !== 'all') {
    filteredCitations = handleOverlappingCitations(filteredCitations, overlap)
  }

  return filteredCitations
}

/**
 * Handle overlapping citations based on user preference
 */
function handleOverlappingCitations(
  citations: CitationBase[],
  handling: OverlapHandling
): CitationBase[] {
  if (citations.length === 0) return citations
  
  // Sort citations by start position, then by length (longer first)
  const sortedCitations = [...citations].sort((a, b) => {
    const spanA = a.span()
    const spanB = b.span()
    if (spanA.start !== spanB.start) {
      return spanA.start - spanB.start
    }
    return (spanB.end - spanB.start) - (spanA.end - spanA.start)
  })
  
  const result: CitationBase[] = []
  const processedIndices = new Set<number>()
  
  for (let i = 0; i < sortedCitations.length; i++) {
    if (processedIndices.has(i)) continue
    
    const citation = sortedCitations[i]
    const span = citation.span()
    
    // Find all citations that overlap with this one
    const overlapping: number[] = []
    for (let j = i + 1; j < sortedCitations.length; j++) {
      const otherSpan = sortedCitations[j].span()
      
      // Check if other citation is completely contained within this one
      if (otherSpan.start >= span.start && otherSpan.end <= span.end) {
        overlapping.push(j)
      }
    }
    
    if (overlapping.length > 0) {
      // We have overlapping citations
      if (handling === 'parent-only') {
        // Keep only the parent (current citation)
        result.push(citation)
        // Mark children as processed
        overlapping.forEach(idx => processedIndices.add(idx))
      } else if (handling === 'children-only') {
        // Keep only the children
        overlapping.forEach(idx => {
          result.push(sortedCitations[idx])
          processedIndices.add(idx)
        })
        // Don't add the parent
      }
      processedIndices.add(i)
    } else {
      // No overlaps, keep the citation
      result.push(citation)
      processedIndices.add(i)
    }
  }
  
  // Sort result back to original order
  return result.sort((a, b) => a.span().start - b.span().start)
}

/**
 * Handle parallel citations by sharing metadata from the last citation in a group
 */
function handleParallelCitations(citations: CitationBase[]): void {
  // Group citations by their fullSpanStart
  const groups = new Map<number, FullCaseCitation[]>()

  for (const citation of citations) {
    if (citation instanceof FullCaseCitation && citation.fullSpanStart !== undefined) {
      const start = citation.fullSpanStart
      if (!groups.has(start)) {
        groups.set(start, [])
      }
      groups.get(start)?.push(citation)
    }
  }

  // For each group of parallel citations, share metadata from the last one
  for (const group of groups.values()) {
    if (group.length > 1) {
      const lastCitation = group[group.length - 1]

      // Share metadata from the last citation to all previous ones
      for (let i = 0; i < group.length - 1; i++) {
        const citation = group[i]

        // Share year if not already set
        if (!citation.year && lastCitation.year) {
          citation.year = lastCitation.year
          citation.metadata.year = lastCitation.metadata.year
        }

        // Share court if not already set
        if (!citation.metadata.court && lastCitation.metadata.court) {
          citation.metadata.court = lastCitation.metadata.court
        }

        // Share parenthetical if not already set
        if (!citation.metadata.parenthetical && lastCitation.metadata.parenthetical) {
          citation.metadata.parenthetical = lastCitation.metadata.parenthetical
        }
      }
    }
  }
}

/**
 * Extract reference citations that follow a full citation
 */
export function extractReferenceCitations(
  citation: ResourceCitation,
  document: Document,
): ReferenceCitation[] {
  if (document.plainText.length <= citation.span().end) {
    return []
  }

  if (!(citation instanceof FullCaseCitation)) {
    return []
  }

  const referenceCitations = extractPincitedReferenceCitations(citation, document.plainText)

  if (document.markupText) {
    // Extract references from markup emphasis tags
    referenceCitations.push(...findReferenceCitationsFromMarkup(document, [citation]))
  }

  return referenceCitations
}

/**
 * Extract reference citations with the name-pincite pattern
 */
function extractPincitedReferenceCitations(
  citation: FullCaseCitation,
  plainText: string,
): ReferenceCitation[] {
  const regexes: string[] = []

  // Build regexes for each name field
  for (const key of ['plaintiff', 'defendant', 'resolvedCaseNameShort', 'resolvedCaseName']) {
    const value = (citation.metadata as any)[key]
    if (value && isValidName(value)) {
      regexes.push(`(?<${key}>${escapeRegex(value)})`)
    }
  }

  if (regexes.length === 0) {
    return []
  }

  const pinCiteRe = referencePinCiteRe(regexes)
  const referenceCitations: ReferenceCitation[] = []
  const remainingText = plainText.slice(citation.span().end)
  const offset = citation.span().end

  const regex = new RegExp(pinCiteRe, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(remainingText)) !== null) {
    const [start, end] = [match.index, match.index + match[0].length]
    const matchedText = match[0]

    // Extract the pin cite from the groups
    const groups = match.groups || {}
    const pinCite = groups.pinCite?.replace(/^,?\s*(?:at\s+)?/, '').trim() // Remove leading comma, spaces, and "at"

    // Create metadata object with proper pin cite
    const metadata: any = {}
    if (pinCite) {
      metadata.pinCite = pinCite
    }

    // Add any matched case name fields to both groups and metadata
    for (const key of ['plaintiff', 'defendant', 'resolvedCaseNameShort', 'resolvedCaseName']) {
      if (groups[key]) {
        metadata[key] = groups[key]
      }
    }

    const reference = new ReferenceCitation(
      new CaseReferenceToken(
        matchedText,
        start + offset,
        end + offset,
        groups, // Pass groups to the token constructor
      ),
      0, // index
      metadata, // Pass metadata as third parameter
      start + offset, // spanStart
      end + offset, // spanEnd
      start + offset, // fullSpanStart
      end + offset, // fullSpanEnd
    )

    referenceCitations.push(reference)
  }

  return referenceCitations
}

/**
 * Extract a full citation from the document
 */
function extractFullCitation(document: Document, index: number): FullCitation {
  const token = document.words[index] as CitationToken

  // Determine citation sources
  const citeSources = new Set<string>()
  const editions = token.exactEditions.length > 0 ? token.exactEditions : token.variationEditions

  for (const edition of editions) {
    citeSources.add(edition.reporter.source)
  }

  // Determine citation class based on sources
  let CitationClass: any

  if (citeSources.has('reporters')) {
    CitationClass = FullCaseCitation
  } else if (citeSources.has('laws')) {
    CitationClass = FullLawCitation
  } else if (citeSources.has('journals')) {
    CitationClass = FullJournalCitation
  } else {
    throw new Error(`Unknown cite_sources value ${Array.from(citeSources)}`)
  }

  // Create citation
  const citation = new CitationClass(token, index, token.exactEditions, token.variationEditions)

  citation.addMetadata(document)

  return citation
}



/**
 * Extract a short form citation from the document
 */
function extractShortformCitation(document: Document, index: number): ShortCaseCitation {
  const citeToken = document.words[index] as CitationToken

  // For short citations, the page IS the pin cite
  let pinCite = citeToken.groups.page
  let spanEnd = citeToken.end
  let parenthetical: string | undefined

  // For short citations containing "at", we already have the pin cite
  // But we need to check for page range continuation and parentheticals
  if (String(citeToken).includes(' at ')) {
    // Build text after the citation token to look for parentheticals
    let afterText = ''
    for (let i = index + 1; i < Math.min(document.words.length, index + 15); i++) {
      afterText += String(document.words[i])
    }

    // Check if the page continues with a range (e.g., "20" followed by "-25")
    const rangeMatch = afterText.match(/^[-–—](\d+)/)
    if (rangeMatch) {
      // Update pin cite to include the full range
      pinCite = `${pinCite}-${rangeMatch[1]}`
      spanEnd = citeToken.end + rangeMatch[0].length
      // Update afterText to skip the range part
      afterText = afterText.substring(rangeMatch[0].length)
    }

    // Look for parenthetical with potential nesting
    const parenMatch = afterText.match(/^\s*\(/)
    if (parenMatch) {
      // Find the balanced closing parenthesis
      let parenCount = 1
      let i = parenMatch[0].length
      let parenContent = ''

      while (i < afterText.length && parenCount > 0) {
        const char = afterText[i]
        if (char === '(') {
          parenCount++
        } else if (char === ')') {
          parenCount--
          if (parenCount === 0) break
        }
        parenContent += char
        i++
      }

      if (parenCount === 0) {
        parenthetical = parenContent
        spanEnd = spanEnd + parenMatch[0].length + parenContent.length + 1 // +1 for closing paren
      }
    }
  } else {
    // For other short citations, use extractPinCite
    const [additionalPinCite, additionalSpanEnd, additionalParenthetical] = extractPinCite(
      document.words,
      index,
      '', // Don't pass the page as prefix
    )

    // If we found additional pin cite info, use it
    if (additionalPinCite) {
      pinCite = additionalPinCite
    }
    if (additionalSpanEnd) {
      spanEnd = additionalSpanEnd
    }
    parenthetical = additionalParenthetical
  }

  const citation = new ShortCaseCitation(
    citeToken,
    index,
    citeToken.exactEditions,
    citeToken.variationEditions,
    {
      pinCite,
      parenthetical,
    },
  )
  
  // Set span properties after construction
  citation.spanEnd = spanEnd
  citation.fullSpanStart = citeToken.start // short citations don't include case names, so fullSpanStart = spanStart
  citation.fullSpanEnd = spanEnd

  if (document.markupText) {
    findCaseNameInHtml(citation as CaseCitation, document, true)
    if (!citation.metadata.antecedentGuess) {
      findCaseName(citation as CaseCitation, document, true)
    }
  } else {
    findCaseName(citation as CaseCitation, document, true)
  }

  // After finding case name, adjust fullSpanStart if it was changed
  // For short citations, fullSpanStart should not extend beyond the citation itself
  if (citation.fullSpanStart !== undefined && citation.fullSpanStart < citeToken.start) {
    citation.fullSpanStart = citeToken.start
  }

  // Add metadata
  citation.guessEdition()
  citation.guessCourt()

  return citation
}

/**
 * Extract a supra citation from the document
 */
function extractSupraCitation(words: Tokens, index: number): SupraCitation {
  // For supra citations, we need simpler pin cite extraction
  // Look for patterns like ", at 2" or ", at 2-3" after supra
  let pinCite: string | undefined
  const indexToken = words[index]
  let spanEnd = typeof indexToken === 'string' ? 0 : indexToken.end
  let parenthetical: string | undefined

  // Build text after supra token
  let afterText = ''
  for (let i = index + 1; i < Math.min(words.length, index + 10); i++) {
    afterText += String(words[i])
  }

  // Match pin cite patterns
  const pinCiteMatch = afterText.match(/^,?\s*((?:at\s+)?\d+(?:[-–—]\d+)?(?:\s*[&,]\s*\d+(?:[-–—]\d+)?)*)/)
  if (pinCiteMatch?.[1]) {
    pinCite = pinCiteMatch[1].trim()
    spanEnd = (typeof indexToken === 'string' ? 0 : indexToken.end) + pinCiteMatch[0].length

    // Check for parenthetical after pin cite
    const remainingText = afterText.substring(pinCiteMatch[0].length)
    const parenMatch = remainingText.match(/^\s*\(([^)]+)\)/)
    if (parenMatch) {
      parenthetical = parenMatch[1]
      spanEnd += parenMatch[0].length
    }
  } else {
    // No pin cite, just check for parenthetical
    const parenMatch = afterText.match(/^\s*\(([^)]+)\)/)
    if (parenMatch) {
      parenthetical = parenMatch[1]
      spanEnd = (typeof indexToken === 'string' ? 0 : indexToken.end) + parenMatch[0].length
    }
  }
  let antecedentGuess: string | undefined
  let volume: string | undefined
  let antecedentLength = 0

  // Look backward for antecedent and/or volume
  // Simple approach: look for pattern like "Foo" or "Foo, 123" before supra
  if (index > 0) {
    // Build text from previous tokens
    let lookback = ''
    let tokenCount = 0
    for (let i = index - 1; i >= Math.max(0, index - 5); i--) {
      const token = words[i]
      const tokenStr = String(token)

      // Skip whitespace-only tokens at the beginning
      if (tokenStr.trim() === '' && lookback === '') continue

      lookback = tokenStr + lookback
      tokenCount++

      // Stop after a reasonable amount
      if (tokenCount >= 3 || lookback.length > 30) break
    }

    // Try to extract antecedent and volume from lookback text
    // Match patterns like "Foo, 123 " or "Foo, " or "123 " or "Foo "
    const patterns = [
      /(\w[\w\-.]*),?\s+(\d+)\s*$/, // word, optional comma, volume
      /(\d+)\s*$/, // just volume
      /(\w[\w\-.]*),?\s*$/, // just word with optional comma
    ]

    for (const pattern of patterns) {
      const m = lookback.match(pattern)
      if (m) {
        if (m[2]) {
          // Both antecedent and volume
          antecedentGuess = m[1]
          volume = m[2]
        } else if (/^\d+$/.test(m[1])) {
          // Just volume
          volume = m[1]
        } else {
          // Just antecedent
          antecedentGuess = m[1]
        }
        antecedentLength = m[0].length
        break
      }
    }
  }

  const supraToken = words[index] as SupraToken

  return new SupraCitation(
    supraToken,
    index,
    {
      antecedentGuess,
      pinCite,
      parenthetical,
      volume,
    },
    undefined, // spanStart
    spanEnd, // spanEnd
    supraToken.start - antecedentLength, // fullSpanStart
    spanEnd || (typeof supraToken === 'string' ? 0 : supraToken.end), // fullSpanEnd
  )
}

/**
 * Extract an id law citation from the document
 */
function extractIdLawCitation(words: Tokens, index: number): IdLawCitation {
  const idLawToken = words[index] as IdLawToken
  let parenthetical: string | undefined
  let spanEnd = idLawToken.end

  // Build text after token
  let afterText = ''
  for (let i = index + 1; i < Math.min(words.length, index + 10); i++) {
    afterText += String(words[i])
  }

  // Check for parenthetical
  const parenMatch = afterText.match(/^\s*\(([^)]+)\)/)
  if (parenMatch) {
    parenthetical = parenMatch[1]
    spanEnd = idLawToken.end + parenMatch[0].length
  }

  return new IdLawCitation(
    idLawToken,
    index,
    {
      parenthetical,
    },
    undefined, // spanStart
    spanEnd, // spanEnd
    idLawToken.start, // fullSpanStart
    spanEnd, // fullSpanEnd
  )
}

/**
 * Extract an id citation from the document
 */
function extractIdCitation(words: Tokens, index: number): IdCitation {
  // Similar to supra citations, we need simpler pin cite extraction
  let pinCite: string | undefined
  const indexToken = words[index]
  let spanEnd = (typeof indexToken === 'string' ? 0 : indexToken.end)
  let parenthetical: string | undefined

  // Build text after id token
  let afterText = ''
  for (let i = index + 1; i < Math.min(words.length, index + 10); i++) {
    afterText += String(words[i])
  }

  // Match pin cite patterns - including section references
  const pinCiteMatch = afterText.match(/^\s*((?:§\s*[\d.]+(?:\([a-zA-Z0-9]+\))*(?:\(\d+\))*)|(?:at\s+)?\d+(?:[-–—]\d+)?(?:\s*[&,]\s*\d+(?:[-–—]\d+)?)*)/)
  if (pinCiteMatch?.[1]) {
    pinCite = pinCiteMatch[1].trim()
    spanEnd = (typeof indexToken === 'string' ? 0 : indexToken.end) + pinCiteMatch[0].length

    // Check for parenthetical after pin cite
    const remainingText = afterText.substring(pinCiteMatch[0].length)
    const parenMatch = remainingText.match(/^\s*\(([^)]+)\)/)
    if (parenMatch) {
      parenthetical = parenMatch[1]
      spanEnd += parenMatch[0].length
    }
  } else {
    // No pin cite, just check for parenthetical
    const parenMatch = afterText.match(/^\s*\(([^)]+)\)/)
    if (parenMatch) {
      parenthetical = parenMatch[1]
      spanEnd = (typeof indexToken === 'string' ? 0 : indexToken.end) + parenMatch[0].length
    }
  }

  const idToken = words[index] as IdToken
  
  // Check if the token already has a page from ID_AT_PAGE_REGEX
  if (idToken.groups.page && !pinCite) {
    pinCite = `at ${idToken.groups.page}`
  }
  
  return new IdCitation(
    idToken,
    index,
    {
      pinCite,
      parenthetical,
    },
    undefined, // spanStart
    spanEnd, // spanEnd
    idToken.start, // fullSpanStart - start from the beginning of "Id."
    spanEnd, // fullSpanEnd - end after pin cite/parenthetical if present
  )
}

/**
 * Extract law citations from the document, handling multiple sections indicated by §§
 */
function extractLawCitations(document: Document, index: number): FullLawCitation[] {
  const token = document.words[index] as LawCitationToken
  const sourceText = document.sourceText || ''

  // Check if the original text contains §§ (multiple sections marker)
  const tokenStart = token.start
  const tokenEnd = token.end
  const tokenText = sourceText.substring(tokenStart, tokenEnd)

  // Look for §§ pattern in the token and following text
  const beforeToken = sourceText.substring(Math.max(0, tokenStart - 20), tokenStart)
  const afterToken = sourceText.substring(tokenEnd, Math.min(sourceText.length, tokenEnd + 200))
  const contextText = beforeToken + tokenText + afterToken

  // For law citations, we keep them as single citations even with multiple sections
  // The tokenizer already captures the full citation correctly
  return [extractLawCitation(document, index)]
}

/**
 * Extract multiple law citations when §§ is present
 */
function extractMultipleLawCitations(document: Document, index: number): FullLawCitation[] {
  const token = document.words[index] as LawCitationToken
  const sourceText = document.sourceText || ''
  const tokenEnd = token.end

  const citations: FullLawCitation[] = []

  // Check if the token's section field already contains multiple sections
  const tokenSection = token.groups?.section || ''
  if (tokenSection.includes(',') || tokenSection.includes(';')) {
    // Handle case where tokenizer already captured multiple sections
    return extractFromTokenizedSections(document, index, tokenSection)
  }

  // Get the text after the token to find additional sections
  const afterToken = sourceText.substring(tokenEnd, Math.min(sourceText.length, tokenEnd + 200))

  // Improved pattern to match additional sections with better handling
  // Matches: ", 778.114 (the FWW method)" or "; 778.114 (method B)" or ", 1985(3)" or just ", 778.114"
  // Handles section parentheticals (like "(3)") vs descriptive parentheticals
  const additionalSectionsPattern = /[,;]\s*(\d+(?:\.[a-zA-Z0-9]+)*(?:\([a-zA-Z0-9]+\))*)\s*(?:\(([^)]+(?:\([^)]*\)[^)]*)*)\))?/g

  // First, create the initial citation
  const baseCitation = extractLawCitation(document, index)
  citations.push(baseCitation)

  // Then look for additional sections
  let match: RegExpExecArray | null
  while ((match = additionalSectionsPattern.exec(afterToken)) !== null) {
    let sectionNumber = match[1]
    let parenthetical = match[2]
    
    // Check if the parenthetical looks like it's part of the section number
    // (short, alphanumeric only) vs a descriptive parenthetical
    if (parenthetical && /^[a-zA-Z0-9]+$/.test(parenthetical) && parenthetical.length <= 3) {
      // This is likely part of the section number (e.g., "1985(3)")
      sectionNumber = `${sectionNumber}(${parenthetical})`
      parenthetical = undefined
    }

    // Create clean matched text without leading comma and whitespace
    const cleanMatchedText = sectionNumber + (parenthetical ? ` (${parenthetical})` : '')

    // Create a new citation token for the additional section
    const additionalToken = new LawCitationToken(
      cleanMatchedText, // Clean text without leading comma
      tokenEnd + match.index + match[0].indexOf(sectionNumber), // Start at section number
      tokenEnd + match.index + match[0].length, // End position
      {
        reporter: token.groups?.reporter || token.reporter,
        lawType: token.lawType,
        chapter: token.groups?.chapter,
        section: sectionNumber,
        title: token.groups?.title,
      },
      {
        reporter: token.reporter,
        lawType: token.lawType,
      },
    )

    // Create the additional citation
    const additionalCitation = new FullLawCitation(
      additionalToken,
      index, // Same index as original
      [], // exactEditions
      [], // variationEditions
    )

    // Copy metadata from base citation
    additionalCitation.metadata.reporter = baseCitation.metadata.reporter
    additionalCitation.metadata.chapter = baseCitation.metadata.chapter
    additionalCitation.metadata.section = sectionNumber
    additionalCitation.metadata.title = baseCitation.metadata.title
    additionalCitation.metadata.year = baseCitation.metadata.year
    additionalCitation.metadata.month = baseCitation.metadata.month
    additionalCitation.metadata.day = baseCitation.metadata.day
    additionalCitation.metadata.publisher = baseCitation.metadata.publisher

    // Set the parenthetical if found and it's descriptive
    if (parenthetical) {
      additionalCitation.metadata.parenthetical = parenthetical
    }

    // Copy groups
    additionalCitation.groups = {
      reporter: baseCitation.groups?.reporter || token.reporter,
      chapter: baseCitation.groups?.chapter,
      section: sectionNumber,
      title: baseCitation.groups?.title,
    }

    // Set year if available
    if (baseCitation.year) {
      additionalCitation.year = baseCitation.year
    }

    citations.push(additionalCitation)
  }

  return citations
}

/**
 * Extract multiple law citations when the tokenizer has already captured multiple sections
 */
function extractFromTokenizedSections(document: Document, index: number, sectionsText: string): FullLawCitation[] {
  const token = document.words[index] as LawCitationToken
  const citations: FullLawCitation[] = []


  // Split the sections by comma or semicolon, handling various formats
  const sectionParts = sectionsText.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0)
  
  for (let i = 0; i < sectionParts.length; i++) {
    const sectionPart = sectionParts[i]
    
    // Parse section number and any parenthetical  
    let sectionNumber = sectionPart
    let parenthetical: string | undefined
    
    // Check for parenthetical - could be subsection or descriptive
    const parenMatch = sectionPart.match(/^([^(]+)\s*\(([^)]+)\)$/)
    if (parenMatch) {
      const potentialSection = parenMatch[1].trim()
      const potentialParenthetical = parenMatch[2]
      
      // If parenthetical is short and alphanumeric, it's likely part of section number (subsection)
      // If it's long or contains spaces/punctuation, it's a descriptive parenthetical
      if (/^[a-zA-Z0-9()]+$/.test(potentialParenthetical) && potentialParenthetical.length <= 10) {
        // This is likely part of the section number (e.g., "1985(3)")
        sectionNumber = sectionPart // Keep as-is with subsection
        parenthetical = undefined
      } else {
        // This is a descriptive parenthetical
        sectionNumber = potentialSection
        parenthetical = potentialParenthetical
      }
    }
    
    // For all citations, we need to find their actual positions in the text
    let sectionStart: number
    let sectionEnd: number
    
    // Try to find the actual position of this section in the source text
    const sourceText = document.sourceText || ''
    const searchStart = token.start
    const searchEnd = Math.min(token.end + 50, sourceText.length) // Look a bit beyond token end
    const searchText = sourceText.substring(searchStart, searchEnd)
    
    // Look for this section number in the text
    const sectionIndex = searchText.indexOf(sectionNumber)
    if (sectionIndex !== -1) {
      // Found the actual position
      sectionStart = searchStart + sectionIndex
      sectionEnd = sectionStart + sectionNumber.length
      
      // If there's a parenthetical, include it
      if (parenthetical) {
        const parenText = ` (${parenthetical})`
        if (sourceText.substring(sectionEnd, sectionEnd + parenText.length) === parenText) {
          sectionEnd += parenText.length
        }
      }
    } else {
      // Fallback: for the first section, use the original token position
      // for others, skip them as we can't find them
      if (i === 0) {
        sectionStart = token.start
        sectionEnd = token.end
      } else {
        continue // Skip this section if we can't find it
      }
    }
    
    // Create a new token for this section
    const sectionToken = new LawCitationToken(
      sectionNumber + (parenthetical ? ` (${parenthetical})` : ''),
      sectionStart, // Non-overlapping start position
      sectionEnd,   // Non-overlapping end position
      {
        reporter: token.groups?.reporter || token.reporter,
        lawType: token.lawType,
        chapter: token.groups?.chapter,
        section: sectionNumber,
        title: token.groups?.title,
      },
      {
        reporter: token.reporter,
        lawType: token.lawType,
      },
    )
    
    // Create the citation
    const citation = new FullLawCitation(
      sectionToken,
      index,
      [], // exactEditions
      [], // variationEditions
    )
    
    // Set metadata
    citation.metadata.reporter = token.reporter
    citation.metadata.chapter = token.groups?.chapter
    citation.metadata.section = sectionNumber
    citation.metadata.title = token.groups?.title
    
    if (parenthetical) {
      citation.metadata.parenthetical = parenthetical
    }
    
    // Set groups
    citation.groups = {
      reporter: token.reporter,
      chapter: token.groups?.chapter,
      section: sectionNumber,
      title: token.groups?.title,
    }
    
    citations.push(citation)
  }
  
  return citations
}

/**
 * Extract a law citation from the document
 */
function extractLawCitation(document: Document, index: number): FullLawCitation {
  const token = document.words[index] as LawCitationToken

  // Create the law citation with metadata from the token
  const citation = new FullLawCitation(
    token,
    index,
    [], // exactEditions (not used for law citations)
    [], // variationEditions (not used for law citations)
  )

  // Set the document so we can access source text
  citation.document = document

  // Set the reporter from the token
  citation.metadata.reporter = token.reporter

  // Extract metadata from token groups
  if (token.groups) {
    // Store all groups on the citation
    citation.groups = { ...token.groups }

    // Chapter, section, title
    citation.metadata.chapter = token.groups.chapter
    citation.metadata.section = token.groups.section
    citation.metadata.title = token.groups.title

    // Year, month, day
    if (token.groups.year) {
      citation.metadata.year = parseInt(token.groups.year)
      citation.year = parseInt(token.groups.year)
    }
    citation.metadata.month = token.groups.month
    citation.metadata.day = token.groups.day

    // Publisher - handle separately from parentheticals
    citation.metadata.publisher = token.groups.publisher
  }

  // Check if the token already captured year/publisher from groups
  if (token.groups.year && !citation.year) {
    citation.year = parseInt(token.groups.year)
    citation.metadata.year = citation.year
  }
  if (token.groups.publisher && !citation.metadata.publisher) {
    citation.metadata.publisher = token.groups.publisher
  }

  // Check if we need to extract subsections and parentheticals from after the token
  const sourceText = citation.document?.sourceText || ''
  const tokenEnd = token.end

  // Only process what's after the token if there's more text
  if (tokenEnd < sourceText.length) {
    const afterToken = sourceText.substring(tokenEnd)

    // Extract subsections like (a)(2) immediately after the section number
    const subsectionMatch = afterToken.match(/^((?:\([a-zA-Z0-9]+\))+)/)
    if (subsectionMatch) {
      citation.metadata.pinCite = subsectionMatch[1]
    }

    // Handle "and" connections like "(a)(2) and (d)"
    const andMatch = afterToken.match(/^((?:\([a-zA-Z0-9]+\))+)\s+and\s+((?:\([a-zA-Z0-9]+\))+)/)
    if (andMatch) {
      citation.metadata.pinCite = `${andMatch[1]} and ${andMatch[2]}`
    }

    // Extract parenthetical information that wasn't captured by the token
    // Look for all parentheticals in the remaining text
    // Skip subsection parentheses by starting after them
    let searchStart = 0
    if (subsectionMatch || andMatch) {
      const pinCiteLength = citation.metadata.pinCite?.length || 0
      searchStart = pinCiteLength
    }

    const searchText = afterToken.substring(searchStart)
    const parenPattern = /\(([^)]+)\)/g
    let match: RegExpExecArray | null
    const parentheticals = []
    while ((match = parenPattern.exec(searchText)) !== null) {
      parentheticals.push(match[1])
    }

    // Process parentheticals
    for (const paren of parentheticals) {
      // Check if it's a year (with optional year range)
      const yearMatch = paren.match(/^(\d{4})(?:-(\d{2,4}))?$/)
      if (yearMatch && !citation.year) {
        citation.year = parseInt(yearMatch[1])
        citation.metadata.year = citation.year
        continue
      }

      // Check if it's publisher + year
      const pubYearMatch = paren.match(/^([A-Z][a-z]+\.?(?:\s+Supp\.)?)\s+(\d{4})$/)
      if (pubYearMatch && !citation.metadata.publisher) {
        citation.metadata.publisher = pubYearMatch[1]
        if (!citation.year) {
          citation.year = parseInt(pubYearMatch[2])
          citation.metadata.year = citation.year
        }
        continue
      }

      // Otherwise it's a parenthetical (like "repealed")
      if (!citation.metadata.parenthetical && !yearMatch && !pubYearMatch) {
        citation.metadata.parenthetical = paren
      }
    }
  }

  // Handle "et seq." if it's in the token data but not yet in pinCite
  if (token.data.includes('et seq.') && !citation.metadata.pinCite?.includes('et seq.')) {
    const existingPinCite = citation.metadata.pinCite || ''
    citation.metadata.pinCite = existingPinCite ? `${existingPinCite} et seq.` : 'et seq.'
  }

  return citation
}

/**
 * Extract a journal citation from the document
 */
function extractJournalCitation(document: Document, index: number): FullJournalCitation {
  const token = document.words[index] as JournalCitationToken

  // Create the journal citation
  const citation = new FullJournalCitation(
    token,
    index,
    [], // exactEditions (not used for journal citations)
    [], // variationEditions (not used for journal citations)
  )

  // Set journal metadata
  citation.metadata.journal = token.journal
  citation.metadata.journalName = token.journalName

  // Extract metadata from token groups
  if (token.groups) {
    citation.metadata.volume = token.groups.volume
    citation.metadata.page = token.groups.page

    // Pin cite is captured in the regex
    if (token.groups.pinCite) {
      citation.metadata.pinCite = token.groups.pinCite
    }

    // Year is captured in the regex
    if (token.groups.year) {
      const yearStr = token.groups.year

      // Parse and validate year range
      const yearRangeResult = parseYearRange(yearStr)
      if (yearRangeResult.isValid && yearRangeResult.startYear) {
        citation.year = yearRangeResult.startYear
        citation.metadata.year = citation.year
        citation.metadata.yearRange = yearStr

        // Add end year if it's a range
        if (yearRangeResult.endYear && yearRangeResult.endYear !== yearRangeResult.startYear) {
          citation.metadata.endYear = yearRangeResult.endYear
        }
      } else {
        // Fallback to original logic for invalid ranges
        const firstYearMatch = yearStr.match(/^(\d{4})/)
        if (firstYearMatch) {
          citation.year = parseInt(firstYearMatch[1])
          citation.metadata.year = citation.year
        }
        citation.metadata.yearRange = yearStr
        // Add warning for invalid year range
        if (!citation.metadata.warnings) {
          citation.metadata.warnings = []
        }
        citation.metadata.warnings.push(`Invalid year range format: ${yearStr}`)
      }
    }

    // Look for parenthetical after the citation (if not a year)
    let afterText = ''
    let afterStart = token.end
    for (let i = index + 1; i < Math.min(document.words.length, index + 10); i++) {
      afterText += String(document.words[i])
    }

    // Check for parenthetical (only if we don't already have a year)
    if (!token.groups.year) {
      const parenMatch = afterText.match(/^\s*\(([^)]+)\)/)
      if (parenMatch) {
        // Check if it's a year or a parenthetical
        const yearMatch = parenMatch[1].match(/^(\d{4}(?:-\d{2,4})?)$/)
        if (yearMatch) {
          const yearStr = yearMatch[1]

          // Parse and validate year range
          const yearRangeResult = parseYearRange(yearStr)
          if (yearRangeResult.isValid && yearRangeResult.startYear) {
            citation.year = yearRangeResult.startYear
            citation.metadata.year = citation.year
            citation.metadata.yearRange = yearStr

            // Add end year if it's a range
            if (yearRangeResult.endYear && yearRangeResult.endYear !== yearRangeResult.startYear) {
              citation.metadata.endYear = yearRangeResult.endYear
            }
          } else {
            // Fallback to original logic
            const firstYearMatch = yearStr.match(/^(\d{4})/)
            if (firstYearMatch) {
              citation.year = parseInt(firstYearMatch[1])
              citation.metadata.year = citation.year
            }
            citation.metadata.yearRange = yearStr
            // Add warning for invalid year range
            if (!citation.metadata.warnings) {
              citation.metadata.warnings = []
            }
            citation.metadata.warnings.push(`Invalid year range format: ${yearStr}`)
          }
        } else {
          citation.metadata.parenthetical = parenMatch[1]
        }
        afterStart += parenMatch[0].length
      }
    } else {
      // Check for parenthetical after year
      const parenMatch = afterText.match(/^\s*\(([^)]+)\)/)
      if (parenMatch) {
        citation.metadata.parenthetical = parenMatch[1]
        afterStart += parenMatch[0].length
      }
    }

    // Update span to include additional metadata
    if (afterStart > token.end) {
      citation.spanEnd = afterStart
      citation.fullSpanEnd = afterStart
    }
  }

  return citation
}

/**
 * Enhanced citation validation with comprehensive date checking.
 * Validates citations against reporter editions with improved date range validation.
 *
 * @param citation - The citation to validate
 * @param editions - Available reporter editions
 * @returns Validation result with warnings and recommendations
 */
export function validateCitationDates(
  citation: FullCaseCitation,
  editions: Edition[],
): {
  isValid: boolean
  warnings: string[]
  suspiciousDateReasons: string[]
  recommendedEdition?: Edition
} {
  const warnings: string[] = []
  const suspiciousDateReasons: string[] = []
  let isValid = true
  let recommendedEdition: Edition | undefined

  // Skip validation if no year is available
  if (!citation.year) {
    return { isValid: true, warnings: [], suspiciousDateReasons: [] }
  }

  // Validate year range if present
  if (citation.metadata.yearRange) {
    const yearRangeResult = parseYearRange(citation.metadata.yearRange)
    if (!yearRangeResult.isValid) {
      warnings.push(`Invalid year range format: ${citation.metadata.yearRange}`)
      isValid = false
    } else if (yearRangeResult.startYear && yearRangeResult.endYear) {
      // Check if year range is reasonable (academic years are typically 1-2 years)
      const rangeSpan = yearRangeResult.endYear - yearRangeResult.startYear
      if (rangeSpan > 2) {
        suspiciousDateReasons.push(
          `Unusually long year range: ${citation.metadata.yearRange} (${rangeSpan + 1} years)`,
        )
      }
    }
  }

  // Check for suspicious years
  const currentYear = new Date().getFullYear()
  if (citation.year > currentYear + 1) {
    suspiciousDateReasons.push(`Future year: ${citation.year}`)
    isValid = false
  } else if (citation.year < 1600) {
    suspiciousDateReasons.push(`Very old year: ${citation.year}`)
  } else if (citation.year > currentYear) {
    suspiciousDateReasons.push(`Recent future year: ${citation.year}`)
  }

  // Filter editions that match the citation year
  let validEditions = editions
  if (citation.metadata.yearRange) {
    validEditions = editions.filter((edition) =>
      includesYearRange(edition, citation.metadata.yearRange!),
    )
  } else {
    validEditions = editions.filter((edition) => includesYear(edition, citation.year!))
  }

  if (validEditions.length === 0) {
    warnings.push(`No reporter edition found for year ${citation.year}`)
    isValid = false

    // Find the closest edition by date
    let closestEdition: Edition | undefined
    let smallestGap = Infinity

    for (const edition of editions) {
      if (edition.start) {
        const startYear = edition.start.getFullYear()
        const gap = Math.abs(startYear - citation.year)
        if (gap < smallestGap) {
          smallestGap = gap
          closestEdition = edition
        }
      }
      if (edition.end) {
        const endYear = edition.end.getFullYear()
        const gap = Math.abs(endYear - citation.year)
        if (gap < smallestGap) {
          smallestGap = gap
          closestEdition = edition
        }
      }
    }

    if (closestEdition) {
      recommendedEdition = closestEdition
      warnings.push(
        `Closest edition: ${closestEdition.shortName || closestEdition.reporter.shortName}`,
      )
    }
  } else if (validEditions.length === 1) {
    recommendedEdition = validEditions[0]
  } else {
    // Multiple valid editions - prefer the most recent start date
    recommendedEdition = validEditions.reduce((best, current) => {
      const bestStart = best.start?.getTime() || 0
      const currentStart = current.start?.getTime() || 0
      return currentStart > bestStart ? current : best
    })
  }

  // Validate month/day information if present in court or other fields
  if (citation.metadata.court) {
    const dateValidation = validateDateComponents(citation.metadata.court)
    if (dateValidation.warnings.length > 0) {
      warnings.push(...dateValidation.warnings.map((w) => `Court field: ${w}`))
    }
  }

  return {
    isValid,
    warnings,
    suspiciousDateReasons,
    recommendedEdition,
  }
}

/**
 * Find reference citations from HTML markup emphasis tags
 */
export function findReferenceCitationsFromMarkup(
  document: Document,
  citations: FullCaseCitation[],
): ReferenceCitation[] {
  const references: ReferenceCitation[] = []

  if (!document.plainText || !document.emphasisTags) {
    return references
  }

  // Keep track of which positions we've already used to avoid duplicates
  const usedPositions = new Set<number>()

  // Process each emphasis tag
  for (const [tagText, _tagStart, _tagEnd] of document.emphasisTags) {
    // Skip tags that contain full case names (with v. or v)
    if (tagText.includes(' v. ') || tagText.includes(' v ')) continue

    // Skip reporter abbreviations like "F.", "L.Ed.", "S.Ct." etc
    // But don't skip case names like "Halper." or "U.S." when it's a party name
    // Only skip common reporter abbreviations
    const reporterPattern = /^(F|L\.Ed|S\.Ct|U\.S|N\.E|N\.W|S\.E|S\.W|P|A|Cal|N\.Y|Ill|Tex|Ohio)\.$/
    if (tagText.match(reporterPattern)) continue

    // Skip "citing," and "and"
    if (tagText === 'citing,' || tagText === 'and') continue

    // Skip multi-word phrases that aren't case names
    if (tagText.includes(' ') && tagText !== 'ex post facto') {
      // Check if this matches any case name exactly
      const matchesCaseName = citations.some((c) => {
        return ReferenceCitation.nameFields.some((field) => {
          const value = (c.metadata as any)[field]
          return value && tagText.trim().replace(/[,.:;]+$/, '') === value.trim()
        })
      })
      if (!matchesCaseName) continue
    }

    // Clean the tag text for comparison
    const cleanTagText = tagText.trim().replace(/[,.:;]+$/, '')

    // For each citation, check if this tag matches any of its case names
    for (const citation of citations) {
      for (const nameField of ReferenceCitation.nameFields) {
        const value = (citation.metadata as any)[nameField]
        if (!value || !isValidName(value)) continue

        // Check if the tag matches this case name
        if (cleanTagText === value.trim()) {
          // Find all occurrences of this text in the plain text
          let searchStart = 0
          while (searchStart < document.plainText.length) {
            const plainTextIndex = document.plainText.indexOf(tagText, searchStart)
            if (plainTextIndex === -1) break

            // Must appear after the citation
            if (plainTextIndex <= citation.span().start) {
              searchStart = plainTextIndex + 1
              continue
            }

            // Skip if we've already used this position
            if (usedPositions.has(plainTextIndex)) {
              searchStart = plainTextIndex + 1
              continue
            }

            // Check what comes after - skip if it's followed by "v.", "supra", or a citation pattern
            const afterText = document.plainText.slice(plainTextIndex + tagText.length)
            // Skip if followed by supra or v.
            if (/^\s*,?\s*(v[.s]|supra)/.test(afterText)) {
              searchStart = plainTextIndex + 1
              continue
            }
            // Skip if followed by a reporter pattern (e.g., "Twombly, 550 U.S. 544")
            if (/^,?\s*\d+\s+[A-Z]/.test(afterText)) {
              searchStart = plainTextIndex + 1
              continue
            }
            // Skip if followed by "at" and a number with a parallel citation (e.g., "Nobelman at 332, 113 S.Ct.")
            if (/^\s+at\s+\d+(?:[-–—]\d+)?,\s*\d+\s+[A-Z]/.test(afterText)) {
              searchStart = plainTextIndex + 1
              continue
            }

            // Check what comes before - skip if it's part of "Bae's"
            if (plainTextIndex > 0) {
              const beforeChar = document.plainText[plainTextIndex - 1]
              const afterChar = document.plainText[plainTextIndex + cleanTagText.length]
              if (beforeChar && /\w/.test(beforeChar)) {
                searchStart = plainTextIndex + 1
                continue
              }
              if (afterChar === "'" || (afterChar && /\w/.test(afterChar))) {
                searchStart = plainTextIndex + 1
                continue
              }
            }

            // Check for pin cite after the emphasis tag
            let pinCite: string | undefined
            let fullSpanEnd = plainTextIndex + cleanTagText.length

            // Look for pin cite pattern after the tag
            const afterTagText = document.plainText.slice(plainTextIndex + cleanTagText.length)
            const pinCiteMatch = afterTagText.match(/^\s*(?:,\s*)?(at\s+\d+(?:[-–—]\d+)?)/i)

            if (pinCiteMatch) {
              pinCite = pinCiteMatch[1] // Capture "at 332" not just "332"
              fullSpanEnd = plainTextIndex + cleanTagText.length + pinCiteMatch[0].length
            }

            // Create the reference citation
            const metadata: any = { [nameField]: value }
            if (pinCite) {
              metadata.pinCite = pinCite
            }

            const reference = new ReferenceCitation(
              new CaseReferenceToken(
                cleanTagText, // Use clean text without punctuation
                plainTextIndex,
                plainTextIndex + cleanTagText.length,
              ),
              0, // index
              metadata,
              plainTextIndex, // spanStart
              plainTextIndex + cleanTagText.length, // spanEnd
              plainTextIndex, // fullSpanStart
              fullSpanEnd, // fullSpanEnd includes pin cite if present
            )

            references.push(reference)
            usedPositions.add(plainTextIndex)

            // Only create one reference per tag/citation pair at this position
            break
          }

          // Only match with the first matching field
          break
        }
      }
    }
  }

  return references
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
