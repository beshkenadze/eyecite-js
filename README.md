# eyecite-js

[![npm version](https://badge.fury.io/js/@beshkenadze/eyecite-js.svg)](https://badge.fury.io/js/@beshkenadze/eyecite-js)
[![License](https://img.shields.io/badge/License-BSD%202--Clause-orange.svg)](https://opensource.org/licenses/BSD-2-Clause)

A TypeScript/JavaScript port of the Python [eyecite](https://github.com/freelawproject/eyecite) library for extracting legal citations from text strings.

eyecite-js is a complete port that recognizes the same wide variety of citations as the original Python library, including:

- **Full case citations**: `Bush v. Gore, 531 U.S. 98, 99-100 (2000)`
- **Short form citations**: `531 U.S., at 99`
- **Id. citations**: `Id., at 101`
- **Supra citations**: `Bush, supra, at 100`
- **Law citations**: `29 C.F.R. §§ 778.113, 778.114`
- **Journal citations**: `1 Minn. L. Rev. 1`

## Installation

### Package Managers

**Bun** (recommended):
```bash
bun add @beshkenadze/eyecite-js
```

**npm**:
```bash
npm install @beshkenadze/eyecite-js
```

**pnpm**:
```bash
pnpm add @beshkenadze/eyecite-js
```

**Yarn**:
```bash
yarn add @beshkenadze/eyecite-js
```

### Registries

**npm Registry** (default):
```bash
# Latest stable version
npm install @beshkenadze/eyecite-js

# Alpha version
npm install @beshkenadze/eyecite-js@alpha

# Beta version  
npm install @beshkenadze/eyecite-js@beta
```

**GitHub Packages**:
```bash
# Configure registry (one-time setup)
npm config set @beshkenadze:registry https://npm.pkg.github.com

# Install from GitHub Packages
npm install @beshkenadze/eyecite-js

# Or install directly
npm install @beshkenadze/eyecite-js --registry=https://npm.pkg.github.com
```

## Quick Start

```typescript
import { getCitations } from '@beshkenadze/eyecite-js'

const text = `
  Mass. Gen. Laws ch. 1, § 2 (West 1999) (barring ...).
  Foo v. Bar, 1 U.S. 2, 3-4 (1999) (overruling ...).
  Id. at 3.
  Foo, supra, at 5.
`

const citations = getCitations(text)
console.log(citations)
```

## Features

### Multiple Section Support

eyecite-js properly handles multiple sections indicated by `§§`:

```typescript
const text = 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).'
const citations = getCitations(text)
// Returns 2 separate FullLawCitation objects
```

### Citation Types

- **FullCaseCitation**: Complete case citations with volume, reporter, page
- **ShortCaseCitation**: Abbreviated case citations
- **FullLawCitation**: Statutory and regulatory citations
- **FullJournalCitation**: Law journal citations
- **IdCitation**: "Id." citations referring to previous citations
- **SupraCitation**: "Supra" citations referring to previous citations
- **ReferenceCitation**: Reference citations using case names

### Text Cleaning

Built-in text cleaning utilities:

```typescript
import { cleanText } from '@beshkenadze/eyecite-js'

const dirtyText = '<p>foo   1  U.S.  1   </p>'
const cleanedText = cleanText(dirtyText, ['html', 'inline_whitespace'])
const citations = getCitations(cleanedText)
```

### Citation Annotation

Add markup around citations in text:

```typescript
import { annotateCitations } from '@beshkenadze/eyecite-js'

const text = 'bob lissner v. test 1 U.S. 12, 347-348 (4th Cir. 1982)'
const citations = getCitations(text)
const annotated = annotateCitations(
  text, 
  citations.map(c => [c.span(), '<a href="#">', '</a>'])
)
// Returns: 'bob lissner v. test <a href="#">1 U.S. 12</a>, 347-348 (4th Cir. 1982)'
```

### Citation Resolution

Resolve citations to their common references:

```typescript
import { resolveCitations } from '@beshkenadze/eyecite-js'

const text = 'first citation: 1 U.S. 12. second citation: 2 F.3d 2. third citation: Id.'
const citations = getCitations(text)
const resolved = resolveCitations(citations)
// Groups citations by their common references
```

## API Documentation

### `getCitations(text, options?)`

Extract citations from text.

**Parameters:**
- `text`: The text to parse
- `options`: Optional configuration object
  - `removeAmbiguous`: Remove ambiguous citations (default: false)
  - `tokenizer`: Custom tokenizer instance
  - `markupText`: Original markup text for enhanced extraction
  - `cleanSteps`: Text cleaning steps to apply

**Returns:** Array of citation objects

### Citation Objects

Each citation object contains:
- `span()`: Text span [start, end] in source text
- `fullSpan()`: Full span including context
- `groups`: Parsed citation components
- `metadata`: Additional citation metadata
- `year`: Citation year (if available)

## TypeScript Support

eyecite-js is written in TypeScript and includes complete type definitions:

```typescript
import { getCitations, FullCaseCitation, FullLawCitation } from '@beshkenadze/eyecite-js'

const citations = getCitations(text)
citations.forEach(citation => {
  if (citation instanceof FullCaseCitation) {
    console.log(`Case: ${citation.groups.volume} ${citation.groups.reporter} ${citation.groups.page}`)
  } else if (citation instanceof FullLawCitation) {
    console.log(`Law: ${citation.groups.reporter} ${citation.groups.section}`)
  }
})
```

## Testing

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the BSD 2-Clause License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This is a TypeScript port of the original Python [eyecite](https://github.com/freelawproject/eyecite) library developed by the Free Law Project.

## Related Projects

- [eyecite](https://github.com/freelawproject/eyecite) - The original Python library
- [reporters-db](https://github.com/freelawproject/reporters-db) - Database of court reporters
- [courts-db](https://github.com/freelawproject/courts-db) - Database of court information