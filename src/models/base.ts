export interface Groups {
  [key: string]: string | undefined
}

export interface Span {
  start: number
  end: number
}

export abstract class CitationBase {
  token: Token
  index: number
  spanStart?: number
  spanEnd?: number
  fullSpanStart?: number
  fullSpanEnd?: number
  groups: Groups = {}
  metadata: Metadata
  document?: Document

  constructor(
    token: Token,
    index: number,
    metadata?: Partial<Metadata>,
    spanStart?: number,
    spanEnd?: number,
    fullSpanStart?: number,
    fullSpanEnd?: number,
  ) {
    this.token = token
    this.index = index
    this.spanStart = spanStart
    this.spanEnd = spanEnd
    this.fullSpanStart = fullSpanStart
    this.fullSpanEnd = fullSpanEnd
    this.groups = token.groups || {}
    this.metadata = new Metadata(metadata)

    // Set known missing page numbers to null
    if (this.groups.page && /^_+$/.test(this.groups.page)) {
      this.groups.page = null
    }
  }

  toString(): string {
    const parts = [`${this.constructor.name}("${this.matchedText()}"`]
    if (Object.keys(this.groups).length > 0) {
      parts.push(`, groups=${JSON.stringify(this.groups)}`)
    }
    parts.push(`, metadata=${JSON.stringify(this.metadata)}`)
    parts.push(')')
    return parts.join('')
  }

  correctedCitation(): string {
    return this.matchedText()
  }

  correctedCitationFull(): string {
    return this.matchedText()
  }

  dump(): Record<string, unknown> {
    return {
      groups: this.groups,
      metadata: Object.fromEntries(
        Object.entries(this.metadata).filter(([_, v]) => v !== undefined),
      ),
    }
  }

  matchedText(): string {
    return this.token.toString()
  }

  span(): Span {
    return {
      start: this.spanStart ?? this.token.start,
      end: this.spanEnd ?? this.token.end,
    }
  }

  spanWithPincite(): Span {
    const starts = [this.metadata.pinCiteSpanStart, this.spanStart, this.token.start].filter(
      (v) => v !== undefined,
    ) as number[]

    const ends = [this.metadata.pinCiteSpanEnd, this.token.end, this.spanEnd].filter(
      (v) => v !== undefined,
    ) as number[]

    return {
      start: Math.min(...starts, this.token.start),
      end: Math.max(...ends, this.token.end),
    }
  }

  fullSpan(): Span {
    return {
      start: this.fullSpanStart ?? this.span().start,
      end: this.fullSpanEnd ?? this.span().end,
    }
  }

  abstract hash(): string
}

export class Metadata {
  parenthetical?: string
  pinCite?: string
  pinCiteSpanStart?: number
  pinCiteSpanEnd?: number
  year?: string | number
  month?: string
  day?: string
  court?: string
  plaintiff?: string
  defendant?: string
  subject?: string
  extra?: string
  antecedentGuess?: string
  resolvedCaseNameShort?: string
  resolvedCaseName?: string
  publisher?: string
  volume?: string
  journal?: string
  journalName?: string
  reporter?: string
  chapter?: string
  section?: string
  title?: string
  page?: string
  yearRange?: string
  endYear?: number
  warnings?: string[]

  constructor(data?: Partial<Metadata>) {
    if (data) {
      Object.assign(this, data)
    }
  }
}

export abstract class Token {
  data: string
  start: number
  end: number
  groups: Groups = {}

  constructor(data: string, start: number, end: number, groups: Groups = {}) {
    this.data = data
    this.start = start
    this.end = end
    this.groups = groups
  }

  toString(): string {
    return this.data
  }

  merge(other: Token): Token | null {
    if (
      this.start === other.start &&
      this.end === other.end &&
      this.constructor === other.constructor &&
      JSON.stringify(this.groups) === JSON.stringify(other.groups)
    ) {
      return this
    }
    return null
  }

  static fromMatch(match: RegExpExecArray, extra: Record<string, unknown>, offset = 0): Token {
    // Get the captured group (1) or fall back to full match (0)
    const captureIndex = match.length > 1 && match[1] !== undefined ? 1 : 0
    const matchText = match[captureIndex]

    // Calculate start position based on the captured group
    let start = (match.index || 0) + offset
    if (captureIndex > 0 && match[0]) {
      // Find where the capture starts within the full match
      const captureOffset = match[0].indexOf(match[captureIndex])
      if (captureOffset > 0) {
        start += captureOffset
      }
    }

    const end = start + matchText.length
    const groups: Groups = {}

    // Extract named groups if available
    if (match.groups) {
      Object.assign(groups, match.groups)
    }

    // This will be overridden by subclasses
    // @ts-ignore - We know this is called on subclasses
    return new Token(matchText, start, end, groups, extra)
  }
}

export type TokenOrStr = Token | string
export type Tokens = TokenOrStr[]

export interface Document {
  plainText: string
  markupText?: string
  citationTokens: Array<[number, Token]>
  words: Tokens
  cleanSteps?: Array<string | ((text: string) => string)>
  emphasisTags: Array<[string, number, number]>
  sourceText: string
  plainToMarkup?: import('../span-updater').SpanUpdater
  markupToPlain?: import('../span-updater').SpanUpdater
}

// Resource represents something that a citation references
export class Resource {
  citation: unknown

  constructor(citation: unknown) {
    this.citation = citation
  }

  // Override toString to make resources comparable
  toString(): string {
    return `Resource(${this.citation.toString()})`
  }
}

// ResourceType can be any object that represents a resource
export type ResourceType = unknown
