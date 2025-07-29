// Helper functions for building regexes

export function spaceBoundariesRe(regex: string): string {
  return `(?:^|\\s)${regex}(?=\\s|$)`
}

export function stripPunctuationRe(regex: string): string {
  return `${PUNCTUATION_REGEX}(${regex})${PUNCTUATION_REGEX}`
}

export function nonalphanumBoundariesRe(regex: string): string {
  return `(?:^|[^a-zA-Z0-9])(${regex})(?:[^a-zA-Z0-9]|$)`
}

export function shortCiteRe(regex: string): string {
  // Convert a full citation regex into a short citation regex
  // We need to replace the pattern before (?<page> with the short citation pattern
  // This handles cases like "1 U. S., at 2"

  // Find the position of (?<page>
  const pageIndex = regex.indexOf('(?<page>')
  if (pageIndex === -1) return regex

  // Find the last \s+ before (?<page>
  const beforePage = regex.substring(0, pageIndex)
  const afterPage = regex.substring(pageIndex)

  // Replace the last \s+ (single backslash) with the short citation pattern
  // Use single backslashes in the replacement since the regex string already has them
  // Replace the last whitespace pattern with the short citation pattern
  // Handle both \s+ and plain spaces, as well as optional comma patterns
  let beforePageModified = beforePage
  
  if (beforePage.endsWith('\\s+')) {
    // Replace \s+ with the short citation pattern
    beforePageModified = beforePage.replace(/\\s\+$/, '(?:,\\s*|\\s+)at\\s+(?:p\\.\\s+)?')
  } else if (beforePage.endsWith(' ')) {
    // Replace trailing space with the short citation pattern
    beforePageModified = beforePage.replace(/ $/, '(?:,\\s*|\\s+)at\\s+(?:p\\.\\s+)?')
  } else if (beforePage.endsWith(',? ')) {
    // Replace optional comma and space with the short citation pattern
    beforePageModified = beforePage.replace(/,\? $/, '(?:,\\s*|\\s+)at\\s+(?:p\\.\\s+)?')
  }
  
  return beforePageModified + afterPage
}

export function referencePinCiteRe(regexes: string[]): string {
  // Create a reference pin-cite regex pattern
  // The pattern should match case names followed by optional text and then a pin cite
  // This allows for patterns like:
  // - "Lissner at 5" (case name + pin cite)
  // - "Lissner, 1 U.S. at 5" (case name + reporter + pin cite)
  const pinCiteRe = `\\b(?:${regexes.join('|')})(?:,?\\s+(?:\\d+\\s+[A-Z][A-Za-z.\\s]+?))?\\s*${PIN_CITE_REGEX}`
  return pinCiteRe
}

// Roman numeral regex (1-199 except 5, 50, 100)
export const ROMAN_NUMERAL_REGEX = [
  // 10-199, but not 50-59 or 100-109 or 150-159:
  'c?(?:xc|xl|l?x{1,3})(?:ix|iv|v?i{0,3})',
  // 1-9, 51-59, 101-109, 151-159, but not 5, 55, 105, 155:
  '(?:c?l?)(?:ix|iv|v?i{1,3})',
  // 55, 105, 150, 155:
  '(?:lv|cv|cl|clv)',
].join('|')

// Page number regex
export const PAGE_NUMBER_REGEX = `(?:\\d+(?:-[A-Z])?|${ROMAN_NUMERAL_REGEX}|_+)`

// Punctuation regex
export const PUNCTUATION_REGEX = '[^\\sa-zA-Z0-9]*'

// Id token regex
export const ID_REGEX = spaceBoundariesRe('(id\\.[,;:]?|ibid\\.)')

// Supra token regex
export const SUPRA_REGEX = spaceBoundariesRe(stripPunctuationRe('supra'))

// Stop words
export const STOP_WORDS = [
  'v',
  'in re',
  're',
  'quoting',
  'e.g.',
  'parte',
  'denied',
  'citing',
  "aff'd",
  'affirmed',
  'remanded',
  'see also',
  'see',
  'granted',
  'dismissed',
  'Cf',
]

export const STOP_WORD_REGEX = spaceBoundariesRe(stripPunctuationRe(`(${STOP_WORDS.join('|')})`))

// Section token regex
export const SECTION_REGEX = '(\\S*§\\S*)'

// Paragraph token regex
export const PARAGRAPH_REGEX = '(\\n)'

// Common placeholder reporters
const COMMON_PLACEHOLDER_REPORTERS = [
  'A\\.?2d',
  'A\\.?3d',
  'AD3d',
  'Cal\\.',
  'F\\.?3d',
  'F\\.Supp\\.2d',
  'Idaho',
  'Iowa',
  'L\\.Ed\\.',
  'Mass\\.',
  'N\\.?J\\.?',
  'N\\.C\\.\\s?App\\.',
  'N\\.E\\.3d',
  'N\\.J\\.\\sSuper\\.(\\sat)?',
  'N\\.W\\.2d',
  'N\\.W\\.3d',
  'N\\.?Y\\.?',
  'Nev\\.',
  'NY3d',
  'Ohio\\sSt\\.3d',
  'P\\.?3d',
  'S\\.?E\\.?2d',
  'S\\.?E\\.?3d',
  'S\\.?W\\.?2d',
  'S\\.?W\\.?3d',
  'S\\.C\\.',
  'S\\.Ct\\.',
  'So\\.?3d',
  'U\\.\\s?S\\.',
  'W\\.Va\\.',
  'Wis\\.\\s?2d',
]

export const PLACEHOLDER_CITATIONS = `([_—–-]+\\s(${COMMON_PLACEHOLDER_REPORTERS.join(
  '|',
)})\\s[_—–-]+)`

// Pin cite token regex
export const PIN_CITE_TOKEN_REGEX = `(?:(?:(?:&\\ )?note|(?:&\\ )?nn?\\.?|(?:&\\ )?fn?\\.?|¶{1,2}|§{1,2}|\\*{1,4}|pg\\.?|pp?\\.?)\\ ?)?(?:\\d+:\\d+(?:[-–—]\\d+(?::\\d+)?)?|[*]?\\d+(?:[-–—]\\d+)?)`

export const PIN_CITE_REGEX = `(?<pinCite>,?\\ ?(?:at\\ )?${PIN_CITE_TOKEN_REGEX}(?:,\\ ?${PIN_CITE_TOKEN_REGEX})*(?=[,.;)\\]\\\\]|\\ ?[(\\[]|$))`

// Month regex with named group
export const MONTH_REGEX = `
    (?<month>
        January|Jan\\.|
        February|Feb\\.|
        March|Mar\\.|
        April|Apr\\.|
        May|
        June|Jun\\.|
        July|Jul\\.|
        August|Aug\\.|
        September|Sept?\\.|
        October|Oct\\.|
        November|Nov\\.|
        December|Dec\\.
    )
`.replace(/\s+/g, ' ')

// Month regex without named group (for embedding)
export const MONTH_REGEX_INNER = `(?:January|Jan\\.|February|Feb\\.|March|Mar\\.|April|Apr\\.|May|June|Jun\\.|July|Jul\\.|August|Aug\\.|September|Sept?\\.|October|Oct\\.|November|Nov\\.|December|Dec\\.)`

// Year regex with named group
export const YEAR_REGEX = `
    (?:
        (?<year>
            \\d{4}
        )
        # Year is occasionally a range, like "1993-94" or "2005-06".
        # For now we ignore the end of the range:
        (?:-\\d{2})?
    )
`.replace(/\s+/g, ' ')

// DOL Opinion Letter regex
export const DOL_OPINION_REGEX = `DOL Opinion Letter (?<subject>\\w+) (?<year>\\d{4})-(?<number>\\d{1,2}) \\((?<date>${MONTH_REGEX_INNER} \\d{1,2}, \\d{4})\\)`

// Year regex without named group (for embedding)
export const YEAR_REGEX_INNER = `
    (?:
        \\d{4}
        # Year is occasionally a range, like "1993-94" or "2005-06".
        # For now we ignore the end of the range:
        (?:-\\d{2})?
    )
`.replace(/\s+/g, ' ')

// Law subsection regex
export const LAW_SUBSECTION = '(?:\\([0-9a-zA-Z]{1,4}\\))'

// Law pin cite regex
export const LAW_PIN_CITE_REGEX = `
    (?<pinCite>
        # subsection like (a)(1)(xiii):
        ${LAW_SUBSECTION}*
        (?:\\ and\\ ${LAW_SUBSECTION}+)?
        (?:\\ et\\ seq\\.)?
    )
`.replace(/\s+/g, ' ')

// Short cite antecedent regex
export const SHORT_CITE_ANTECEDENT_REGEX = `
    (?<antecedent>[A-Za-z][\\w\\-.]+)\\ ?,?
    \\   # final space
`.replace(/\s+/g, ' ')

// Supra antecedent regex
export const SUPRA_ANTECEDENT_REGEX = `
    (?:
        (?<antecedent>[\\w\\-.]+),?\\s+(?<volume>\\d+)\\s+|
        (?<volume>\\d+)\\s+|
        (?<antecedent>[\\w\\-.]+),?\\s+
    )
`.replace(/\s+/g, ' ')

// Parenthetical regex
export const PARENTHETICAL_REGEX = `
    (?:
        # optional space, opening paren
        \\ ?\\(
            # capture until last end paren, we'll trim off extra afterwards
            (?<parenthetical>.*)
           \\)
    )?
`.replace(/\s+/g, ' ')

// Post full citation regex - Note: this is constructed differently to avoid duplicate named groups
export const POST_FULL_CITATION_REGEX = `
    (?: # handle a full cite with a valid court+date paren:
        # content before court+date paren:
        (?:
            # pin cite with comma and extra:
            (?:
                (?<pinCite>
                    ,?\\ ?(?:at\\ )?
                    ${PIN_CITE_TOKEN_REGEX}
                    (?:\\ ?[-–—]\\ ?${PIN_CITE_TOKEN_REGEX})?
                )
                (?=
                    [,.;)\\]\\\\]|
                    \\ ?[(\\[]|
                    $
                )
            )?
            ,?\\ ?
            (?<extra>[^(;]*)
        )
        # content within court+date paren:
        [\\(\\[] # opening paren or bracket
        (?:
            (?:
                (?<court>.*?) # treat anything before date as court
                (?= # lookahead to stop when we see a month or year
                    \\s+${MONTH_REGEX_INNER} |
                    \\s+${YEAR_REGEX_INNER}
                )
            )?
            \\ ?
            (?<month>${MONTH_REGEX_INNER})?\\ ?   # optional month
            (?<day>\\d{1,2})?\\,?\\ ?      # optional day and comma
            (?<year>${YEAR_REGEX_INNER})         # year is required
        )
        [\\)\\]] # closing paren or bracket
        # optional parenthetical comment:
        (?:
            \\ ?\\(
            (?<parenthetical>.*)
            \\)
        )?
    |  # handle a pin cite with no valid court+date paren:
        (?<pinCite2>
            ,?\\ ?(?:at\\ )?
            ${PIN_CITE_TOKEN_REGEX}
            (?:\\ ?-\\ ?${PIN_CITE_TOKEN_REGEX})?
        )
        (?=
            [,.;)\\]\\\\]|
            \\ ?[(\\[]|
            $
        )
    )
`.replace(/\s+/g, ' ')

// Pre full citation regex
export const PRE_FULL_CITATION_REGEX = `
    # single word antecedent
    (?<antecedent>[A-Z][a-z\\-.]+)\\ ?,?
    # optional pincite
    ${PIN_CITE_REGEX}?
    # PIN_CITE_REGEX uses a positive lookahead for end characters, but we
    # must also capture them to calculate spans
    ,?\\ ?
`.replace(/\s+/g, ' ')

// Post short citation regex
export const POST_SHORT_CITATION_REGEX = `
    # optional pin cite
    ${PIN_CITE_REGEX}?
    \\ ?
    # optional parenthetical comment:
    ${PARENTHETICAL_REGEX}
`.replace(/\s+/g, ' ')

// Post law citation regex
export const POST_LAW_CITATION_REGEX = `
    ${LAW_PIN_CITE_REGEX}?
    \\ ?
    (?:\\(
        # Consol., McKinney, Deering, West, LexisNexis, etc.
        (?<publisher>
            [A-Z][a-z]+\\.?
            (?:\\ Supp\\.)?
        )?
        \\ ?
        # month
        (?:${MONTH_REGEX}\\ )?
        # day
        (?<day>\\d{1,2})?,?\\ ?
        # four-digit year
        ${YEAR_REGEX}?
    \\))?
    \\ ?
    # parenthetical
    ${PARENTHETICAL_REGEX}
`.replace(/\s+/g, ' ')

// Post journal citation regex
export const POST_JOURNAL_CITATION_REGEX = `
    ${PIN_CITE_REGEX}?
    \\ ?
    (?:\\(${YEAR_REGEX}\\))?
    \\ ?
    ${PARENTHETICAL_REGEX}
`.replace(/\s+/g, ' ')

// Defendant year regex
export const DEFENDANT_YEAR_REGEX = '(?<defendant>.*)\\s\\((?<year>\\d{4})\\)$'
