import crypto from 'node:crypto'

export const REPORTERS_THAT_NEED_PAGE_CORRECTION = new Set(['NY Slip Op', 'Misc. 3d'])

// Names not allowed to be reference citations
export const DISALLOWED_NAMES = [
  // Common options
  'state',
  'united states',
  'people',
  'commonwealth',
  'mass',
  'commissioner',
  // AGs (Attorney Generals)
  'akerman',
  'ashcroft',
  'barr',
  'bates',
  'bell',
  'berrien',
  'biddle',
  'black',
  'bonaparte',
  'bork',
  'bondi',
  'bradford',
  'breckinridge',
  'brewster',
  'brownell',
  'butler',
  'civiletti',
  'clark',
  'clement',
  'clifford',
  'crittenden',
  'cummings',
  'cushing',
  'daugherty',
  'devens',
  'evarts',
  'filip',
  'garland',
  'gerson',
  'gilpin',
  'gonzales',
  'gregory',
  'griggs',
  'grundy',
  'harmon',
  'hoar',
  'holder',
  'jackson',
  'johnson',
  'katzenbach',
  'keisler',
  'kennedy',
  'kleindienst',
  'knox',
  'lee',
  'legaré',
  'levi',
  'lincoln',
  'lynch',
  'macveagh',
  'mason',
  'mcgranery',
  'mcgrath',
  'mckenna',
  'mcreynolds',
  'meese',
  'miller',
  'mitchell',
  'moody',
  'mukasey',
  'murphy',
  'nelson',
  'olney',
  'palmer',
  'pierrepont',
  'pinkney',
  'randolph',
  'reno',
  'richardson',
  'rodney',
  'rogers',
  'rush',
  'sargent',
  'saxbe',
  'sessions',
  'smith',
  'speed',
  'stanbery',
  'stanton',
  'stone',
  'taft',
  'taney',
  'thornburgh',
  'toucey',
  'whitacker',
  'wickersham',
  'williams',
  'wirt',
]

/**
 * Strip punctuation from a string
 * Adapted from nltk Penn Treebank tokenizer
 */
export function stripPunct(text: string): string {
  // Starting quotes
  text = text.replace(/^["']/, '')
  text = text.replace(/``/g, '')
  text = text.replace(/([ ([{<])"/g, '$1')

  // Punctuation
  text = text.replace(/\.\.\./g, '')
  text = text.replace(/[,;:@#$%&]/g, '')
  text = text.replace(/([^.])(\.)([\])}>"']*)\s*$/g, '$1')
  text = text.replace(/[?!]/g, '')
  text = text.replace(/([^'])' /g, '$1')

  // Parens, brackets, etc.
  text = text.replace(/[\][(){}<>]/g, '')
  text = text.replace(/--/g, '')

  // Ending quotes
  text = text.replace(/"/g, '')
  text = text.replace(/(\S)(''?)/g, '$1')

  return text.trim()
}

/**
 * Check if HTML is balanced
 */
export function isBalancedHtml(text: string): boolean {
  // Fast check for strings without angle brackets
  if (!text.includes('<') && !text.includes('>')) {
    return true
  }

  // Simple tag balance check
  const tagStack: string[] = []
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g
  let match

  while ((match = tagRegex.exec(text)) !== null) {
    const [fullMatch, tagName] = match
    
    if (fullMatch.startsWith('</')) {
      // Closing tag
      if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName.toLowerCase()) {
        return false
      }
      tagStack.pop()
    } else if (!fullMatch.endsWith('/>')) {
      // Opening tag (not self-closing)
      tagStack.push(tagName.toLowerCase())
    }
  }

  return tagStack.length === 0
}

/**
 * Wrap HTML tags with before and after strings
 */
export function wrapHtmlTags(text: string, before: string, after: string): string {
  return text.replace(/(<[^>]+>)/g, `${before}$1${after}`)
}

/**
 * Hash a dictionary in a deterministic way
 */
export function hashSha256(dictionary: Record<string, any>): bigint {
  // Convert to JSON string
  const jsonStr = JSON.stringify(dictionary, Object.keys(dictionary).sort())
  
  // Convert to bytes and calculate hash
  const hash = crypto.createHash('sha256')
  hash.update(jsonStr)
  const hashBytes = hash.digest()
  
  // Convert to bigint
  return BigInt(`0x${hashBytes.toString('hex')}`)
}

/**
 * Validate that a name is valid for citation purposes
 */
export function isValidName(name: string): boolean {
  return (
    typeof name === 'string' &&
    name.length > 2 &&
    /^[A-Z]/.test(name) &&
    !name.endsWith('.') &&
    !/^\d+$/.test(name) &&
    !DISALLOWED_NAMES.includes(name.toLowerCase())
  )
}

/**
 * Try to balance style tags in HTML
 */
export function maybeBalanceStyleTags(
  start: number,
  end: number,
  plainText: string,
  tolerance = 10,
): [number, number, string] {
  let spanText = plainText.slice(start, end)
  const styleTags = ['i', 'em', 'b']
  
  let newStart = start
  let newEnd = end

  for (const tag of styleTags) {
    const openingTag = `<${tag}>`
    const closingTag = `</${tag}>`
    const hasOpening = spanText.includes(openingTag)
    const hasClosing = spanText.includes(closingTag)
    
    if (hasOpening && !hasClosing) {
      // Look for closing tag after the end
      const extendedEnd = Math.min(
        end + closingTag.length + tolerance,
        plainText.length,
      )
      const searchText = plainText.slice(start, extendedEnd)
      const closeIndex = searchText.indexOf(closingTag)
      
      if (closeIndex !== -1 && closeIndex >= spanText.length) {
        newEnd = start + closeIndex + closingTag.length
      }
    }
    
    if (!hasOpening && hasClosing) {
      // Look for opening tag before the start
      const extendedStart = Math.max(start - openingTag.length - tolerance, 0)
      const searchText = plainText.slice(extendedStart, end)
      const openIndex = searchText.lastIndexOf(openingTag)
      
      if (openIndex !== -1) {
        newStart = extendedStart + openIndex
      }
    }
    
    spanText = plainText.slice(newStart, newEnd)
  }

  return [newStart, newEnd, spanText]
}

/**
 * Create placeholder HTML to identify annotation locations
 */
export function placeholderMarkup(html: string): string {
  const tagRe = /<(\/?[a-z])[^>]*>/gi
  
  function replace(match: string): string {
    if (match.startsWith('</')) {
      return `</${'X'.repeat(match.length - 3)}>`
    } else {
      return `<${'X'.repeat(match.length - 2)}>`
    }
  }
  
  return html.replace(tagRe, replace)
}

/**
 * Dump citations for debugging
 */
export function dumpCitations(
  citations: any[],
  text: string,
  contextChars = 30,
): string {
  const out: string[] = []
  const greenFmt = '\x1b[32m'
  const blueFmt = '\x1b[94m'
  const boldFmt = '\x1b[1m'
  const endFmt = '\x1b[0m'
  
  for (const citation of citations) {
    const [start, end] = citation.span()
    const contextBefore = text
      .slice(Math.max(0, start - contextChars), start)
      .split('\n')
      .pop()?.trimStart()
    const matchedText = text.slice(start, end)
    const contextAfter = text
      .slice(end, end + contextChars)
      .split('\n')[0]
      .trimEnd()
    
    out.push(
      `${greenFmt}${citation.constructor.name}:${endFmt} ` +
      `${contextBefore}` +
      `${blueFmt}${boldFmt}${matchedText}${endFmt}` +
      `${contextAfter}`
    )
    
    for (const [key, value] of Object.entries(citation.dump())) {
      if (value) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          out.push(`  * ${key}`)
          for (const [subKey, subValue] of Object.entries(value)) {
            out.push(`    * ${subKey}=${JSON.stringify(subValue)}`)
          }
        } else {
          out.push(`  * ${key}=${JSON.stringify(value)}`)
        }
      }
    }
  }
  
  return out.join('\n')
}