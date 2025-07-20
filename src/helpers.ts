import { COURTS } from './data'
import type { CaseCitation, CitationBase, Document, Token, Tokens } from './models'
import {
  CitationToken,
  FullCaseCitation,
  type FullJournalCitation,
  type FullLawCitation,
  ParagraphToken,
  PlaceholderCitationToken,
  ResourceCitation,
  StopWordToken,
  SupraCitation,
} from './models'
import { parseYearRange } from './models/reporters'
import {
  MONTH_REGEX_INNER,
  POST_FULL_CITATION_REGEX,
  POST_JOURNAL_CITATION_REGEX,
  POST_LAW_CITATION_REGEX,
  POST_SHORT_CITATION_REGEX,
  PRE_FULL_CITATION_REGEX,
  STOP_WORD_REGEX,
  YEAR_REGEX,
} from './regexes'
import { bisectRight, type SpanUpdater } from './span-updater'

const BACKWARD_SEEK = 28 // Median case name length in the CL db is 28 (2016-02-26)
const MAX_MATCH_CHARS = 300

// Highest valid year is this year + 1 because courts in December sometimes
// cite a case to be published in January.
const highestValidYear = new Date().getFullYear() + 1

/**
 * Extract pin cite from tokens following an index
 */
export function extractPinCite(
  words: Tokens,
  index: number,
  prefix = '',
): [string | undefined, number | undefined, string | undefined] {
  const fromToken = words[index] as Token
  const m = matchOnTokens(words, index + 1, POST_SHORT_CITATION_REGEX, {
    prefix,
    stringsOnly: true,
  })

  if (m) {
    let pinCite: string | undefined
    let extraChars: number

    if (m.groups.pinCite) {
      pinCite = cleanPinCite(m.groups.pinCite)
      extraChars = m.groups.pinCite.trimEnd().replace(/[, ]+$/, '').length
    } else {
      pinCite = undefined
      extraChars = 0
    }

    const parenthetical = processParenthetical(m.groups.parenthetical)
    return [pinCite, fromToken.end + extraChars - prefix.length, parenthetical]
  }

  return [undefined, undefined, undefined]
}

/**
 * Match regex against tokens starting from an index
 */
export function matchOnTokens(
  words: Tokens,
  startIndex: number,
  regex: string,
  options: {
    prefix?: string
    stringsOnly?: boolean
    forward?: boolean
  } = {},
): RegExpMatchArray | null {
  const { prefix = '', stringsOnly = false, forward = true } = options

  // Build text to match against, starting from prefix
  let text = prefix

  // Get range of token indexes to append to text
  const indexes = forward
    ? Array.from(
        { length: words.length - Math.min(startIndex, words.length) },
        (_, i) => Math.min(startIndex, words.length) + i,
      )
    : Array.from({ length: Math.max(startIndex, -1) + 1 }, (_, i) => Math.max(startIndex, -1) - i)

  // If scanning forward, regex must match at start
  // If scanning backward, regex must match at end
  const modifiedRegex = forward ? `^(?:${regex})` : `(?:${regex})$`

  // Append text of each token until we reach max_chars or a stop token
  for (const index of indexes) {
    const token = words[index]

    // Check for stop token
    if (stringsOnly && !(typeof token === 'string')) {
      break
    }
    if (token instanceof ParagraphToken) {
      break
    }

    // Append or prepend text
    if (forward) {
      text += String(token)
    } else {
      text = String(token) + text
    }

    // Check for max length
    if (text.length >= MAX_MATCH_CHARS) {
      if (forward) {
        text = text.slice(0, MAX_MATCH_CHARS)
      } else {
        text = text.slice(-MAX_MATCH_CHARS)
      }
      break
    }
  }

  // Use regex with verbose flag equivalent (remove whitespace and comments)
  // For now, just clean up the basic whitespace
  const cleanedRegex = modifiedRegex.replace(/\s+/g, ' ').trim()
  let match: RegExpMatchArray | null = null

  try {
    match = text.match(new RegExp(cleanedRegex))
  } catch (_e) {
    // If the regex is invalid, skip it
    return null
  }

  // Convert to RegExpMatchArray format with groups
  if (match) {
    const result = match as RegExpMatchArray
    result.groups = result.groups || {}
    return result
  }

  return null
}

/**
 * Citation type priorities for overlap resolution (higher number = higher priority)
 */
const CITATION_TYPE_PRIORITIES = new Map([
  ['FullCaseCitation', 5],
  ['FullJournalCitation', 5],
  ['FullLawCitation', 5],
  ['ShortCaseCitation', 4],
  ['SupraCitation', 3],
  ['IdCitation', 3],
  ['ReferenceCitation', 2],
  ['UnknownCitation', 1],
])

/**
 * Cache for expensive filtering operations
 */
const filteringCache = new Map<string, CitationBase[]>()
const _MAX_CACHE_SIZE = 100

/**
 * Clear the filtering cache
 */
export function clearFilteringCache(): void {
  filteringCache.clear()
}

/**
 * Get citation type priority for overlap resolution
 */
function getCitationPriority(citation: CitationBase): number {
  return CITATION_TYPE_PRIORITIES.get(citation.constructor.name) || 0
}

/**
 * Check if a citation is within a parenthetical of another citation
 */
function isWithinParenthetical(inner: CitationBase, outer: CitationBase): boolean {
  const parenthetical = outer.metadata.parenthetical
  if (!parenthetical) return false

  const innerText = inner.matchedText()
  if (!innerText) return false

  // Check if the inner citation's text appears in the parenthetical
  if (parenthetical.includes(innerText)) {
    return true
  }

  // For more precise checking, also verify the inner citation's span is within
  // the parenthetical's span if we can determine it
  const outerSpan = outer.fullSpan()
  const innerSpan = inner.span()

  // If inner citation is clearly after the main citation but within its full span,
  // it's likely in the parenthetical
  const outerCitationEnd = outer.span().end
  if (innerSpan.start > outerCitationEnd && innerSpan.end <= outerSpan.end) {
    return true
  }

  return false
}

/**
 * Detect if two citations are parallel citations (same case, different reporters)
 */
function areParallelCitations(citation1: CitationBase, citation2: CitationBase): boolean {
  // Only FullCaseCitations can be parallel
  if (!(citation1 instanceof FullCaseCitation) || !(citation2 instanceof FullCaseCitation)) {
    return false
  }

  // Check if they share the same fullSpanStart (indicating they're part of the same citation group)
  if (citation1.fullSpanStart !== undefined && citation2.fullSpanStart !== undefined) {
    if (citation1.fullSpanStart === citation2.fullSpanStart) {
      return true
    }
  }

  // Check if they have overlapping full spans but different reporters (classic parallel citation pattern)
  const span1 = citation1.fullSpan()
  const span2 = citation2.fullSpan()

  if (overlappingCitations(span1, span2)) {
    // Different reporters indicate parallel citations
    if (citation1.groups.reporter !== citation2.groups.reporter) {
      return true
    }

    // Also check if they have the same case name but different reporters
    const case1 = citation1.metadata
    const case2 = citation2.metadata

    if (case1.plaintiff && case2.plaintiff && case1.defendant && case2.defendant) {
      const sameCase = case1.plaintiff === case2.plaintiff && case1.defendant === case2.defendant
      const differentReporters = citation1.groups.reporter !== citation2.groups.reporter
      return sameCase && differentReporters
    }

    // Check if citations are close together and have different reporters (likely parallel)
    const citation1End = citation1.span().end
    const citation2Start = citation2.span().start
    const gap = Math.abs(citation2Start - citation1End)

    // Enhanced gap detection - consider punctuation and formatting
    if (gap < 20 && citation1.groups.reporter !== citation2.groups.reporter) {
      // Check if there's only punctuation/whitespace between citations
      if (citation1.document?.plainText) {
        const betweenText = citation1.document.plainText.substring(citation1End, citation2Start)
        // Allow comma, space, and common parallel citation separators
        if (/^[\s,;]*$/.test(betweenText)) {
          return true
        }
      }
      return true
    }

    // Check for specific parallel citation patterns in the text
    if (citation1.document?.plainText) {
      const fullText = citation1.document.plainText
      const start = Math.min(span1.start, span2.start)
      const end = Math.max(span1.end, span2.end)
      const contextText = fullText.substring(
        Math.max(0, start - 50),
        Math.min(fullText.length, end + 50),
      )

      // Look for parallel citation indicators
      const parallelIndicators = [
        /\b(?:also\s+(?:reported|published)\s+(?:in|at))\b/i,
        /\b(?:accord|see\s+also)\b/i,
        /\b(?:sub\s+nom\.?)\b/i,
        /\b(?:aff['']d|rev['']d|cert\s+denied)\b/i,
      ]

      if (parallelIndicators.some((pattern) => pattern.test(contextText))) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if citations have significant content overlap (for nested citations)
 */
function hasSignificantOverlap(
  span1: { start: number; end: number },
  span2: { start: number; end: number },
): boolean {
  const overlapStart = Math.max(span1.start, span2.start)
  const overlapEnd = Math.min(span1.end, span2.end)
  const overlapLength = Math.max(0, overlapEnd - overlapStart)

  const span1Length = span1.end - span1.start
  const span2Length = span2.end - span2.start
  const minLength = Math.min(span1Length, span2Length)

  // Consider it significant overlap if more than 50% of the shorter citation overlaps
  return overlapLength > minLength * 0.5
}

/**
 * Filter citations to remove overlaps and duplicates with sophisticated disambiguation logic
 */
export function filterCitations(citations: CitationBase[]): CitationBase[] {
  if (!citations.length) {
    return citations
  }

  // Remove exact duplicates based on span and type
  const uniqueCitations = Array.from(
    new Map(
      citations.map((c) => [`${c.constructor.name}-${c.span().start}-${c.span().end}`, c]),
    ).values(),
  )

  // Sort by full span start, then by span start for consistent ordering
  const sortedCitations = uniqueCitations.sort((a, b) => {
    const aFullSpan = a.fullSpan()
    const bFullSpan = b.fullSpan()

    if (aFullSpan.start !== bFullSpan.start) {
      return aFullSpan.start - bFullSpan.start
    }

    // If full spans start at same position, sort by actual citation span
    const aSpan = a.span()
    const bSpan = b.span()

    if (aSpan.start !== bSpan.start) {
      return aSpan.start - bSpan.start
    }

    // Finally, sort by priority (higher priority first)
    return getCitationPriority(b) - getCitationPriority(a)
  })

  const filteredCitations: CitationBase[] = []
  const processedPositions = new Set<string>()

  for (const citation of sortedCitations) {
    let shouldAdd = true
    const citationSpan = citation.fullSpan()
    const citationKey = `${citationSpan.start}-${citationSpan.end}`

    // Check if we've already processed this exact position
    if (processedPositions.has(citationKey)) {
      continue
    }

    // Check for overlaps with existing citations
    for (let i = filteredCitations.length - 1; i >= 0; i--) {
      const existing = filteredCitations[i]
      const existingSpan = existing.fullSpan()

      // Skip if citations are far apart (optimization)
      if (existingSpan.end <= citationSpan.start) {
        break // No more overlaps possible due to sorting
      }

      const isOverlapping = overlappingCitations(citationSpan, existingSpan)

      if (isOverlapping) {
        // Check for parallel citations first (these should always be kept)
        if (areParallelCitations(citation, existing)) {
          // Keep both parallel citations
          continue
        }

        // Check if one citation is within the parenthetical of another
        if (isWithinParenthetical(citation, existing)) {
          // Keep citation within parenthetical
          continue
        }
        if (isWithinParenthetical(existing, citation)) {
          // Keep the existing citation within parenthetical, don't add current
          shouldAdd = false
          break
        }

        // Handle significant overlaps based on priority
        if (hasSignificantOverlap(citationSpan, existingSpan)) {
          const currentPriority = getCitationPriority(citation)
          const existingPriority = getCitationPriority(existing)

          if (currentPriority > existingPriority) {
            // Current citation has higher priority, remove existing
            filteredCitations.splice(i, 1)
            processedPositions.delete(`${existingSpan.start}-${existingSpan.end}`)
          } else if (currentPriority < existingPriority) {
            // Existing citation has higher priority, don't add current
            shouldAdd = false
            break
          } else {
            // Same priority - use additional criteria

            // For same-priority citations, prefer the one with more metadata
            const currentMetadataCount = Object.keys(citation.metadata).filter(
              (k) => citation.metadata[k],
            ).length
            const existingMetadataCount = Object.keys(existing.metadata).filter(
              (k) => existing.metadata[k],
            ).length

            if (currentMetadataCount > existingMetadataCount) {
              // Current has more metadata, replace existing
              filteredCitations.splice(i, 1)
              processedPositions.delete(`${existingSpan.start}-${existingSpan.end}`)
            } else {
              // Keep existing, don't add current
              shouldAdd = false
              break
            }
          }
        }
      }
    }

    if (shouldAdd) {
      filteredCitations.push(citation)
      processedPositions.add(citationKey)
    }
  }

  // Final sort by position for output consistency
  return filteredCitations.sort((a, b) => a.span().start - b.span().start)
}

/**
 * Check if two citation spans overlap
 */
function overlappingCitations(
  fullSpan1: { start: number; end: number },
  fullSpan2: { start: number; end: number },
): boolean {
  return Math.max(fullSpan1.start, fullSpan2.start) < Math.min(fullSpan1.end, fullSpan2.end)
}

/**
 * Remove ambiguous citations by checking if edition_guess is set
 * This matches the Python implementation which simply filters citations
 * where edition_guess is not set after guessEdition() has been called
 */
export function disambiguateReporters(citations: CitationBase[]): CitationBase[] {
  return citations.filter((citation) => {
    // Keep non-ResourceCitations as they don't need disambiguation
    if (!(citation instanceof ResourceCitation)) {
      return true
    }

    // Keep citation if edition_guess is set (matching Python behavior)
    // In TypeScript, we need to check for both null and undefined
    return citation.editionGuess !== null && citation.editionGuess !== undefined
  })
}

/**
 * Check if a name is valid (longer than 2 characters)
 */
export function isValidName(name: string): boolean {
  return name.length > 2
}

/**
 * Find case name in plain text
 */
export function findCaseName(citation: CaseCitation, document: Document, short = false): void {
  // Initialize search state
  const searchState = initializeSearchState(citation)

  // Phase 1: Scan backward to find case name boundaries
  const updatedState = scanForCaseBoundaries(document, citation, searchState)

  // Phase 2: Process found case name if any
  processCaseName(citation, document, updatedState, short)
}

/**
 * Get emphasis tags at a given position in plain text
 * @param document The document with emphasis tags
 * @param position Character position to find tags at
 * @returns List of tuples containing [tag_text, start_pos, end_pos], or empty array if no matching tags found
 */
export function findHtmlTagsAtPosition(
  document: Document,
  position: number,
): Array<[string, number, number]> {
  if (!document.plainToMarkup || !document.emphasisTags) {
    return []
  }

  const markupLoc = (document.plainToMarkup as SpanUpdater).update(position, bisectRight)
  const tags = document.emphasisTags.filter((tag) => tag[1] <= markupLoc && markupLoc < tag[2])

  if (tags.length !== 1) {
    return []
  }

  return tags
}

/**
 * Convert emphasis tags to plain text and location
 * @param document The document to process
 * @param results The emphasis tags
 * @returns [text, start, end] The text of the plain text and the location it starts and ends
 */
export function convertHtmlToPlainTextAndLoc(
  document: Document,
  results: Array<[string, number, number]>,
): [string, number, number] {
  const [tagText, _tagStart, _tagEnd] = results[0]

  if (!document.markupToPlain) {
    return ['', 0, 0]
  }

  // The tagText is the content of the emphasis tag
  // We need to find where this text appears in the plain text
  const plainTextIndex = document.plainText.indexOf(tagText)

  if (plainTextIndex === -1) {
    return ['', 0, 0]
  }

  const start = plainTextIndex
  const end = plainTextIndex + tagText.length

  return [tagText, start, end]
}

/**
 * Find case name in HTML
 */
export function findCaseNameInHtml(
  citation: CaseCitation,
  document: Document,
  short = false,
): void {
  const words = document.words
  const backSeek = Math.max(citation.index - BACKWARD_SEEK, 0)

  // Handle short citations differently
  if (short) {
    extractShortCitationName(citation, words, document)
    return
  }

  // First, try to find case name in emphasis tags
  if (document.emphasisTags && document.emphasisTags.length > 0 && document.markupToPlain) {
    const citationStart = citation.span().start

    // Look for emphasis tags that appear before the citation
    for (let i = 0; i < document.emphasisTags.length; i++) {
      const tag = document.emphasisTags[i]
      const [text, _markupStart, _markupEnd] = tag

      // Find where this text appears in the plain text
      // Since emphasis tags can appear multiple times, we need to find the right occurrence
      let plainStart = -1
      let plainEnd = -1

      // Search for this text in the plain text before the citation
      let searchFrom = 0
      while (searchFrom < citationStart) {
        const idx = document.plainText.indexOf(text, searchFrom)
        if (idx === -1) break

        // Check if this occurrence is before the citation and matches our markup position roughly
        if (idx + text.length <= citationStart) {
          plainStart = idx
          plainEnd = idx + text.length
        }
        searchFrom = idx + 1
      }

      // Skip if we couldn't find the text in plain text
      if (plainStart === -1) continue

      // Check if this tag is before and near the citation
      if (plainEnd <= citationStart && citationStart - plainEnd < 50) {
        // Special handling for case names that continue after the emphasis tag
        // Check if there's additional text after the tag that's part of the case name
        const afterTagText = document.plainText.substring(
          plainEnd,
          Math.min(plainEnd + 20, citationStart),
        )
        const incMatch = afterTagText.match(
          /^\s*(Inc\.|LLC|Corp\.|Ltd\.|Co\.|L\.L\.C\.|LLP|P\.C\.)/i,
        )

        if (incMatch) {
          // This tag is part of a case name that continues after it
          // The matched text includes the leading whitespace
          const fullText = text + incMatch[0]
          const fullEnd = plainEnd + incMatch[0].length

          // Check if there's a 'v.' after this
          const afterInc = document.plainText.substring(
            fullEnd,
            Math.min(fullEnd + 10, citationStart),
          )
          if (/^\s*v\.?\s+/i.test(afterInc)) {
            // This is a plaintiff name that continues after the tag
            const vMatch = afterInc.match(/^(\s*v\.?\s+)/i)
            if (vMatch) {
              const vEnd = fullEnd + vMatch[1].length

              // Look for defendant name
              const defendantText = document.plainText.substring(vEnd, citationStart)
              const defendantMatch = defendantText.match(/^([^,]+)/)

              if (defendantMatch) {
                citation.metadata.plaintiff = stripStopWords(fullText.trim())
                citation.metadata.defendant = stripStopWords(defendantMatch[1].trim())
                citation.fullSpanStart = plainStart
                return
              }
            }
          }
        }
        // Check if this tag contains a case name pattern
        if (/(?:^|\s+)v\.?\s+/i.test(text)) {
          extractFromSingleHtmlElement(citation, document, [tag])
          return
        }

        // Check if this could be part of a multi-tag case name
        // Look for consecutive emphasis tags that together form a case name
        const consecutiveTags: Array<[string, number, number]> = [tag]
        let _combinedText = text
        let hasVersus = /(?:^|\s+)v\.?\s+/i.test(text)

        // Look ahead for more consecutive tags
        for (let j = i + 1; j < document.emphasisTags.length; j++) {
          const nextTag = document.emphasisTags[j]
          const [nextText, _nextMarkupStart, _nextMarkupEnd] = nextTag

          // Find where this next tag's text appears in the plain text
          let nextPlainStart = -1
          let nextPlainEnd = -1

          // Search starting from the end of the previous tag
          const nextIdx = document.plainText.indexOf(nextText, plainEnd)
          if (nextIdx !== -1 && nextIdx < citationStart) {
            nextPlainStart = nextIdx
            nextPlainEnd = nextIdx + nextText.length
          }

          // Check if tags are consecutive (allow small gap for whitespace)
          if (nextPlainStart - plainEnd > 10) {
            break
          }

          // Check if there's a 'v.' between the tags
          if (!hasVersus && nextPlainStart > plainEnd) {
            const betweenText = document.plainText.substring(plainEnd, nextPlainStart)
            if (/^\s*v\.?\s*$/i.test(betweenText)) {
              hasVersus = true
            }
          }

          // Check if we should stop before the citation
          if (nextPlainEnd > citationStart) {
            break
          }

          consecutiveTags.push(nextTag)
          _combinedText += ` ${nextText}`

          // Check if this tag contains 'v'
          if (/(?:^|\s+)v\.?\s+/i.test(nextText)) {
            hasVersus = true
          }

          // If we have found 'v', we might have a complete case name
          if (hasVersus && (nextText.includes(',') || j === document.emphasisTags.length - 1)) {
            extractFromMultipleHtmlElements(citation, document, consecutiveTags)
            return
          }
        }

        // If we found a 'v' in the combined tags, process them
        if (hasVersus && consecutiveTags.length > 1) {
          extractFromMultipleHtmlElements(citation, document, consecutiveTags)
          return
        }
      }
    }
  }

  // Fall back to searching for 'v' stop word in plain text
  for (let index = citation.index - 1; index >= backSeek; index--) {
    const word = words[index]

    if (isWhitespaceWord(word)) {
      continue
    }

    if (isVersusToken(word)) {
      extractPlaintiffDefendantFromVersus(citation, document, words, index, word)
      return
    } else if (word instanceof StopWordToken) {
      extractDefendantAfterStopword(citation, document, words, index, word)
      return
    }
  }
}

// Helper functions for case name finding

function initializeSearchState(citation: CaseCitation): any {
  return {
    offset: 0,
    vToken: null,
    startIndex: null,
    candidateCaseName: null,
    preCiteYear: null,
    titleStartingIndex: citation.index - 1,
    caseNameLength: 0,
    plaintiffLength: 0,
  }
}

function scanForCaseBoundaries(document: Document, citation: CaseCitation, state: any): any {
  const words = document.words
  const backSeek = citation.index - BACKWARD_SEEK

  for (let index = citation.index - 1; index > Math.max(backSeek, -1); index--) {
    const word = words[index]
    const wordStr = String(word)
    state.offset += wordStr.length

    // Skip commas
    if (wordStr === ',') {
      continue
    }

    state.caseNameLength += 1

    // Track plaintiff name length if we've already found a "v" token
    if (state.vToken !== null && wordStr.trim() !== '') {
      state.plaintiffLength += 1
    }

    // Handle citation tokens
    if (word instanceof CitationToken) {
      state.titleStartingIndex = index - 1
      continue
    }

    // Break on terminal punctuation
    if (wordStr.endsWith(';') || wordStr.endsWith('"') || wordStr.endsWith('"')) {
      state.startIndex = index + 2
      state.candidateCaseName = extractText(words, state.startIndex, state.titleStartingIndex)
      break
    }

    // Handle year before citation
    if (/\(\d{4}\)/.test(wordStr)) {
      state.titleStartingIndex = index - 1
      state.preCiteYear = wordStr.slice(1, 5)
      continue
    }

    // Break on opening parenthesis after first word
    if (wordStr.startsWith('(') && state.caseNameLength > 3) {
      state.startIndex = index
      if (wordStr === '(' || wordStr[1]?.match(/[a-z]/)) {
        state.startIndex = index + 2
      }
      state.candidateCaseName = extractText(words, state.startIndex, state.titleStartingIndex)
      break
    }

    // Break on lowercase word after "v" token
    if (isLowercaseAfterVToken(wordStr, state.vToken)) {
      state.startIndex = index + 2
      state.candidateCaseName = extractText(words, state.startIndex, state.titleStartingIndex)
      state.candidateCaseName = state.candidateCaseName.replace(/^(of|the|an|and)\s+/, '')
      break
    }

    // Skip placeholder citations
    if (word instanceof CitationToken || word instanceof PlaceholderCitationToken) {
      state.titleStartingIndex = index - 1
      continue
    }

    // Handle "v" token
    if (isVToken(word)) {
      state.vToken = word
      state.vTokenIndex = index
      state.startIndex = index - 2
      state.candidateCaseName = extractText(words, state.startIndex, state.titleStartingIndex)
      continue
    }

    // Break on likely new sentence after "v" token
    if (
      isCapitalizedAbbreviation(wordStr, state.vToken, state.plaintiffLength) ||
      word instanceof StopWordToken
    ) {
      state.startIndex = index + 2
      state.candidateCaseName = extractText(words, state.startIndex, state.titleStartingIndex)
      break
    }

    // Break on lowercase word w/o "v" token
    if (isLowercaseWithoutVToken(wordStr, state.vToken)) {
      if (['ex', 'rel.'].includes(wordStr)) {
        continue
      }
      if (word instanceof SupraCitation) {
        state.titleStartingIndex = index - 1
        continue
      }
      state.startIndex = index + 2
      state.candidateCaseName = extractText(words, state.startIndex, state.titleStartingIndex)

      // Extract just the capitalized word if possible
      const match = state.candidateCaseName.match(/\b([A-Z][a-zA-Z0-9]*)\b.*/)
      if (match) {
        state.candidateCaseName = state.candidateCaseName.slice(match.index)
      } else {
        state.candidateCaseName = null
      }
      break
    }

    // Handle reaching start of text
    if (index === 0) {
      state.candidateCaseName = extractText(words, index, state.titleStartingIndex)
      state.startIndex = 0
      state.candidateCaseName = state.candidateCaseName.replace(/^(of|the|an|and)\b/i, '')

      // Drop if case name ends in numbers (likely a citation)
      if (/\b\d+\b$/.test(state.candidateCaseName)) {
        state.candidateCaseName = null
      }
    }
  }

  return state
}

function processCaseName(
  citation: CaseCitation,
  document: Document,
  state: any,
  short: boolean,
): void {
  const words = document.words

  // If we have a v token, extract plaintiff and defendant separately
  if (state.vToken && state.vTokenIndex !== undefined) {
    // Extract plaintiff - text before v token
    let plaintiffStart = Math.max(0, state.vTokenIndex - 10) // Look back up to 10 words
    const plaintiffEnd = state.vTokenIndex

    // Find actual start of plaintiff name (look for clear boundaries)
    for (let i = state.vTokenIndex - 1; i >= plaintiffStart; i--) {
      const word = words[i]
      const wordStr = String(word).trim()
      // Stop at punctuation or special tokens
      if (
        wordStr &&
        (wordStr.match(/[;,.]$/) || // ends with punctuation
          word instanceof CitationToken ||
          word instanceof StopWordToken)
      ) {
        plaintiffStart = i + 1
        break
      }
      // If we've reached the beginning, include from start
      if (i === 0) {
        plaintiffStart = 0
        break
      }
    }

    // Extract plaintiff text, skipping leading lowercase words
    const plaintiffWords = []
    let foundCapitalized = false
    for (let i = plaintiffStart; i < plaintiffEnd; i++) {
      const word = words[i]
      const wordStr = String(word).trim()

      // Skip leading lowercase words like "bob" before "Lissner"
      if (!foundCapitalized && wordStr && wordStr[0] && wordStr[0].match(/[a-z]/)) {
        continue
      }

      // Found a capitalized word or special character
      if (wordStr?.[0]?.match(/[A-Z]/)) {
        foundCapitalized = true
      }

      if (foundCapitalized && (!isWhitespaceWord(word) || plaintiffWords.length > 0)) {
        plaintiffWords.push(String(word))
      }
    }
    const plaintiffText = plaintiffWords.join('').trim()

    // Extract defendant - text after v token
    let defendantStart = state.vTokenIndex + 1
    let defendantEnd = Math.min(citation.index, state.vTokenIndex + 10)

    // Skip whitespace and punctuation after v token
    while (defendantStart < defendantEnd) {
      const word = words[defendantStart]
      const wordStr = String(word).trim()
      if (wordStr && wordStr !== '.' && wordStr !== ',') {
        break
      }
      defendantStart++
    }

    // Find end of defendant name
    for (let i = defendantStart + 1; i < defendantEnd; i++) {
      const word = words[i]
      if (word instanceof CitationToken) {
        defendantEnd = i
        break
      }
      const wordStr = String(word).trim()
      if (wordStr && !wordStr.match(/^[A-Z]/) && wordStr !== ',' && wordStr !== '.') {
        defendantEnd = i
        break
      }
    }

    // Extract defendant text
    const defendantWords = []
    for (let i = defendantStart; i < defendantEnd; i++) {
      const word = words[i]
      if (!isWhitespaceWord(word) || defendantWords.length > 0) {
        defendantWords.push(String(word))
      }
    }
    const defendantText = defendantWords.join('').trim().replace(/[,]+$/, '')

    // Clean and set names
    if (plaintiffText) {
      citation.metadata.plaintiff = stripStopWords(plaintiffText)
    }
    if (defendantText) {
      citation.metadata.defendant = stripStopWords(defendantText)
    }

    // Calculate full span
    if (plaintiffStart < citation.index) {
      const offset = words
        .slice(plaintiffStart, citation.index)
        .reduce((acc, w) => acc + String(w).length, 0)
      citation.fullSpanStart = citation.span().start - offset
    }
  } else if (state.candidateCaseName) {
    // No v token, just set as defendant or antecedent guess
    const cleanName = stripStopWords(state.candidateCaseName.trim().replace(/[,(]+$/, ''))
    if (cleanName) {
      if (!short) {
        citation.metadata.defendant = cleanName
      } else {
        citation.metadata.antecedentGuess = cleanName
      }
    }

    // Calculate full span
    if (state.startIndex !== undefined && state.startIndex < citation.index) {
      const offset = words
        .slice(state.startIndex, citation.index)
        .reduce((acc, w) => acc + String(w).length, 0)
      citation.fullSpanStart = citation.span().start - offset
    }
  }

  // Store year if found
  if (state.preCiteYear) {
    citation.metadata.year = state.preCiteYear
    citation.year = parseInt(state.preCiteYear)
  }
}

// More helper functions

function extractText(words: Tokens, start: number, end: number): string {
  return words
    .slice(start, end)
    .map((w) => String(w))
    .join('')
}

function isVToken(word: any): boolean {
  return word instanceof StopWordToken && word.data === 'v'
}

function isLowercaseAfterVToken(wordStr: string, vToken: any): boolean {
  return (
    vToken !== null &&
    !wordStr[0].match(/[A-Z]/) &&
    wordStr.trim() !== '' &&
    !['of', 'the', 'an', 'and'].includes(wordStr)
  )
}

function isCapitalizedAbbreviation(wordStr: string, vToken: any, plaintiffLength: number): boolean {
  return (
    vToken !== null &&
    wordStr[0].match(/[A-Z]/) &&
    wordStr.length > 4 &&
    wordStr.endsWith('.') &&
    plaintiffLength > 1
  )
}

function isLowercaseWithoutVToken(wordStr: string, vToken: any): boolean {
  return (
    vToken === null &&
    !wordStr[0].match(/[A-Z]/) &&
    wordStr.trim() !== '' &&
    wordStr[0].match(/[a-z]/) &&
    !['of', 'the', 'an', 'and'].includes(wordStr)
  )
}

function isWhitespaceWord(word: any): boolean {
  return String(word).trim().replace(/,/g, '') === ''
}

function isVersusToken(word: any): boolean {
  return word instanceof StopWordToken && word.groups?.stop_word === 'v'
}

function extractShortCitationName(citation: CaseCitation, words: Tokens, document: Document): void {
  // If we have emphasis tags, check if any appear immediately before the citation
  if (document.emphasisTags && document.emphasisTags.length > 0) {
    const citationStart = citation.span().start

    // Look for emphasis tags that end near the citation start
    for (const tag of document.emphasisTags) {
      const [text] = tag

      // Find where this text appears in the plain text
      const textIndex = document.plainText.lastIndexOf(text, citationStart)
      if (textIndex === -1) continue

      const textEnd = textIndex + text.length

      // Check if this tag ends close to the citation (within 10 chars)
      if (textEnd < citationStart && citationStart - textEnd < 10) {
        // Check if there's only punctuation/whitespace between tag and citation
        const between = document.plainText.substring(textEnd, citationStart)
        if (/^[\s,]+$/.test(between)) {
          citation.metadata.antecedentGuess = stripStopWords(text)
          citation.fullSpanStart = textIndex
          return
        }
      }
    }
  }

  // Fall back to looking for plain text antecedent
  for (
    let index = citation.index - 1;
    index >= Math.max(citation.index - BACKWARD_SEEK, 0);
    index--
  ) {
    const word = words[index]
    if (isWhitespaceWord(word)) {
      continue
    }

    // Calculate position for finding HTML tags
    const offset = words.slice(index, citation.index).reduce((acc, w) => acc + String(w).length, 0)
    const loc = (words[citation.index] as Token).start - offset

    // Find and process HTML tags
    const results = findHtmlTagsAtPosition(document, loc)
    if (results.length) {
      const [antecedentGuess, start, end] = convertHtmlToPlainTextAndLoc(document, results)

      // Check for overlapping bad html
      const citeStart = citation.span().start
      if (end > citeStart) {
        const adjusted = antecedentGuess.slice(0, citeStart - end)
        citation.metadata.antecedentGuess = stripStopWords(adjusted)
      } else {
        citation.metadata.antecedentGuess = stripStopWords(antecedentGuess)
      }
      citation.fullSpanStart = start
    }
    break
  }
}

function extractPlaintiffDefendantFromVersus(
  citation: CaseCitation,
  document: Document,
  words: Tokens,
  index: number,
  versusToken: any,
): void {
  // Check if the versus token is inside an emphasis tag
  const vTags = findHtmlTagsAtPosition(document, versusToken.start)

  if (vTags.length === 1) {
    // The 'v' is inside an emphasis tag - use that tag for the full case name
    extractFromSingleHtmlElement(citation, document, vTags)
    return
  }

  // Otherwise, try to find separate plaintiff and defendant tags
  // Find positions to check for HTML tags
  const leftShift = words.slice(index - 2, index).join('').length
  const plaintiffPos = versusToken.start - leftShift

  const rightShift = words.slice(index, index + 2).join('').length
  const defendantPos = versusToken.start + rightShift

  // Get HTML tags at positions
  const plaintiffTags = findHtmlTagsAtPosition(document, plaintiffPos)
  const defendantTags = findHtmlTagsAtPosition(document, defendantPos)

  if (plaintiffTags.length !== 1 || defendantTags.length !== 1) {
    // Fall back to plain text extraction
    // Extract plaintiff - up to 5 words before 'v'
    const beforeV = words.slice(Math.max(0, index - 5), index).join('')

    // Extract defendant - words after 'v' but stop at citation
    let defendantEndIndex = Math.min(words.length, index + 6)
    for (let i = index + 1; i < defendantEndIndex; i++) {
      if (words[i] instanceof CitationToken) {
        defendantEndIndex = i
        break
      }
    }
    const afterV = words.slice(index + 1, defendantEndIndex).join('')

    if (beforeV && afterV) {
      citation.metadata.plaintiff = stripStopWords(beforeV.trim())
      citation.metadata.defendant = stripStopWords(afterV.trim())

      // Set fullSpanStart based on the position before the 'v' token
      const startIndex = Math.max(0, index - 5)
      if (startIndex < words.length && typeof words[startIndex] !== 'string' && (words[startIndex] as Token).start !== undefined) {
        citation.fullSpanStart = (words[startIndex] as Token).start
      }
    }
    return
  }

  // Extract plaintiff and defendant based on HTML structure
  if (plaintiffTags[0] === defendantTags[0]) {
    extractFromSingleHtmlElement(citation, document, plaintiffTags)
  } else {
    extractFromSeparateHtmlElements(citation, document, plaintiffTags, defendantTags)
  }
}

function extractFromSingleHtmlElement(
  citation: CaseCitation,
  document: Document,
  tags: Array<[string, number, number]>,
): void {
  const [caseName, start, _end] = convertHtmlToPlainTextAndLoc(document, tags)

  // Split on 'v' or 'vs'
  const pattern = /\s+vs?\.?\s+/i
  const splits = caseName.split(pattern)

  let plaintiff = ''
  let defendant = ''

  if (splits.length === 2) {
    plaintiff = splits[0]
    defendant = splits[1]
  } else {
    // No v found, just set as defendant
    defendant = caseName
  }

  // Clean and update citation
  const cleanPlaintiff = stripStopWords(plaintiff)
    .trim()
    .replace(/^[(,]+|[,)]+$/g, '')
  citation.metadata.plaintiff = cleanPlaintiff
  citation.metadata.defendant = stripStopWords(defendant)
    .trim()
    .replace(/^[(,]+|[,)]+$/g, '')

  // Adjust span start if needed
  if (cleanPlaintiff.length !== plaintiff.length) {
    const shift = plaintiff.length - cleanPlaintiff.length
    citation.fullSpanStart = start + shift
  } else {
    citation.fullSpanStart = start
  }
}

function extractFromSeparateHtmlElements(
  citation: CaseCitation,
  document: Document,
  plaintiffTags: Array<[string, number, number]>,
  defendantTags: Array<[string, number, number]>,
): void {
  const [plaintiff, pStart] = convertHtmlToPlainTextAndLoc(document, plaintiffTags)
  const [defendant] = convertHtmlToPlainTextAndLoc(document, defendantTags)

  // Clean and update citation
  citation.metadata.plaintiff = stripStopWords(plaintiff)
    .trim()
    .replace(/^[(,]+|[,)]+$/g, '')
  citation.metadata.defendant = stripStopWords(defendant)
    .trim()
    .replace(/^[(,]+|[,)]+$/g, '')
  citation.fullSpanStart = pStart
}

function extractFromMultipleHtmlElements(
  citation: CaseCitation,
  document: Document,
  tags: Array<[string, number, number]>,
): void {
  if (!document.plainText) {
    return
  }

  // Combine all tag texts and find their positions in plain text
  let combinedText = ''
  let firstPlainStart = -1
  let lastPlainEnd = -1
  let _vBetweenTags = false

  for (let i = 0; i < tags.length; i++) {
    const [text] = tags[i]

    // Find where this text appears in the plain text
    const searchStart = lastPlainEnd === -1 ? 0 : lastPlainEnd
    const plainStart = document.plainText.indexOf(text, searchStart)

    if (plainStart !== -1) {
      const plainEnd = plainStart + text.length

      if (firstPlainStart === -1) {
        firstPlainStart = plainStart
      }

      // Check if there's a 'v.' between this tag and the previous one
      if (lastPlainEnd !== -1 && plainStart > lastPlainEnd) {
        const betweenText = document.plainText.substring(lastPlainEnd, plainStart)
        if (/^\s*v\.?\s*$/i.test(betweenText)) {
          _vBetweenTags = true
          // Add 'v.' to combined text if it was between tags
          if (combinedText && !combinedText.endsWith(' ')) {
            combinedText += ' '
          }
          combinedText += 'v. '
        }
      }

      lastPlainEnd = plainEnd
    }

    // Add text with appropriate spacing
    if (combinedText && !combinedText.endsWith(' ') && !text.startsWith(' ')) {
      combinedText += ' '
    }
    combinedText += text
  }

  // Clean up the combined text
  combinedText = combinedText.trim()

  // Split on 'v' or 'vs'
  const pattern = /\s+v\.?\s+/i
  const vMatch = combinedText.match(pattern)

  if (vMatch && vMatch.index !== undefined) {
    // Extract plaintiff and defendant
    const plaintiff = combinedText.substring(0, vMatch.index).trim()
    const defendant = combinedText.substring(vMatch.index + vMatch[0].length).trim()

    // Clean and update citation
    citation.metadata.plaintiff = stripStopWords(plaintiff)
      .replace(/^[(,]+|[,)]+$/g, '')
      .trim()
    citation.metadata.defendant = stripStopWords(defendant)
      .replace(/^[(,]+|[,)]+$/g, '')
      .replace(/,$/, '')
      .trim()
    citation.fullSpanStart = firstPlainStart
  } else {
    // No 'v' found, treat as defendant only
    citation.metadata.defendant = stripStopWords(combinedText)
      .replace(/^[(,]+|[,)]+$/g, '')
      .replace(/,$/, '')
      .trim()
    citation.fullSpanStart = firstPlainStart
  }
}

function extractDefendantAfterStopword(
  citation: CaseCitation,
  _document: Document,
  words: Tokens,
  index: number,
  _word: any,
): void {
  // Find next non-whitespace word after stop word
  let shift = 1
  while (index + shift < words.length && isWhitespaceWord(words[index + shift])) {
    shift++
  }

  if (index + shift < words.length) {
    const defendant = words
      .slice(index + shift, Math.min(words.length, index + shift + 5))
      .join('')
      .trim()

    if (defendant) {
      citation.metadata.defendant = stripStopWords(defendant)
    }
  }
}

/**
 * Strip stop words from text
 */
export function stripStopWords(text: string): string {
  let cleaned = text.replace(new RegExp(STOP_WORD_REGEX, 'g'), ' ')
  cleaned = cleaned.replace(/^In\s+/i, '').trim()
  cleaned = cleaned.replace(/^\(/, '').replace(/\)$/, '')

  if (cleaned.includes(';')) {
    cleaned = cleaned.split(';')[1]
  }

  cleaned = cleaned.replace(new RegExp(STOP_WORD_REGEX, 'gi'), '').trim()

  // Replace multiple commas/spaces with single space, but preserve comma before Inc., Corp., etc.
  // First, mark commas we want to preserve (including the period if present)
  cleaned = cleaned.replace(
    /,\s+(Inc\.|Corp\.|Ltd\.|Co\.|L\.L\.C\.|LLC|LLP|P\.C\.|S\.A\.|N\.A\.|A\.G\.|GmbH)(\s|$)/gi,
    '§COMMA§ $1$2',
  )
  // Replace other commas with spaces
  cleaned = cleaned.replace(/[, ]+/g, ' ')
  // Restore preserved commas
  cleaned = cleaned.replace(/§COMMA§/g, ',')

  // Remove leading dots and spaces, but preserve trailing dots that are part of abbreviations
  cleaned = cleaned.replace(/^[.\s]+/, '')

  // Only remove trailing dots if they're not part of an abbreviation like Corp., Inc., Ltd., etc.
  // Also preserve single letter abbreviations like A., B., C., etc.
  if (
    !cleaned.match(
      /(?:Corp|Inc|Ltd|Co|L\.L\.C|LLC|LLP|P\.C|S\.A|N\.A|A\.G|GmbH|Hosp|Univ|Ass'n|Assn|Bros|Dept|Dist|Div|Fed|Gov|Int'l|Intl|Mfg|Nat'l|Natl|Ry|Sys|Transp|[A-Z])\.$/i,
    )
  ) {
    cleaned = cleaned.replace(/[.\s]+$/, '')
  }

  return cleaned.trim()
}

/**
 * Clean pin cite text
 */
function cleanPinCite(pinCite: string | null): string | null {
  if (!pinCite) return null
  return pinCite.trim().replace(/[, ]+$/, '')
}

/**
 * Process parenthetical text
 */
function processParenthetical(matchedParenthetical: string | null): string | null {
  if (!matchedParenthetical) return null

  let parenBalance = 0
  for (let i = 0; i < matchedParenthetical.length; i++) {
    const char = matchedParenthetical[i]
    if (char === '(') {
      parenBalance++
    } else if (char === ')') {
      parenBalance--
    }
    if (parenBalance < 0) {
      const result = matchedParenthetical.slice(0, i)
      return result || null
    }
  }

  // Check if it's just a year
  if (new RegExp(YEAR_REGEX).test(matchedParenthetical)) {
    return null
  }

  return matchedParenthetical || null
}

/**
 * Get year from string
 */
export function getYear(word: string): number | null {
  try {
    const year = parseInt(word)
    if (year < 1600 || year > highestValidYear) {
      return null
    }
    return year
  } catch {
    return null
  }
}

/**
 * Add post citation metadata
 */
export function addPostCitation(citation: CaseCitation, words: Tokens): void {
  // First try to match the complex pattern
  const m = matchOnTokens(words, citation.index + 1, POST_FULL_CITATION_REGEX)

  if (!m) {
    // If complex pattern doesn't match, try simple extraction
    if (citation.index + 1 < words.length) {
      const nextWords = words
        .slice(citation.index + 1, citation.index + 30)
        .map((w) => String(w))
        .join('')

      // Try to extract pin cite, year, court, and parenthetical from simpler pattern
      // Matches: , 2 (1982) or , 347-348 (4th Cir. 1982) or just (1982)
      // Also handles second parenthetical like (1982) (overruling xyz)
      // First, try to extract just a pin cite if it's followed by a comma (parallel citation case)
      const pinCiteOnlyMatch = nextWords.match(
        /^,\s*([0-9]+(?:-[0-9]+)?(?:\s*[&,]\s*[0-9]+(?:-[0-9]+)?)*),/,
      )
      if (pinCiteOnlyMatch) {
        citation.metadata.pinCite = pinCiteOnlyMatch[1].trim()
        citation.fullSpanEnd = citation.span().end + pinCiteOnlyMatch[0].length - 1 // -1 to exclude trailing comma
        return
      }

      // First try to match pin cite without parentheses (e.g., ", 41;" or ", 41")
      const pinCiteWithoutParenMatch = nextWords.match(
        /^,\s*([0-9]+(?:-[0-9]+)?(?:\s*[&,]\s*[0-9]+(?:-[0-9]+)?)*)(?:[;.]|$)/,
      )
      if (pinCiteWithoutParenMatch) {
        citation.metadata.pinCite = pinCiteWithoutParenMatch[1].trim()
        citation.fullSpanEnd = citation.span().end + pinCiteWithoutParenMatch[0].length
        return
      }

      const simpleMatch = nextWords.match(
        /^(?:,\s*([0-9]+(?:-[0-9]+)?(?:\s*[&,]\s*[0-9]+(?:-[0-9]+)?)*))?\s*\(([^)]+)\)/,
      )
      if (simpleMatch) {
        // Extract pin cite if present
        if (simpleMatch[1]) {
          citation.metadata.pinCite = simpleMatch[1].trim()
        }

        const parenContent = simpleMatch[2]
        let fullMatchLength = simpleMatch[0].length
        let hasYearOrCourt = false

        // Try to extract date pattern first (month day, year)
        const dateRegex = new RegExp(
          `^(.+?)\\s+(${MONTH_REGEX_INNER.trim()})\\s+(\\d{1,2}),?\\s+(\\d{4})$`,
        )
        const dateMatch = parenContent.match(dateRegex)
        if (dateMatch) {
          hasYearOrCourt = true
          // Extract court (before month)
          const courtStr = dateMatch[1].trim()
          const court = getCourtByParen(courtStr)
          if (court) {
            citation.metadata.court = court
          }

          // Extract date components
          citation.metadata.month = dateMatch[2]
          citation.metadata.day = dateMatch[3]
          citation.metadata.year = dateMatch[4]
          if ('year' in citation) {
            citation.year = getYear(dateMatch[4])
          }
        } else {
          // No date pattern, try simple year extraction (including year ranges)
          const yearOnlyMatch = parenContent.match(/\b(\d{4}(?:-\d{2,4})?)\b/)
          if (yearOnlyMatch) {
            hasYearOrCourt = true
            const yearStr = yearOnlyMatch[1]

            // Parse and validate year range
            const yearRangeResult = parseYearRange(yearStr)
            if (yearRangeResult.isValid && yearRangeResult.startYear) {
              citation.metadata.year = yearRangeResult.startYear.toString()
              citation.metadata.yearRange = yearStr
              if ('year' in citation) {
                citation.year = yearRangeResult.startYear
              }

              // Add end year if it's a range
              if (
                yearRangeResult.endYear &&
                yearRangeResult.endYear !== yearRangeResult.startYear
              ) {
                citation.metadata.endYear = yearRangeResult.endYear
              }
            } else {
              // Fallback to original logic for invalid ranges
              citation.metadata.year = yearStr
              if ('year' in citation) {
                citation.year = getYear(yearStr)
              }
              // Add warning for invalid year range
              if (!citation.metadata.warnings) {
                citation.metadata.warnings = []
              }
              citation.metadata.warnings.push(`Invalid year range format: ${yearStr}`)
            }

            // Extract court (everything before year)
            const beforeYear = parenContent
              .substring(0, parenContent.indexOf(yearOnlyMatch[1]))
              .trim()
            if (beforeYear) {
              const court = getCourtByParen(beforeYear)
              if (court) {
                citation.metadata.court = court
              }
            }
          }
        }

        // If no year/court was found, the entire first parenthetical might be the content with nested parentheses
        if (!hasYearOrCourt) {
          // Re-extract the first parenthetical with balanced parentheses
          const firstParenMatch = nextWords.match(
            /^(?:,\s*([0-9]+(?:-[0-9]+)?(?:\s*[&,]\s*[0-9]+(?:-[0-9]+)?)*))?\s*\(/,
          )
          if (firstParenMatch) {
            let parenCount = 1
            let i = firstParenMatch[0].length
            let parenContent = ''

            while (i < nextWords.length && parenCount > 0) {
              const char = nextWords[i]
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
              citation.metadata.parenthetical = parenContent
              citation.fullSpanEnd =
                citation.span().end + firstParenMatch[0].length + parenContent.length + 1
              return
            }
          }
        }

        // Check for second parenthetical after the first one
        const remainingText = nextWords.substring(simpleMatch[0].length)
        const secondParenStartMatch = remainingText.match(/^\s*\(/)
        if (secondParenStartMatch) {
          // Find the balanced closing parenthesis
          let parenCount = 1
          let i = secondParenStartMatch[0].length
          let parenContent = ''

          while (i < remainingText.length && parenCount > 0) {
            const char = remainingText[i]
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
            // If the first paren only contains year/court, the second is the parenthetical
            if (hasYearOrCourt) {
              citation.metadata.parenthetical = parenContent
              fullMatchLength += secondParenStartMatch[0].length + parenContent.length + 1 // +1 for closing paren
            }
          }
        }

        // Set full span end
        citation.fullSpanEnd = citation.span().end + fullMatchLength
      }
    }
    return
  }

  citation.fullSpanEnd = citation.span().end + m[0].length

  // Handle both pinCite and pinCite2 (different branches of the regex)
  const pinCite = m.groups?.pinCite || m.groups?.pinCite2
  citation.metadata.pinCite = cleanPinCite(pinCite) || undefined

  if (pinCite) {
    citation.metadata.pinCiteSpanEnd = citation.span().end + pinCite.length
  }

  citation.metadata.extra = m.groups?.extra?.trim() || undefined
  citation.metadata.parenthetical = processParenthetical(m.groups?.parenthetical)

  if (
    citation.fullSpanEnd &&
    m.groups?.parenthetical &&
    typeof citation.metadata.parenthetical === 'string' &&
    m.groups.parenthetical.length > citation.metadata.parenthetical.length
  ) {
    const offset = m.groups.parenthetical.length - citation.metadata.parenthetical.length
    citation.fullSpanEnd = citation.fullSpanEnd - offset
  }

  citation.metadata.year = m.groups?.year
  citation.metadata.month = m.groups?.month
  citation.metadata.day = m.groups?.day

  // Extract court from parenthetical
  if (m.groups?.court) {
    const court = getCourtByParen(m.groups.court)
    if (court) {
      citation.metadata.court = court
    }
  }

  // Set year on citation object if it's a ResourceCitation
  if ('year' in citation && m.groups?.year) {
    citation.year = getYear(m.groups.year)
  }
}

/**
 * Get court by parenthetical string
 */
export function getCourtByParen(parenString: string): string | null {
  if (!parenString) return null

  // No debug logging needed in production

  // Normalize the input string
  const normalized = parenString
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, '') // Remove periods and commas
    .replace(/\s+/g, ' ') // Normalize spaces

  // Try specific abbreviation patterns FIRST to avoid conflicts with overly broad COURTS patterns
  // This ensures "4th Cir." matches to "ca4" instead of "scotus"
  const abbreviationPatterns: Array<
    [RegExp, string | ((match: RegExpMatchArray) => string | null)]
  > = [
    // Federal Circuit Courts - should match before any SCOTUS patterns
    [/^(\d+)(st|nd|rd|th)\s+cir\.?$/i, (m) => `ca${m[1]}`],
    [/^(\d+)(st|nd|rd|th)\s+circuit$/i, (m) => `ca${m[1]}`],

    // Federal District Courts
    [
      /^([NSEW])\.?\s?D\.?\s+(.+)$/i,
      (m) => {
        const direction = m[1].toUpperCase()
        const state = m[2].replace(/\./g, '').trim()
        // Common district court patterns
        const stateMap: Record<string, string> = {
          cal: 'ca',
          calif: 'ca',
          california: 'ca',
          ny: 'ny',
          newyork: 'ny',
          tex: 'tx',
          texas: 'tx',
          fla: 'fl',
          florida: 'fl',
          pa: 'pa',
          penn: 'pa',
          pennsylvania: 'pa',
        }
        const stateCode = stateMap[state.toLowerCase()]
        if (stateCode) {
          return `${stateCode}d${direction.toLowerCase()}`
        }
        return null
      },
    ],

    // State appellate courts
    [/^pa\.?\s*super\.?(?:\s*ct\.?)?$/i, 'pasuperct'],
    [/^pa\.?$/i, 'pa'],

    // Federal appeals courts with more specific patterns
    [/^d\.?c\.?\s+cir\.?$/i, 'cadc'],
    [/^fed\.?\s+cir\.?$/i, 'cafc'],
  ]

  for (const [pattern, handler] of abbreviationPatterns) {
    const match = parenString.match(pattern)
    if (match) {
      const result = typeof handler === 'string' ? handler : handler(match)
      if (result) return result
    }
  }

  // Then try exact match from COURTS database
  for (const court of COURTS) {
    if (court.regex && Array.isArray(court.regex)) {
      // Try each regex pattern in the array
      for (const regexPattern of court.regex) {
        try {
          // Replace ${coa} placeholder with actual pattern
          const processedPattern = regexPattern.replace(
            '${coa}',
            '(?:Court of Appeals?|Ct\\.? of App\\.?)',
          )
          const regex = new RegExp(processedPattern, 'i')
          if (regex.test(parenString)) {
            return court.id
          }
        } catch (_e) {}
      }
    }

    // Try matching citation string
    if (court.citation_string) {
      const courtNorm = court.citation_string
        .toLowerCase()
        .replace(/[.,]/g, '')
        .replace(/\s+/g, ' ')
      if (normalized === courtNorm) {
        return court.id
      }
    }
  }

  return null
}

/**
 * Add pre citation metadata
 */
export function addPreCitation(citation: FullCaseCitation, document: Document): void {
  if (citation.metadata.plaintiff || citation.metadata.defendant) {
    return
  }

  const m = matchOnTokens(document.words, citation.index - 1, PRE_FULL_CITATION_REGEX, {
    forward: false,
    stringsOnly: true,
  })

  if (!m) return

  if (m.groups?.pinCite) {
    const [start, end] = [m.index || 0, (m.index || 0) + m[0].length]
    citation.metadata.pinCiteSpanStart = citation.span().start - (end - start)
  }

  citation.metadata.pinCite = cleanPinCite(m.groups?.pinCite) || undefined
  citation.metadata.antecedentGuess = m.groups?.antecedent
  const matchLength = m[0].length
  citation.fullSpanStart = citation.span().start - matchLength
}

/**
 * Add law citation metadata
 */
export function addLawMetadata(citation: FullLawCitation, words: Tokens): void {
  const m = matchOnTokens(words, citation.index + 1, POST_LAW_CITATION_REGEX, { stringsOnly: true })

  if (!m) return

  citation.fullSpanEnd = citation.span().end + m[0].length
  citation.metadata.pinCite = cleanPinCite(m.groups?.pinCite) || undefined
  citation.metadata.publisher = m.groups?.publisher
  citation.metadata.day = m.groups?.day
  citation.metadata.month = m.groups?.month
  citation.metadata.parenthetical = processParenthetical(m.groups?.parenthetical)
  citation.metadata.year = m.groups?.year

  if (m.groups?.year) {
    citation.year = getYear(m.groups.year)
  }
}

/**
 * Add journal citation metadata
 */
export function addJournalMetadata(citation: FullJournalCitation, words: Tokens): void {
  const m = matchOnTokens(words, citation.index + 1, POST_JOURNAL_CITATION_REGEX, {
    stringsOnly: true,
  })

  if (!m) return

  citation.fullSpanEnd = citation.span().end + m[0].length
  citation.metadata.pinCite = cleanPinCite(m.groups?.pinCite) || undefined
  citation.metadata.parenthetical = processParenthetical(m.groups?.parenthetical)
  citation.metadata.year = m.groups?.year

  if (m.groups?.year) {
    citation.year = getYear(m.groups.year)
  }
}
