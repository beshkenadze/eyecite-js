/**
 * Eyecite Tokenizer Customization Examples
 * 
 * This file demonstrates how to extend and customize the eyecite tokenizer system
 * to support new citation formats and modify existing patterns.
 */

import { 
  getCitations, 
  CustomTokenizer, 
  RegexPatternBuilder, 
  AhocorasickTokenizer,
  BaseTokenExtractor,
  CitationToken,
  Tokenizer
} from '../src/index'

// Example 1: Basic Custom Tokenizer Usage
console.log('=== Example 1: Basic Custom Tokenizer ===')

const basicTokenizer = new CustomTokenizer()

// Add a simple custom reporter pattern
basicTokenizer.addSimpleCitationPattern(
  'MyRep',
  'neutral',
  'My Custom Reporter'
)

const basicText = 'See 123 MyRep 456 for details.'
const basicCitations = getCitations(basicText, false, basicTokenizer)

console.log('Found citations:', basicCitations.length)
console.log('Reporter:', basicCitations[0]?.groups.reporter)
console.log('Volume:', basicCitations[0]?.groups.volume)
console.log('Page:', basicCitations[0]?.groups.page)
console.log()

// Example 2: Year-Page Format Citation
console.log('=== Example 2: Year-Page Format ===')

const yearPageTokenizer = new CustomTokenizer()

// Add a year-page format citation (like T.C. Memo. 2019-233)
yearPageTokenizer.addSimpleCitationPattern(
  'CustomMemo',
  'tax',
  'Custom Memorandum',
  { yearPageFormat: true }
)

const yearPageText = 'Reference CustomMemo 2023-145 for precedent.'
const yearPageCitations = getCitations(yearPageText, false, yearPageTokenizer)

console.log('Year-page citation found:', yearPageCitations.length > 0)
console.log('Volume (Year):', yearPageCitations[0]?.groups.volume)
console.log('Page:', yearPageCitations[0]?.groups.page)
console.log()

// Example 3: Hyphen Format Citation
console.log('=== Example 3: Hyphen Format ===')

const hyphenTokenizer = new CustomTokenizer()

// Add a hyphen format citation (like 1-CustomRep-123)
hyphenTokenizer.addSimpleCitationPattern(
  'CustomRep',
  'neutral',
  'Custom Hyphen Reporter',
  { hyphenFormat: true }
)

const hyphenText = 'See 1-CustomRep-123 for details.'
const hyphenCitations = getCitations(hyphenText, false, hyphenTokenizer)

console.log('Hyphen citation found:', hyphenCitations.length > 0)
console.log('Volume:', hyphenCitations[0]?.groups.volume)
console.log('Reporter:', hyphenCitations[0]?.groups.reporter)
console.log('Page:', hyphenCitations[0]?.groups.page)
console.log()

// Example 4: Multiple Custom Reporters
console.log('=== Example 4: Multiple Custom Reporters ===')

const multiTokenizer = new CustomTokenizer()

// Add multiple custom reporters at once
multiTokenizer.addMultipleReporters([
  { pattern: 'Rep1', name: 'Reporter One', citeType: 'neutral' },
  { pattern: 'Rep2', name: 'Reporter Two', citeType: 'state' },
  { pattern: 'HyphenRep', name: 'Hyphen Reporter', options: { hyphenFormat: true } }
])

const multiText = 'See 1 Rep1 10, also 2 Rep2 20, and 3-HyphenRep-30.'
const multiCitations = getCitations(multiText, false, multiTokenizer)

console.log('Multiple citations found:', multiCitations.length)
multiCitations.forEach((citation, index) => {
  console.log(`Citation ${index + 1}: ${citation.groups.volume} ${citation.groups.reporter} ${citation.groups.page}`)
})
console.log()

// Example 5: Pattern Modification
console.log('=== Example 5: Pattern Modification ===')

const modifyTokenizer = new CustomTokenizer()

// Add a standard pattern first
const extractor = modifyTokenizer.addSimpleCitationPattern('U.S.', 'federal', 'United States Reports')

// Test original pattern
let modifyText = '123 U.S. 456'
let modifyCitations = getCitations(modifyText, false, modifyTokenizer)
console.log('Original pattern found:', modifyCitations.length > 0)

// Modify pattern to accept commas
modifyTokenizer.modifyExtractorPatterns(
  (regex) => regex.replace('U\\.S\\.', 'U[.,]S[.,]'),
  (ext) => ext.strings?.includes('U.S.') || false
)

// Update strings for filtering
if (extractor.strings?.includes('U.S.')) {
  extractor.strings.push('U,S,')
}

// Test modified pattern
modifyText = '123 U,S, 456'
modifyCitations = getCitations(modifyText, false, modifyTokenizer)
console.log('Modified pattern found:', modifyCitations.length > 0)
console.log('Reporter with commas:', modifyCitations[0]?.groups.reporter)
console.log()

// Example 6: Using RegexPatternBuilder
console.log('=== Example 6: RegexPatternBuilder ===')

// Create flexible patterns using the pattern builder
const flexiblePattern = RegexPatternBuilder.flexibleReporter(['Custom', 'Rep'], '[.,\\s]')
console.log('Flexible pattern:', flexiblePattern)

const alternativePattern = RegexPatternBuilder.withAlternativePunctuation(
  'U.S. Reports', 
  { '.': '[.,]', ' ': '\\s+' }
)
console.log('Alternative punctuation pattern:', alternativePattern)

const optionalYear = RegexPatternBuilder.optional(
  '\\(' + RegexPatternBuilder.yearPattern() + '\\)'
)
console.log('Optional year pattern:', optionalYear)
console.log()

// Example 7: Performance Optimization with AhocorasickTokenizer
console.log('=== Example 7: Performance Optimization ===')

const perfTokenizer = new AhocorasickTokenizer()

// Add custom extractors
perfTokenizer.addSimpleCitationPattern = function(
  reporterPattern: string,
  citeType: string = 'neutral',
  reporterName: string = reporterPattern
) {
  // Create a basic citation extractor using our custom method
  const customExtractor = new BaseTokenExtractor(
    `(?<volume>\\d+)\\s+(?<reporter>${reporterPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s+(?<page>\\d+)`,
    CitationToken,
    { testData: true },
    0,
    [reporterPattern]
  )
  
  this.addExtractor(customExtractor)
  return customExtractor
}

// Add some extractors
perfTokenizer.addSimpleCitationPattern('FastRep1', 'neutral', 'Fast Reporter 1')
perfTokenizer.addSimpleCitationPattern('FastRep2', 'neutral', 'Fast Reporter 2')

const perfText = 'Contains 1 FastRep1 10 and some other text with 2 FastRep2 20.'
const perfCitations = getCitations(perfText, false, perfTokenizer)

console.log('Performance-optimized citations found:', perfCitations.length)
console.log('Statistics:')
perfTokenizer.getExtractors(perfText).forEach((ext, index) => {
  console.log(`  Extractor ${index + 1}: ${ext.strings?.join(', ') || 'No strings'}`)
})
console.log()

// Example 8: Custom Extractor with Advanced Features
console.log('=== Example 8: Advanced Custom Extractor ===')

const advancedTokenizer = new CustomTokenizer()

// Create a custom extractor with specific regex and extra data
advancedTokenizer.addCustomExtractor(
  '(?<type>STATUTE)\\s+(?<section>§\\s*\\d+(?:\\.\\d+)*)',
  CitationToken,
  { 
    citationType: 'statute',
    customField: 'example'
  },
  { 
    strings: ['STATUTE', '§']
  }
)

const advancedText = 'See STATUTE § 123.45 for reference.'
const advancedCitations = getCitations(advancedText, false, advancedTokenizer)

console.log('Advanced citation found:', advancedCitations.length > 0)
if (advancedCitations.length > 0) {
  console.log('Groups:', advancedCitations[0].groups)
  console.log('Extra data:', (advancedCitations[0] as any).extra)
}
console.log()

// Example 9: Tokenizer Statistics and Management
console.log('=== Example 9: Tokenizer Management ===')

const managementTokenizer = new CustomTokenizer()

// Add various extractors
managementTokenizer.addMultipleReporters([
  { pattern: 'MgmtRep1' },
  { pattern: 'MgmtRep2' },
  { pattern: 'MgmtRep3' }
])

// Add custom extractor without strings
managementTokenizer.addCustomExtractor(
  'CUSTOM\\s+\\d+',
  CitationToken,
  {},
  { strings: [] }
)

// Get statistics
const stats = managementTokenizer.getExtractorStats()
console.log('Tokenizer statistics:')
console.log('  Total extractors:', stats.total)
console.log('  With strings:', stats.withStrings)
console.log('  Without strings:', stats.withoutStrings)
console.log('  By token type:', stats.byTokenType)

// Clone and filter
const cloned = managementTokenizer.clone()
const filtered = managementTokenizer.createFilteredTokenizer(
  extractor => extractor.strings?.includes('MgmtRep1') || false
)

console.log('Original extractors:', managementTokenizer.extractors.length)
console.log('Cloned extractors:', cloned.extractors.length)
console.log('Filtered extractors:', filtered.extractors.length)
console.log()

// Example 10: Integration with Existing System
console.log('=== Example 10: Integration Example ===')

// Start with default extractors but extend them
const integratedTokenizer = new CustomTokenizer()

// Add custom patterns alongside existing ones (if needed)
integratedTokenizer.addSimpleCitationPattern('INTEGRATED', 'neutral', 'Integrated Reporter')

// Demonstrate usage in a real-world scenario
const legalText = `
  The court in 123 INTEGRATED 456 held that the statute was constitutional.
  This decision was later referenced in various other cases.
`

const integratedCitations = getCitations(legalText, false, integratedTokenizer)
console.log('Integrated citations found:', integratedCitations.length)
integratedCitations.forEach(citation => {
  console.log(`  Found: ${citation.groups.volume} ${citation.groups.reporter} ${citation.groups.page}`)
  console.log(`  Text: "${citation.plainText()}"`)
  console.log(`  Span: ${citation.start}-${citation.end}`)
})

console.log('\n=== All Examples Complete ===')

export {
  CustomTokenizer,
  RegexPatternBuilder,
  AhocorasickTokenizer,
  BaseTokenExtractor
}