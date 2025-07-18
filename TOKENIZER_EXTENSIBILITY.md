# Tokenizer Extensibility Guide

The eyecite TypeScript library provides a comprehensive and extensible tokenizer system that allows you to customize citation recognition patterns, add new citation formats, and optimize performance for specific use cases.

## Table of Contents

1. [Overview](#overview)
2. [Core Classes](#core-classes)
3. [Basic Usage](#basic-usage)
4. [Advanced Features](#advanced-features)
5. [Performance Optimization](#performance-optimization)
6. [Examples](#examples)
7. [API Reference](#api-reference)

## Overview

The tokenizer extensibility system is built around several key concepts:

- **TokenExtractor**: Individual pattern matchers that recognize specific citation formats
- **Tokenizer**: Base class that manages a collection of extractors
- **CustomTokenizer**: Enhanced tokenizer with convenience methods for common customizations
- **AhocorasickTokenizer**: Performance-optimized tokenizer using string filtering
- **RegexPatternBuilder**: Utility class for building complex regex patterns

## Core Classes

### Tokenizer (Base Class)

The `Tokenizer` class provides the foundation for all tokenizer implementations with methods for managing extractors:

```typescript
import { Tokenizer, BaseTokenExtractor, CitationToken } from 'eyecite'

const tokenizer = new Tokenizer()

// Add extractors
tokenizer.addExtractor(extractor)
tokenizer.addExtractors([extractor1, extractor2])

// Remove extractors
tokenizer.removeExtractor(extractor)
tokenizer.removeExtractors(ext => ext.strings?.includes('pattern'))

// Modify patterns
tokenizer.modifyExtractorPatterns(
  (regex) => regex.replace('old', 'new'),
  (extractor) => extractor.strings?.includes('target')
)

// Find extractors
const found = tokenizer.findExtractorsByPattern(/pattern/)
const byString = tokenizer.findExtractorsByString('searchTerm')
```

### CustomTokenizer

The `CustomTokenizer` extends the base `Tokenizer` with convenience methods for common citation patterns:

```typescript
import { CustomTokenizer } from 'eyecite'

const tokenizer = new CustomTokenizer()

// Add simple citation patterns
tokenizer.addSimpleCitationPattern('CustomRep', 'neutral', 'Custom Reporter')

// Add year-page format (e.g., "T.C. Memo. 2019-233")
tokenizer.addSimpleCitationPattern(
  'T.C. Memo.',
  'tax',
  'Tax Court Memorandum',
  { yearPageFormat: true }
)

// Add hyphen format (e.g., "1-NMCERT-123")
tokenizer.addSimpleCitationPattern(
  'CUSTOM',
  'neutral',
  'Custom Hyphen Reporter',
  { hyphenFormat: true }
)

// Add multiple reporters at once
tokenizer.addMultipleReporters([
  { pattern: 'Rep1', name: 'Reporter One' },
  { pattern: 'Rep2', name: 'Reporter Two', citeType: 'state' }
])
```

### AhocorasickTokenizer

For performance-critical applications, the `AhocorasickTokenizer` provides optimized string-based filtering:

```typescript
import { AhocorasickTokenizer } from 'eyecite'

const tokenizer = new AhocorasickTokenizer()

// All extractor management methods work the same way
tokenizer.addExtractor(extractor)

// But filtering is optimized based on string hints in the text
const relevantExtractors = tokenizer.getExtractors(text)
```

## Basic Usage

### Adding Custom Citation Patterns

```typescript
import { CustomTokenizer, getCitations } from 'eyecite'

const tokenizer = new CustomTokenizer()

// Add a custom reporter
tokenizer.addSimpleCitationPattern('MyRep', 'neutral', 'My Custom Reporter')

// Use with getCitations
const text = 'See 123 MyRep 456 for details.'
const citations = getCitations(text, false, tokenizer)

console.log(citations[0].groups.volume)   // "123"
console.log(citations[0].groups.reporter) // "MyRep"
console.log(citations[0].groups.page)     // "456"
```

### Creating Custom Extractors

```typescript
import { CustomTokenizer, CitationToken } from 'eyecite'

const tokenizer = new CustomTokenizer()

// Create a custom extractor with specific regex
tokenizer.addCustomExtractor(
  '(?<type>STATUTE)\\s+(?<section>§\\s*\\d+(?:\\.\\d+)*)',
  CitationToken,
  { citationType: 'statute' },    // Extra data
  { strings: ['STATUTE', '§'] }   // String hints for filtering
)

const text = 'See STATUTE § 123.45 for reference.'
const citations = getCitations(text, false, tokenizer)
```

## Advanced Features

### Pattern Modification

You can dynamically modify existing patterns to support alternative formats:

```typescript
const tokenizer = new CustomTokenizer()
tokenizer.addSimpleCitationPattern('U.S.', 'federal', 'United States Reports')

// Modify pattern to accept commas instead of periods
tokenizer.modifyExtractorPatterns(
  (regex) => regex.replace('U\\.S\\.', 'U[.,]S[.,]'),
  (extractor) => extractor.strings?.includes('U.S.') || false
)

// Now matches both "123 U.S. 456" and "123 U,S, 456"
```

### Alternative Punctuation Support

```typescript
const tokenizer = new CustomTokenizer()

// Add a pattern and then modify it to accept alternative punctuation
const extractor = tokenizer.addSimpleCitationPattern('Test.Rep', 'neutral', 'Test Reporter')

// Use the convenience method to replace dots with character class
tokenizer.modifyReporterPunctuation('.', '[.,]')

// Update string hints if needed
if (extractor.strings?.includes('Test.Rep')) {
  extractor.strings.push('Test,Rep')
}
```

### Using RegexPatternBuilder

The `RegexPatternBuilder` provides utilities for creating complex patterns:

```typescript
import { RegexPatternBuilder } from 'eyecite'

// Create flexible reporter patterns
const flexibleReporter = RegexPatternBuilder.flexibleReporter(
  ['U', 'S'], 
  '[.,\\s]'  // Allows "U.S.", "U,S,", "U S", etc.
)

// Handle alternative punctuation
const altPattern = RegexPatternBuilder.withAlternativePunctuation(
  'U.S. Reports',
  { '.': '[.,]', ' ': '\\s+' }
)

// Create optional patterns
const optionalYear = RegexPatternBuilder.optional(
  '\\(' + RegexPatternBuilder.yearPattern() + '\\)'
)

// Build page patterns with ranges and Roman numerals
const pagePattern = RegexPatternBuilder.pagePattern(true, true)
// Results in: (?:\\d+|[ivxlcdm]+)(?:-(?:\\d+|[ivxlcdm]+))?
```

### Tokenizer Cloning and Filtering

```typescript
const tokenizer = new CustomTokenizer()
tokenizer.addMultipleReporters([
  { pattern: 'Keep' },
  { pattern: 'Remove' }
])

// Clone the tokenizer
const cloned = tokenizer.clone()

// Create a filtered version
const filtered = tokenizer.createFilteredTokenizer(
  extractor => extractor.strings?.includes('Keep') || false
)

console.log(tokenizer.extractors.length) // 2
console.log(filtered.extractors.length)  // 1
```

## Performance Optimization

### String-Based Filtering

The `AhocorasickTokenizer` optimizes performance by only running extractors whose string hints appear in the text:

```typescript
import { AhocorasickTokenizer } from 'eyecite'

const tokenizer = new AhocorasickTokenizer()

// Add extractors with string hints
tokenizer.addSimpleCitationPattern('U.S.', 'federal', 'United States Reports')
tokenizer.addSimpleCitationPattern('F.2d', 'federal', 'Federal Reporter')

// Only relevant extractors will be used
const text1 = 'Text with U.S. citation'  // Only U.S. extractor runs
const text2 = 'Text with F.2d citation' // Only F.2d extractor runs
```

### Extractor Statistics

Monitor your tokenizer's composition:

```typescript
const stats = tokenizer.getExtractorStats()

console.log('Total extractors:', stats.total)
console.log('With string hints:', stats.withStrings)
console.log('Without string hints:', stats.withoutStrings)
console.log('By token type:', stats.byTokenType)
```

## Examples

### Year-Page Format Citations

```typescript
const tokenizer = new CustomTokenizer()

tokenizer.addSimpleCitationPattern(
  'T.C. Memo.',
  'tax',
  'Tax Court Memorandum',
  { yearPageFormat: true }
)

// Matches "T.C. Memo. 2019-233"
const citations = getCitations('T.C. Memo. 2019-233', false, tokenizer)
console.log(citations[0].groups.volume) // "2019"
console.log(citations[0].groups.page)   // "233"
```

### Hyphen Format Citations

```typescript
const tokenizer = new CustomTokenizer()

tokenizer.addSimpleCitationPattern(
  'NMCERT',
  'state',
  'New Mexico Certification',
  { hyphenFormat: true }
)

// Matches "1-NMCERT-123"
const citations = getCitations('1-NMCERT-123', false, tokenizer)
console.log(citations[0].groups.volume)   // "1"
console.log(citations[0].groups.reporter) // "NMCERT"
console.log(citations[0].groups.page)     // "123"
```

### Multiple Citation Types

```typescript
const tokenizer = new CustomTokenizer()

tokenizer.addMultipleReporters([
  { pattern: 'CustomFed', citeType: 'federal' },
  { pattern: 'CustomState', citeType: 'state' },
  { pattern: 'CustomNeutral', citeType: 'neutral' },
  { 
    pattern: 'CustomHyphen', 
    citeType: 'neutral',
    options: { hyphenFormat: true }
  }
])

const text = `
  See 1 CustomFed 10, 2 CustomState 20, 3 CustomNeutral 30,
  and 4-CustomHyphen-40 for references.
`

const citations = getCitations(text, false, tokenizer)
console.log(`Found ${citations.length} citations`)
```

## API Reference

### Tokenizer Methods

- `addExtractor(extractor: TokenExtractor): void`
- `addExtractors(extractors: TokenExtractor[]): void`
- `removeExtractor(extractor: TokenExtractor): boolean`
- `removeExtractors(predicate: (extractor: TokenExtractor) => boolean): number`
- `clearExtractors(): void`
- `setExtractors(extractors: TokenExtractor[]): void`
- `getExtractorsCopy(): TokenExtractor[]`
- `modifyExtractorPatterns(modifier: (regex: string, extractor: TokenExtractor) => string, filter?: (extractor: TokenExtractor) => boolean): void`
- `findExtractorsByPattern(pattern: string | RegExp): TokenExtractor[]`
- `findExtractorsByString(searchString: string): TokenExtractor[]`

### CustomTokenizer Methods

- `addSimpleCitationPattern(reporterPattern: string, citeType?: string, reporterName?: string, options?: object): TokenExtractor`
- `addCustomExtractor(regex: string, tokenConstructor: typeof Token, extra?: object, options?: object): TokenExtractor`
- `modifyReporterPunctuation(originalChar: string, replacement: string): void`
- `addMultipleReporters(reporters: Array<{pattern: string, name?: string, citeType?: string, options?: object}>): TokenExtractor[]`
- `clone(): CustomTokenizer`
- `createFilteredTokenizer(predicate: (extractor: TokenExtractor) => boolean): CustomTokenizer`
- `getExtractorStats(): {total: number, withStrings: number, withoutStrings: number, byTokenType: Record<string, number>}`

### RegexPatternBuilder Methods

- `static withAlternativePunctuation(base: string, charMap: Record<string, string>): string`
- `static flexibleReporter(reporterParts: string[], separators?: string): string`
- `static optional(pattern: string, greedy?: boolean): string`
- `static yearPattern(allowPartialYears?: boolean): string`
- `static volumePattern(): string`
- `static pagePattern(allowRanges?: boolean, allowRoman?: boolean): string`

### Pattern Options

When using `addSimpleCitationPattern`, you can specify these options:

- `yearPageFormat: boolean` - Use year-page format instead of volume-reporter-page
- `hyphenFormat: boolean` - Use hyphen-separated format (volume-reporter-page)
- `caseSensitive: boolean` - Whether the pattern should be case-sensitive
- `editionStr: string` - Custom edition string to use

## Best Practices

1. **Use String Hints**: Always provide string hints when creating extractors to enable performance optimization
2. **Test Thoroughly**: Test your custom patterns with various input formats
3. **Clone Before Modifying**: Use `clone()` when you need to create variations of existing tokenizers
4. **Monitor Performance**: Use `getExtractorStats()` to understand your tokenizer's composition
5. **Use AhocorasickTokenizer**: For production applications with many extractors, use the optimized tokenizer
6. **Validate Patterns**: Ensure your regex patterns are properly escaped and tested

For more examples, see the `examples/tokenizer-customization.ts` file in the repository.