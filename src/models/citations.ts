import { createHash } from 'node:crypto'
import { addPostCitation, findCaseName, findCaseNameInHtml } from '../helpers'
import { CitationBase, type Document, type Metadata, type Token } from './base'
import { type Edition, includesYear } from './reporters'

export const REPORTERS_THAT_NEED_PAGE_CORRECTION = new Set([
  'U.S.',
  'S. Ct.',
  'L. Ed.',
  'L. Ed. 2d',
])

function hashSha256(data: unknown): string {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(data))
  return hash.digest('hex')
}

export abstract class ResourceCitation extends CitationBase {
  exactEditions: Edition[] = []
  variationEditions: Edition[] = []
  allEditions: Edition[] = []
  editionGuess?: Edition
  year?: number

  constructor(
    token: Token,
    index: number,
    exactEditions: Edition[] = [],
    variationEditions: Edition[] = [],
    metadata?: Partial<Metadata>,
  ) {
    super(token, index, metadata)
    this.exactEditions = exactEditions
    this.variationEditions = variationEditions
    this.allEditions = [...exactEditions, ...variationEditions]
  }

  hash(): string {
    const data = {
      ...this.groups,
      allEditions: this.allEditions
        .map((e) => ({
          shortName: e.shortName,
          reporter: e.reporter.shortName,
        }))
        .sort((a, b) => a.shortName.localeCompare(b.shortName)),
      class: this.constructor.name,
    }
    return hashSha256(data)
  }

  addMetadata(_document: Document): void {
    this.guessEdition()
  }

  dump(): Record<string, any> {
    return {
      ...super.dump(),
      year: this.year,
    }
  }

  correctedReporter(): string {
    return this.editionGuess ? this.editionGuess.shortName : this.groups.reporter || ''
  }

  correctedCitation(): string {
    let corrected = this.matchedText()
    if (this.editionGuess && this.groups.reporter) {
      corrected = corrected.replace(this.groups.reporter, this.editionGuess.shortName)
    }

    const correctedPage = this.correctedPage()
    if (correctedPage && this.groups.page && correctedPage !== this.groups.page) {
      corrected = corrected.replace(this.groups.page, correctedPage)
    }

    return corrected
  }

  correctedPage(): string | undefined {
    const page = this.groups.page
    if (!page) return undefined

    let standardReporter = ''
    const reporter = this.groups.reporter
    if (reporter) {
      if (this.editionGuess) {
        standardReporter = this.editionGuess.shortName
      }
      if (
        REPORTERS_THAT_NEED_PAGE_CORRECTION.has(reporter) ||
        REPORTERS_THAT_NEED_PAGE_CORRECTION.has(standardReporter)
      ) {
        return page.replace('[U]', '(U)').replace('[A]', '(A)')
      }
    }

    return page
  }

  guessEdition(): void {
    // Use exact matches if possible, otherwise try variations
    const editions = this.exactEditions.length > 0 ? this.exactEditions : this.variationEditions
    if (editions.length === 0) return

    // Attempt resolution by date
    if (editions.length > 1 && this.year) {
      const filteredEditions = editions.filter((e) => includesYear(e, this.year!))
      if (filteredEditions.length === 1) {
        this.editionGuess = filteredEditions[0]
        return
      }
    }

    // If we have exactly one edition, use it
    if (editions.length === 1) {
      this.editionGuess = editions[0]
    }
    // Otherwise, leave editionGuess as null for ambiguous cases
  }
}

export abstract class FullCitation extends ResourceCitation {}

export class FullLawCitation extends FullCitation {
  get volume(): string {
    // Law citations use different group names: chapter (C.F.R.), title (U.S.C.), or volume
    return this.groups.chapter || this.groups.title || this.groups.volume || ''
  }

  get reporter(): string {
    return this.groups.reporter || ''
  }

  get section(): string {
    return this.groups.section || ''
  }

  correctedCitationFull(): string {
    const parts = [this.correctedCitation()]
    const m = this.metadata

    if (m.pinCite) {
      parts.push(m.pinCite)
    }

    const publisherDate = [m.publisher, m.month, m.day, m.year].filter(Boolean).join(' ')
    if (publisherDate) {
      parts.push(` (${publisherDate})`)
    }

    if (m.parenthetical) {
      parts.push(` (${m.parenthetical})`)
    }

    return parts.join('')
  }
}

export class FullJournalCitation extends FullCitation {
  get reporter(): string {
    return this.metadata.journal || this.groups.journal || ''
  }

  get volume(): string {
    return this.groups.volume || ''
  }

  get page(): string {
    return this.groups.page || ''
  }

  correctedReporter(): string {
    return this.metadata.journal || this.groups.journal || ''
  }

  correctedCitationFull(): string {
    const parts = [this.correctedCitation()]
    const m = this.metadata

    if (m.pinCite) {
      parts.push(`, ${m.pinCite}`)
    }

    if (m.year) {
      parts.push(` (${m.year})`)
    }

    if (m.parenthetical) {
      parts.push(` (${m.parenthetical})`)
    }

    return parts.join('')
  }
}

export class CaseCitation extends ResourceCitation {
  get volume(): string {
    return this.groups.volume || ''
  }

  get reporter(): string {
    return this.correctedReporter()
  }

  get page(): string {
    return this.correctedPage() || ''
  }

  hash(): string {
    if (!this.groups.page) {
      // Use object identity for citations without pages
      return `unique-${Date.now()}-${Math.random()}`
    }

    const data = {
      volume: this.groups.volume,
      page: this.groups.page,
      reporter: this.correctedReporter(),
      class: this.constructor.name,
    }
    return hashSha256(data)
  }

  guessCourt(): void {
    if (!this.metadata.court && this.allEditions.some((e) => e.reporter.isScotus)) {
      this.metadata.court = 'scotus'
    }
  }
}

export class FullCaseCitation extends CaseCitation {
  isParallelCitation(preceding: CaseCitation): void {
    if (this.fullSpanStart === preceding.fullSpanStart) {
      this.metadata.defendant = preceding.metadata.defendant
      this.metadata.plaintiff = preceding.metadata.plaintiff
      this.metadata.year = preceding.metadata.year
      this.year = preceding.year
    }
  }

  addMetadata(document: Document): void {
    // Extract case name
    if (document.markupText) {
      findCaseNameInHtml(this, document, false)
      if (!this.metadata.plaintiff && !this.metadata.defendant) {
        findCaseName(this, document, false)
      }
    } else {
      findCaseName(this, document, false)
    }

    // Extract post-citation metadata (year, court, parentheticals)
    addPostCitation(this, document.words)

    this.guessCourt()
    this.guessEdition()
  }

  correctedCitationFull(): string {
    const parts = []
    const m = this.metadata

    if (m.plaintiff) {
      parts.push(`${m.plaintiff} v. `)
    }
    if (m.defendant) {
      parts.push(`${m.defendant}, `)
    }

    parts.push(this.correctedCitation())

    if (m.pinCite) {
      parts.push(`, ${m.pinCite}`)
    }
    if (m.extra) {
      parts.push(m.extra)
    }

    const publisherDate = [m.court, m.year].filter(Boolean).join(' ')
    if (publisherDate) {
      parts.push(` (${publisherDate})`)
    }

    if (m.parenthetical) {
      parts.push(` (${m.parenthetical})`)
    }

    return parts.join('')
  }
}

export class ShortCaseCitation extends CaseCitation {
  short = true

  correctedCitationFull(): string {
    const parts = []
    if (this.metadata.antecedentGuess) {
      parts.push(`${this.metadata.antecedentGuess}, `)
    }
    parts.push(this.correctedCitation())
    return parts.join('')
  }
}

export class SupraCitation extends CitationBase {
  hash(): string {
    return hashSha256({
      ...this.groups,
      class: this.constructor.name,
    })
  }

  formatted(): string {
    const parts = []
    const m = this.metadata

    if (m.antecedentGuess) {
      parts.push(`${m.antecedentGuess}, `)
    }
    if (m.volume) {
      parts.push(`${m.volume} `)
    }

    parts.push('supra')

    if (m.pinCite) {
      parts.push(`, ${m.pinCite}`)
    }

    return parts.join('')
  }
}

export class IdCitation extends CitationBase {
  hash(): string {
    // Always unique for safety
    return `unique-${Date.now()}-${Math.random()}`
  }

  formatted(): string {
    const parts = ['id.']
    if (this.metadata.pinCite) {
      parts.push(`, ${this.metadata.pinCite}`)
    }
    return parts.join('')
  }
}

export class IdLawCitation extends CitationBase {
  get section(): string {
    return this.groups.section || ''
  }

  get sectionMarker(): string {
    return this.groups.section_marker || ''
  }

  hash(): string {
    return hashSha256({
      section: this.section,
      sectionMarker: this.sectionMarker,
      class: this.constructor.name,
    })
  }

  formatted(): string {
    const parts = ['Id.']
    if (this.sectionMarker) {
      parts.push(` ${this.sectionMarker}`)
    }
    if (this.section) {
      parts.push(` ${this.section}`)
    }
    if (this.metadata.parenthetical) {
      parts.push(` (${this.metadata.parenthetical})`)
    }
    return parts.join('')
  }

  correctedCitation(): string {
    return this.formatted()
  }
}

export class ReferenceCitation extends CitationBase {
  static nameFields = ['plaintiff', 'defendant', 'resolvedCaseNameShort', 'resolvedCaseName']

  hash(): string {
    return hashSha256({
      ...this.groups,
      class: this.constructor.name,
    })
  }
}

export class UnknownCitation extends CitationBase {
  hash(): string {
    // Always unique for safety
    return `unique-${Date.now()}-${Math.random()}`
  }
}

export class DOLOpinionCitation extends CitationBase {
  get subject(): string {
    return this.groups.subject || ''
  }

  get year(): string {
    return this.groups.year || ''
  }

  get number(): string {
    return this.groups.number || ''
  }

  get date(): string {
    return this.groups.date || ''
  }

  hash(): string {
    return hashSha256({
      subject: this.subject,
      year: this.year,
      number: this.number,
      class: this.constructor.name,
    })
  }

  correctedCitationFull(): string {
    const parts = [`DOL Opinion Letter ${this.subject} ${this.year}-${this.number}`]
    
    if (this.date) {
      parts.push(` (${this.date})`)
    }

    if (this.metadata.pinCite) {
      parts.push(`, ${this.metadata.pinCite}`)
    }

    if (this.metadata.parenthetical) {
      parts.push(` (${this.metadata.parenthetical})`)
    }

    return parts.join('')
  }
}

export class CaseNameCitation extends ReferenceCitation {
  get plaintiff(): string {
    return this.groups.plaintiff || this.metadata.plaintiff || ''
  }

  get defendant(): string {
    return this.groups.defendant || this.metadata.defendant || ''
  }

  get subject(): string {
    return this.groups.inre_subject || this.groups.exparte_subject || this.metadata.subject || ''
  }

  hash(): string {
    return hashSha256({
      plaintiff: this.plaintiff,
      defendant: this.defendant,
      subject: this.subject,
      class: this.constructor.name,
    })
  }

  correctedCitationFull(): string {
    const parts = []
    
    if (this.plaintiff && this.defendant) {
      parts.push(`${this.plaintiff} v. ${this.defendant}`)
    } else if (this.subject) {
      // Check if it's an "In re" or "Ex parte" case
      if (this.matchedText().toLowerCase().startsWith('in re') || 
          this.matchedText().toLowerCase().startsWith('re ')) {
        parts.push(`In re ${this.subject}`)
      } else if (this.matchedText().toLowerCase().startsWith('ex parte')) {
        parts.push(`Ex parte ${this.subject}`)
      } else {
        parts.push(this.subject)
      }
    } else {
      parts.push(this.matchedText())
    }

    if (this.metadata.pinCite) {
      parts.push(`, ${this.metadata.pinCite}`)
    }

    if (this.metadata.parenthetical) {
      parts.push(` (${this.metadata.parenthetical})`)
    }

    return parts.join('')
  }

  formatted(): string {
    return this.correctedCitationFull()
  }
}
