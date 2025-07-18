import { Token } from './base'
import type { Edition } from './reporters'

export class CitationToken extends Token {
  exactEditions: Edition[] = []
  variationEditions: Edition[] = []
  short = false

  constructor(
    data: string,
    start: number,
    end: number,
    groups = {},
    extra: Record<string, unknown> = {},
  ) {
    super(data, start, end, groups)
    this.exactEditions = extra.exactEditions || []
    this.variationEditions = extra.variationEditions || []
    this.short = extra.short || false
  }

  merge(other: Token): Token | null {
    const merged = super.merge(other)
    if (merged && other instanceof CitationToken) {
      if (this.short === other.short) {
        // Combine editions and remove duplicates
        const exactSet = new Set([...this.exactEditions, ...other.exactEditions])
        const variationSet = new Set([...this.variationEditions, ...other.variationEditions])
        this.exactEditions = Array.from(exactSet)
        this.variationEditions = Array.from(variationSet)
        return this
      }
    }
    return null
  }
}

export class SectionToken extends Token {}

export class SupraToken extends Token {}

export class IdToken extends Token {}

export class ParagraphToken extends Token {}

export class StopWordToken extends Token {
  static fromMatch(match: RegExpExecArray, extra: Record<string, unknown>, offset = 0): Token {
    // Get the captured stop word (group 1)
    const captureIndex = match.length > 1 && match[1] !== undefined ? 1 : 0
    const matchText = match[captureIndex]
    
    // Calculate start position based on the full match
    let start = (match.index || 0) + offset
    if (captureIndex > 0 && match[0]) {
      // Find where the capture starts within the full match
      const captureOffset = match[0].indexOf(match[captureIndex])
      if (captureOffset > 0) {
        start += captureOffset
      }
    }
    
    const end = start + matchText.length
    
    // Set the stop_word in groups
    const groups = match.groups || {}
    groups.stop_word = matchText.toLowerCase()
    
    return new StopWordToken(matchText, start, end, groups, extra)
  }
}

export class PlaceholderCitationToken extends Token {}

export class CaseReferenceToken extends Token {}

export class LawCitationToken extends Token {
  reporter: string
  lawType: string

  constructor(
    data: string,
    start: number,
    end: number,
    groups = {},
    extra: Record<string, unknown> = {},
  ) {
    super(data, start, end, groups)
    this.reporter = extra.reporter || ''
    this.lawType = extra.lawType || 'leg_statute'
  }

  static fromMatch(match: RegExpExecArray, extra: Record<string, unknown>, offset = 0): Token {
    // For law citations, always use the full match (match[0])
    const matchText = match[0]
    const start = (match.index || 0) + offset
    const end = start + matchText.length
    
    // Extract named groups
    const groups = match.groups || {}
    
    return new LawCitationToken(matchText, start, end, groups, extra)
  }
}

export class JournalCitationToken extends Token {
  journal: string
  journalName: string

  constructor(
    data: string,
    start: number,
    end: number,
    groups = {},
    extra: Record<string, unknown> = {},
  ) {
    super(data, start, end, groups)
    this.journal = extra.journal || ''
    this.journalName = extra.journalName || ''
  }

  static fromMatch(match: RegExpExecArray, extra: Record<string, unknown>, offset = 0): Token {
    // For journal citations, always use the full match (match[0])
    const matchText = match[0]
    const start = (match.index || 0) + offset
    const end = start + matchText.length
    
    // Extract named groups
    const groups = match.groups || {}
    
    return new JournalCitationToken(matchText, start, end, groups, extra)
  }
}

