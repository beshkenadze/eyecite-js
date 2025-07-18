import type {
  CaseCitation,
  CitationBase,
  Document,
  FullCitation,
  Tokens,
} from './models'
import {
  CaseReferenceToken,
  CitationToken,
  FullCaseCitation,
  FullJournalCitation,
  FullLawCitation,
  IdCitation,
  IdToken,
  LawCitationToken,
  JournalCitationToken,
  ReferenceCitation,
  type ResourceCitation,
  SectionToken,
  ShortCaseCitation,
  SupraCitation,
  SupraToken,
  UnknownCitation,
} from './models'
import { referencePinCiteRe } from './regexes'
import type { Tokenizer } from './tokenizers'
import { defaultTokenizer } from './tokenizers'
import {
  disambiguateReporters,
  extractPinCite,
  filterCitations,
  findCaseName,
  findCaseNameInHtml,
  isValidName,
} from './helpers'
import { jokeCite } from './constants'
import { placeholderMarkup } from './utils'
import { SpanUpdater, } from './span-updater'
import { cleanText } from './clean'
import { 
  parseYearRange, 
  includesYearRange, 
  validateDateComponents,
  includesYear,
  type Edition
} from './models/reporters'

/**
 * Identify emphasis tags in HTML markup
 * @param markupText The HTML markup text
 * @returns Array of [text, start, end] tuples for emphasis tags
 */
function identifyEmphasisTags(markupText: string): Array<[string, number, number]> {
  const pattern = /<(em|i|strong|b)[^>]*>(.*?)<\/\1>/gi
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
 * Main function to extract citations from text
 */
export function getCitations(
  plainText = '',
  removeAmbiguous = false,
  tokenizer: Tokenizer = defaultTokenizer,
  markupText = '',
  cleanSteps?: Array<string | ((text: string) => string)>,
): CitationBase[] {
  if (plainText === 'eyecite') {
    return jokeCite
  }

  // If no plainText but markupText is provided with cleanSteps, extract plainText
  if (!plainText && markupText && cleanSteps) {
    plainText = cleanText(markupText, cleanSteps)
  }

  // Create document object
  const document: Document = {
    plainText,
    markupText,
    cleanSteps,
    citationTokens: [],
    words: [],
    emphasisTags: [],
    sourceText: markupText || plainText,
    plainToMarkup: undefined,
    markupToPlain: undefined,
  }

  // Process markup text if provided
  if (markupText) {
    // Identify emphasis tags
    document.emphasisTags = identifyEmphasisTags(markupText)
    
    // Create SpanUpdaters for position mapping
    const placeholder = placeholderMarkup(markupText)
    document.plainToMarkup = new SpanUpdater(plainText, placeholder)
    document.markupToPlain = new SpanUpdater(markupText, plainText)
  }

  // Tokenize the document
  const [words, citationTokens] = tokenizer.tokenize(document.plainText)
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
    // CASE 4: Token is an Id citation
    else if (token instanceof IdToken) {
      citation = extractIdCitation(document.words, i)
    }
    // CASE 5: Token is a Supra citation
    else if (token instanceof SupraToken) {
      citation = extractSupraCitation(document.words, i)
    }
    // CASE 6: Token is a Section token
    else if (token instanceof SectionToken) {
      citation = new UnknownCitation(token, i)
    }
    // CASE 7: Not a citation
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
    const fullCitations = filteredCitations.filter(c => c instanceof FullCaseCitation) as FullCaseCitation[]
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

  return filteredCitations
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

  const referenceCitations = extractPincitedReferenceCitations(
    citation,
    document.plainText,
  )

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
  const editions = token.exactEditions.length > 0 
    ? token.exactEditions 
    : token.variationEditions
    
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
  const citation = new CitationClass(
    token,
    index,
    token.exactEditions,
    token.variationEditions,
  )
  
  citation.addMetadata(document)
  
  return citation
}

/**
 * Extract a short form citation from the document
 */
function extractShortformCitation(
  document: Document,
  index: number,
): ShortCaseCitation {
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
    const rangeMatch = afterText.match(/^-(\d+)/)
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
    undefined, // spanStart
    spanEnd, // spanEnd
    citeToken.start, // fullSpanStart - short citations don't include case names, so fullSpanStart = spanStart
    spanEnd, // fullSpanEnd
  )

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
  let spanEnd = words[index].end
  let parenthetical: string | undefined
  
  // Build text after supra token
  let afterText = ''
  for (let i = index + 1; i < Math.min(words.length, index + 10); i++) {
    afterText += String(words[i])
  }
  
  // Match pin cite patterns
  const pinCiteMatch = afterText.match(/^,?\s*((?:at\s+)?\d+(?:-\d+)?(?:\s*[&,]\s*\d+(?:-\d+)?)*)/)
  if (pinCiteMatch?.[1]) {
    pinCite = pinCiteMatch[1].trim()
    spanEnd = words[index].end + pinCiteMatch[0].length
    
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
      spanEnd = words[index].end + parenMatch[0].length
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
      /(\w[\w\-.]*),?\s+(\d+)\s*$/,  // word, optional comma, volume
      /(\d+)\s*$/,                    // just volume
      /(\w[\w\-.]*),?\s*$/,           // just word with optional comma
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
    spanEnd || supraToken.end, // fullSpanEnd
  )
}

/**
 * Extract an id citation from the document
 */
function extractIdCitation(words: Tokens, index: number): IdCitation {
  // Similar to supra citations, we need simpler pin cite extraction
  let pinCite: string | undefined
  let spanEnd = words[index].end
  let parenthetical: string | undefined
  
  // Build text after id token
  let afterText = ''
  for (let i = index + 1; i < Math.min(words.length, index + 10); i++) {
    afterText += String(words[i])
  }
  
  // Match pin cite patterns - same as supra
  const pinCiteMatch = afterText.match(/^\s*((?:at\s+)?\d+(?:-\d+)?(?:\s*[&,]\s*\d+(?:-\d+)?)*)/)
  if (pinCiteMatch?.[1]) {
    pinCite = pinCiteMatch[1].trim()
    spanEnd = words[index].end + pinCiteMatch[0].length
    
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
      spanEnd = words[index].end + parenMatch[0].length
    }
  }
  
  return new IdCitation(
    words[index] as IdToken,
    index,
    {
      pinCite,
      parenthetical,
    },
    undefined, // spanStart
    spanEnd, // spanEnd
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
  
  // If we find §§, we need to look for additional sections
  if (contextText.includes('§§')) {
    return extractMultipleLawCitations(document, index)
  }
  
  // Otherwise, extract just one citation
  return [extractLawCitation(document, index)]
}

/**
 * Extract multiple law citations when §§ is present
 */
function extractMultipleLawCitations(document: Document, index: number): FullLawCitation[] {
  const token = document.words[index] as LawCitationToken
  const sourceText = document.sourceText || ''
  const tokenEnd = token.end
  
  // Get the text after the token to find additional sections
  const afterToken = sourceText.substring(tokenEnd, Math.min(sourceText.length, tokenEnd + 200))
  
  // Pattern to match additional sections with optional parentheticals
  // Matches: ", 778.114 (the FWW method)" or just ", 778.114"
  const additionalSectionsPattern = /,\s*(\d+(?:\.\d+)*)\s*(?:\(([^)]+)\))?/g
  
  const citations: FullLawCitation[] = []
  
  // First, create the initial citation
  const baseCitation = extractLawCitation(document, index)
  citations.push(baseCitation)
  
  // Then look for additional sections
  let match
  while ((match = additionalSectionsPattern.exec(afterToken)) !== null) {
    const sectionNumber = match[1]
    const parenthetical = match[2]
    
    // Create a new citation token for the additional section
    const additionalToken = new LawCitationToken(
      match[0], // The matched text
      tokenEnd + match.index, // Start position
      tokenEnd + match.index + match[0].length, // End position
      {
        reporter: token.reporter,
        lawType: token.lawType,
        chapter: token.groups?.chapter,
        section: sectionNumber,
        title: token.groups?.title,
      },
      token.data
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
    
    // Set the parenthetical if found
    if (parenthetical) {
      additionalCitation.metadata.parenthetical = parenthetical
    }
    
    // Copy groups
    additionalCitation.groups = {
      reporter: baseCitation.groups?.reporter,
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
    let match
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
  editions: Edition[]
): {
  isValid: boolean;
  warnings: string[];
  suspiciousDateReasons: string[];
  recommendedEdition?: Edition;
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
        suspiciousDateReasons.push(`Unusually long year range: ${citation.metadata.yearRange} (${rangeSpan + 1} years)`)
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
    validEditions = editions.filter(edition => includesYearRange(edition, citation.metadata.yearRange!))
  } else {
    validEditions = editions.filter(edition => includesYear(edition, citation.year!))
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
      warnings.push(`Closest edition: ${closestEdition.shortName || closestEdition.reporter.shortName}`)
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
      warnings.push(...dateValidation.warnings.map(w => `Court field: ${w}`))
    }
  }
  
  return {
    isValid,
    warnings,
    suspiciousDateReasons,
    recommendedEdition
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
      const matchesCaseName = citations.some(c => {
        return ReferenceCitation.nameFields.some(field => {
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
            if (/^\s+at\s+\d+(?:-\d+)?,\s*\d+\s+[A-Z]/.test(afterText)) {
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
            const pinCiteMatch = afterTagText.match(/^\s*(?:,\s*)?(at\s+\d+(?:-\d+)?)/i)
            
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